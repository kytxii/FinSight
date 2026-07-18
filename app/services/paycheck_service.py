from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import date, timedelta
from decimal import Decimal
from typing import Iterator, NamedTuple
import calendar
from app.models import Paycheck, PaycheckSchedule, RecurringPayment, Transaction, BalanceAnchor
from app.models.paycheck_schedule import PaycheckFrequency
from app.models.category import Category
from app.schemas import CreatePaycheckSchedule, UpdatePaycheckSchedule, UpdatePaycheckAmount, SetBalanceAnchor

# "Recurring expenses" for the spendable surplus calc - categories that represent
# money going out. INCOME, TIPS, and REIMBURSEMENT are inflows, not expenses.
EXPENSE_CATEGORIES = {Category.EXPENSE, Category.BILL, Category.SUBSCRIPTION, Category.SAVINGS, Category.DEBT}
INCOME_CATEGORIES = {Category.INCOME, Category.REIMBURSEMENT, Category.TIPS}


def _add_months(d: date, months: int) -> date:
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _next_occurrence(day_of_month: int, from_date: date) -> date:
    last_day = calendar.monthrange(from_date.year, from_date.month)[1]
    candidate = from_date.replace(day=min(day_of_month, last_day))
    if candidate >= from_date:
        return candidate

    next_month = _add_months(from_date.replace(day=1), 1)
    last_day = calendar.monthrange(next_month.year, next_month.month)[1]
    return next_month.replace(day=min(day_of_month, last_day))


def _iter_pay_dates(schedule: PaycheckSchedule) -> Iterator[date]:
    """Yield a schedule's pay dates in ascending order, indefinitely.

    SEMI_MONTHLY is modeled as two pay dates 15 days apart per month, anchored
    to start_date's day-of-month, rather than fixed calendar dates - the issue
    doesn't specify a convention, so this is a reasonable default.
    """
    start = schedule.start_date

    if schedule.frequency == PaycheckFrequency.WEEKLY:
        current = start
        while True:
            yield current
            current += timedelta(days=7)
    elif schedule.frequency == PaycheckFrequency.BIWEEKLY:
        current = start
        while True:
            yield current
            current += timedelta(days=14)
    elif schedule.frequency == PaycheckFrequency.MONTHLY:
        months = 0
        while True:
            yield _add_months(start, months)
            months += 1
    elif schedule.frequency == PaycheckFrequency.SEMI_MONTHLY:
        months = 0
        while True:
            anchor = _add_months(start, months)
            yield anchor
            yield anchor + timedelta(days=15)
            months += 1
    else:
        raise ValueError(f"Unsupported frequency: {schedule.frequency}")


def _next_month_start(today: date) -> date:
    if today.month == 12:
        return date(today.year + 1, 1, 1)
    return date(today.year, today.month + 1, 1)


class SpendableSurplusResult(NamedTuple):
    next_payday: date
    month_end: date
    spendable_surplus: Decimal
    bills_before_next_payday: Decimal
    next_payday_estimate: Decimal | None


def _generate_pay_dates_through(schedule: PaycheckSchedule, through: date) -> list[date]:
    dates = []
    for pay_date in _iter_pay_dates(schedule):
        dates.append(pay_date)
        if pay_date > through:
            break
    return dates


async def create_paycheck_schedule(data: CreatePaycheckSchedule, current_user: UUID, db: AsyncSession):
    schedule = PaycheckSchedule(**data.model_dump(), created_by=current_user, updated_by=current_user)

    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule


async def get_paycheck_schedules(current_user: UUID, db: AsyncSession):
    result = await db.execute(select(PaycheckSchedule).where(
        PaycheckSchedule.created_by == current_user,
        PaycheckSchedule.active.is_(True),
    ))
    return result.scalars().all()


async def _get_owned_schedule(schedule_id: UUID, current_user: UUID, db: AsyncSession) -> PaycheckSchedule:
    result = await db.execute(select(PaycheckSchedule).where(PaycheckSchedule.id == schedule_id))
    schedule = result.scalar_one_or_none()

    if schedule is None:
        raise ValueError("Paycheck schedule not found")
    if schedule.created_by != current_user:
        raise ValueError("Paycheck schedule not found")

    return schedule


async def update_paycheck_schedule(schedule_id: UUID, data: UpdatePaycheckSchedule, current_user: UUID, db: AsyncSession):
    schedule = await _get_owned_schedule(schedule_id, current_user, db)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(schedule, key, value)
    schedule.updated_by = current_user

    # Unfilled paychecks were generated from the old frequency/start_date and
    # no longer match - drop them so the next read backfills fresh ones.
    # Paychecks with an amount already entered are real history and stay.
    await db.execute(delete(Paycheck).where(Paycheck.schedule_id == schedule_id, Paycheck.amount.is_(None)))

    await db.commit()
    await db.refresh(schedule)
    return schedule


async def delete_paycheck_schedule(schedule_id: UUID, current_user: UUID, db: AsyncSession) -> None:
    schedule = await _get_owned_schedule(schedule_id, current_user, db)

    # Soft-deactivate rather than hard delete - stops generating new paychecks,
    # but past paychecks and their linked income transactions stay untouched.
    schedule.active = False
    schedule.updated_by = current_user
    await db.commit()


async def _backfill_paychecks(schedule: PaycheckSchedule, current_user: UUID, db: AsyncSession) -> None:
    today = date.today()
    expected_dates = _generate_pay_dates_through(schedule, today)

    existing = await db.scalars(select(Paycheck.pay_date).where(Paycheck.schedule_id == schedule.id))
    existing_dates = set(existing.all())

    for pay_date in expected_dates:
        if pay_date not in existing_dates:
            db.add(Paycheck(
                schedule_id=schedule.id,
                pay_date=pay_date,
                amount=None,
                created_by=current_user,
                updated_by=current_user,
            ))


async def _average_recent_amounts(schedule_id: UUID, db: AsyncSession, limit: int = 3) -> Decimal | None:
    amounts = (await db.scalars(
        select(Paycheck.amount)
        .where(Paycheck.schedule_id == schedule_id, Paycheck.amount.is_not(None))
        .order_by(Paycheck.pay_date.desc())
        .limit(limit)
    )).all()
    if not amounts:
        return None
    return sum(amounts, start=Decimal("0")) / Decimal(len(amounts))


async def get_paychecks(current_user: UUID, db: AsyncSession):
    # All schedules (active or not) so deactivated schedules' history still lists -
    # only active ones get new rows backfilled.
    schedules = (await db.scalars(select(PaycheckSchedule).where(PaycheckSchedule.created_by == current_user))).all()

    for schedule in schedules:
        if schedule.active:
            await _backfill_paychecks(schedule, current_user, db)
    await db.commit()

    schedule_ids = [schedule.id for schedule in schedules]
    result = await db.scalars(
        select(Paycheck).where(Paycheck.schedule_id.in_(schedule_ids)).order_by(Paycheck.pay_date)
    )
    paychecks = result.all()

    today = date.today()
    pending = [p for p in paychecks if p.pay_date <= today and p.amount is None]

    # Guessed amount for still-unfilled paychecks, based on recent entries for
    # that schedule - purely informational, never used in the spendable-surplus
    # math (which only counts money actually received).
    for p in paychecks:
        p.estimated_amount = None
    for schedule_id in {p.schedule_id for p in paychecks if p.amount is None}:
        estimate = await _average_recent_amounts(schedule_id, db)
        if estimate is None:
            continue
        for p in paychecks:
            if p.schedule_id == schedule_id and p.amount is None:
                p.estimated_amount = estimate

    return paychecks, pending


async def update_paycheck_amount(paycheck_id: UUID, data: UpdatePaycheckAmount, current_user: UUID, db: AsyncSession):
    result = await db.execute(select(Paycheck).where(Paycheck.id == paycheck_id))
    paycheck = result.scalar_one_or_none()

    if paycheck is None:
        raise ValueError("Paycheck not found")
    if paycheck.created_by != current_user:
        raise ValueError("Paycheck not found")

    paycheck.amount = data.amount
    paycheck.updated_by = current_user

    result = await db.execute(select(Transaction).where(Transaction.paycheck_id == paycheck_id))
    linked = result.scalar_one_or_none()
    if linked:
        linked.amount = data.amount
        linked.transaction_date = paycheck.pay_date
        linked.updated_by = current_user
    else:
        db.add(Transaction(
            name="Paycheck",
            amount=data.amount,
            transaction_date=paycheck.pay_date,
            category=Category.INCOME,
            paycheck_id=paycheck.id,
            created_by=current_user,
            updated_by=current_user,
        ))

    await db.commit()
    await db.refresh(paycheck)
    return paycheck


async def get_balance_anchor(current_user: UUID, db: AsyncSession) -> BalanceAnchor | None:
    return await db.scalar(select(BalanceAnchor).where(BalanceAnchor.created_by == current_user))


async def set_balance_anchor(data: SetBalanceAnchor, current_user: UUID, db: AsyncSession) -> BalanceAnchor:
    anchor = await get_balance_anchor(current_user, db)

    if anchor is None:
        anchor = BalanceAnchor(**data.model_dump(), created_by=current_user, updated_by=current_user)
        db.add(anchor)
    else:
        anchor.current_balance = data.current_balance
        anchor.as_of_date = data.as_of_date
        anchor.updated_by = current_user

    await db.commit()
    await db.refresh(anchor)
    return anchor


async def _get_running_balance(current_user: UUID, db: AsyncSession) -> Decimal | None:
    anchor = await get_balance_anchor(current_user, db)
    if anchor is None:
        return None

    transactions = (await db.scalars(select(Transaction).where(
        Transaction.created_by == current_user,
        Transaction.transaction_date >= anchor.as_of_date,
    ))).all()

    net = sum(
        (t.amount if t.category in INCOME_CATEGORIES else -t.amount for t in transactions),
        start=Decimal("0"),
    )
    return anchor.current_balance + net


class RunningBalanceResult(NamedTuple):
    balance: Decimal
    as_of_date: date


async def get_running_balance(current_user: UUID, db: AsyncSession) -> RunningBalanceResult:
    anchor = await get_balance_anchor(current_user, db)
    if anchor is None:
        raise ValueError("No starting balance set")

    balance = await _get_running_balance(current_user, db)
    return RunningBalanceResult(balance=balance, as_of_date=anchor.as_of_date)


def _committed_before(recurring_payments: list[RecurringPayment], today: date, horizon: date) -> Decimal:
    total = Decimal("0")
    for rp in recurring_payments:
        if rp.day_of_month is None:
            # Estimate with no fixed due date - count it in full. Conservative:
            # under-reporting surplus is safer than over-reporting it.
            total += rp.amount
        elif _next_occurrence(rp.day_of_month, today) < horizon:
            total += rp.amount
    return total


async def get_spendable_surplus(current_user: UUID, db: AsyncSession) -> SpendableSurplusResult:
    today = date.today()

    running_balance = await _get_running_balance(current_user, db)
    if running_balance is None:
        raise ValueError("No starting balance set")

    schedules = (await db.scalars(select(PaycheckSchedule).where(
        PaycheckSchedule.created_by == current_user,
        PaycheckSchedule.active.is_(True),
    ))).all()
    if not schedules:
        raise ValueError("No active paycheck schedule found")

    next_payday, next_schedule = min(
        ((next(pay_date for pay_date in _iter_pay_dates(schedule) if pay_date >= today), schedule) for schedule in schedules),
        key=lambda pair: pair[0],
    )
    next_payday_estimate = await _average_recent_amounts(next_schedule.id, db)
    month_end = _next_month_start(today)

    recurring_payments = (await db.scalars(
        select(RecurringPayment).where(
            RecurringPayment.created_by == current_user,
            RecurringPayment.active.is_(True),
            RecurringPayment.category.in_(EXPENSE_CATEGORIES),
        )
    )).all()

    # Primary number: what's actually free to spend/save before bills reset at
    # the start of next month. Secondary: how much of that is already spoken
    # for before the next paycheck lands, shown separately for context.
    bills_before_month_end = _committed_before(recurring_payments, today, month_end)
    bills_before_next_payday = _committed_before(recurring_payments, today, next_payday)

    return SpendableSurplusResult(
        next_payday=next_payday,
        month_end=month_end,
        spendable_surplus=running_balance - bills_before_month_end,
        bills_before_next_payday=bills_before_next_payday,
        next_payday_estimate=next_payday_estimate,
    )
