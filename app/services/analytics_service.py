from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import date, timedelta
from decimal import Decimal
from typing import NamedTuple, Sequence
import calendar

from app.models import Installment, RecurringPayment, Transaction, User
from app.models.category import Category
from app.schemas.analytics import (
    GroupBy,
    SpendingSummaryResponse,
    SummaryGroup,
    ComparisonResponse,
    PeriodTotals,
    TransactionSearchResponse,
    MatchedTransaction,
    SnapshotResponse,
    CommitmentsResponse,
    CommitmentItem,
)
from app.services import paycheck_service, tip_deposit_service
from app.services.paycheck_service import (
    MONEY_IN_CATEGORIES,
    NON_SAVINGS_EXPENSE_CATEGORIES,
)

ZERO = Decimal("0.00")


def _month_bounds(today: date) -> tuple[date, date]:
    return today.replace(day=1), today.replace(day=calendar.monthrange(today.year, today.month)[1])


def _escape_like(term: str) -> str:
    """Neutralize LIKE wildcards in user input.

    Without this a name search for "50%" matches every row, and "_" matches
    any single character - the user typed a literal string, not a pattern.
    """
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _base_filters(current_user: UUID, start: date, end: date) -> list:
    return [
        Transaction.created_by == current_user,
        Transaction.transaction_date >= start,
        Transaction.transaction_date <= end,
        Transaction.credit_card_payment_id.is_(None),
    ]


def _totals_columns():
    return (
        func.coalesce(
            func.sum(
                case((Transaction.category.in_(NON_SAVINGS_EXPENSE_CATEGORIES), Transaction.amount), else_=ZERO)
            ),
            ZERO,
        ).label("total_spending"),
        func.coalesce(
            func.sum(case((Transaction.category.in_(MONEY_IN_CATEGORIES), Transaction.amount), else_=ZERO)),
            ZERO,
        ).label("total_income"),
        func.coalesce(
            func.sum(case((Transaction.category == Category.SAVINGS, Transaction.amount), else_=ZERO)),
            ZERO,
        ).label("total_saved"),
        func.count().label("transaction_count"),
    )


class PeriodTotalsResult(NamedTuple):
    start_date: date
    end_date: date
    total_spending: Decimal
    total_income: Decimal
    total_saved: Decimal
    transaction_count: int


class SummaryGroupResult(NamedTuple):
    key: str
    total: Decimal
    transaction_count: int


class SpendingSummaryResult(NamedTuple):
    start_date: date
    end_date: date
    group_by: GroupBy
    category: Category | None
    total_spending: Decimal
    total_income: Decimal
    total_saved: Decimal
    transaction_count: int
    groups: list[SummaryGroupResult]


class ComparisonResult(NamedTuple):
    current: PeriodTotalsResult
    prior: PeriodTotalsResult
    spending_change: Decimal
    income_change: Decimal


class TransactionSearchResult(NamedTuple):
    start_date: date | None
    end_date: date | None
    query: str | None
    category: Category | None
    match_count: int
    match_total: Decimal
    limit: int
    offset: int
    items: Sequence[Transaction]


class SnapshotResult(NamedTuple):
    as_of: date
    running_balance: Decimal | None
    balance_as_of: date | None
    spending_reserve: Decimal
    next_payday: date | None
    next_payday_estimate: Decimal | None
    spendable_surplus: Decimal | None
    free_to_allocate: Decimal | None
    bills_before_next_payday: Decimal | None
    estimated_savings: Decimal | None
    saved_so_far: Decimal | None
    cash_on_hand: Decimal | None
    unavailable: list[str]


class CommitmentItemResult(NamedTuple):
    name: str
    amount: Decimal
    category: Category
    day_of_month: int | None
    kind: str
    remaining_payments: int | None


class CommitmentsResult(NamedTuple):
    monthly_recurring_total: Decimal
    monthly_installment_total: Decimal
    monthly_committed_total: Decimal
    items: list[CommitmentItemResult]


async def _period_totals(current_user: UUID, db: AsyncSession, start: date, end: date) -> PeriodTotalsResult:
    row = (
        await db.execute(select(*_totals_columns()).where(*_base_filters(current_user, start, end)))
    ).one()
    return PeriodTotalsResult(
        start_date=start,
        end_date=end,
        total_spending=row.total_spending,
        total_income=row.total_income,
        total_saved=row.total_saved,
        transaction_count=row.transaction_count,
    )


async def get_spending_summary(
    current_user: UUID,
    db: AsyncSession,
    start: date | None = None,
    end: date | None = None,
    group_by: GroupBy = GroupBy.CATEGORY,
    category: Category | None = None,
    limit: int = 20,
    today: date | None = None,
) -> SpendingSummaryResult:
    """Headline totals for a period, plus a breakdown.

    The headline totals always cover every transaction in the range. The
    `groups` breakdown is narrower:

    - group_by=category   -> every category present in the range
    - group_by=merchant   -> spending only, so "where does my money go" isn't
                             diluted by paychecks landing in the same period
    - group_by=month      -> spending only, same reason

    Passing `category` overrides that and scopes the breakdown to exactly that
    category, which is how an income or savings trend is requested.
    """
    today = today or date.today()
    if start is None or end is None:
        default_start, default_end = _month_bounds(today)
        start = start or default_start
        end = end or default_end
    if start > end:
        raise ValueError("start_date must be on or before end_date")

    totals = await _period_totals(current_user, db, start, end)

    filters = _base_filters(current_user, start, end)
    if category is not None:
        filters.append(Transaction.category == category)
    elif group_by in (GroupBy.MERCHANT, GroupBy.MONTH):
        filters.append(Transaction.category.in_(NON_SAVINGS_EXPENSE_CATEGORIES))

    if group_by is GroupBy.CATEGORY:
        key_column = Transaction.category
    elif group_by is GroupBy.MERCHANT:
        key_column = Transaction.name
    else:
        key_column = func.to_char(Transaction.transaction_date, "YYYY-MM")

    total_column = func.coalesce(func.sum(Transaction.amount), ZERO).label("total")
    count_column = func.count().label("transaction_count")
    stmt = (
        select(key_column.label("key"), total_column, count_column)
        .where(*filters)
        .group_by(key_column)
        .limit(limit)
    )

    stmt = stmt.order_by(key_column.asc()) if group_by is GroupBy.MONTH else stmt.order_by(total_column.desc())

    groups = [
        SummaryGroupResult(
            key=row.key.value if isinstance(row.key, Category) else str(row.key),
            total=row.total,
            transaction_count=row.transaction_count,
        )
        for row in (await db.execute(stmt)).all()
    ]

    return SpendingSummaryResult(
        start_date=start,
        end_date=end,
        group_by=group_by,
        category=category,
        total_spending=totals.total_spending,
        total_income=totals.total_income,
        total_saved=totals.total_saved,
        transaction_count=totals.transaction_count,
        groups=groups,
    )


async def compare_periods(
    current_user: UUID,
    db: AsyncSession,
    start: date | None = None,
    end: date | None = None,
    today: date | None = None,
) -> ComparisonResult:
    """Compare a period against the equal-length period immediately before it.

    Deriving the prior window rather than taking it as input keeps "this month
    vs last" to a single call - the tool loop pays the full prompt again for
    every extra round trip, so a saved call is a real saving.
    """
    today = today or date.today()
    if start is None or end is None:
        default_start, default_end = _month_bounds(today)
        start = start or default_start
        end = end or default_end
    if start > end:
        raise ValueError("start_date must be on or before end_date")

    span = end - start
    prior_end = start - timedelta(days=1)
    prior_start = prior_end - span

    current = await _period_totals(current_user, db, start, end)
    prior = await _period_totals(current_user, db, prior_start, prior_end)

    return ComparisonResult(
        current=current,
        prior=prior,
        spending_change=current.total_spending - prior.total_spending,
        income_change=current.total_income - prior.total_income,
    )


async def search_transactions(
    current_user: UUID,
    db: AsyncSession,
    query: str | None = None,
    category: Category | None = None,
    start: date | None = None,
    end: date | None = None,
    min_amount: Decimal | None = None,
    max_amount: Decimal | None = None,
    limit: int = 50,
    offset: int = 0,
) -> TransactionSearchResult:
    """Name/category/date/amount search over transactions.

    `query` is a literal case-insensitive substring match on the transaction
    name, not a semantic one - searching "gas" finds rows the user named
    "Gas", and finds nothing if they named them "Wawa". Callers must report an
    empty result as "nothing matched that name" rather than as "you spent
    nothing".
    """
    if start is not None and end is not None and start > end:
        raise ValueError("start_date must be on or before end_date")
    if min_amount is not None and max_amount is not None and min_amount > max_amount:
        raise ValueError("min_amount must be less than or equal to max_amount")

    filters = [
        Transaction.created_by == current_user,
        Transaction.credit_card_payment_id.is_(None),
    ]
    if start is not None:
        filters.append(Transaction.transaction_date >= start)
    if end is not None:
        filters.append(Transaction.transaction_date <= end)
    if category is not None:
        filters.append(Transaction.category == category)
    if min_amount is not None:
        filters.append(Transaction.amount >= min_amount)
    if max_amount is not None:
        filters.append(Transaction.amount <= max_amount)
    if query:
        filters.append(Transaction.name.ilike(f"%{_escape_like(query)}%", escape="\\"))

    aggregate = (
        await db.execute(
            select(
                func.count().label("match_count"),
                func.coalesce(func.sum(Transaction.amount), ZERO).label("match_total"),
            ).where(*filters)
        )
    ).one()

    items = (
        (
            await db.execute(
                select(Transaction)
                .where(*filters)
                .order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        .scalars()
        .all()
    )

    return TransactionSearchResult(
        start_date=start,
        end_date=end,
        query=query,
        category=category,
        match_count=aggregate.match_count,
        match_total=aggregate.match_total,
        limit=limit,
        offset=offset,
        items=items,
    )


async def get_snapshot(user: User, db: AsyncSession, today: date | None = None) -> SnapshotResult:
    """Current financial position, assembled from the existing services.

    Each figure is computed independently and degrades to None when its
    prerequisite isn't configured, with the reason recorded in `unavailable`.
    A user with no balance anchor should still get their spendable surplus,
    not a 404 for the whole snapshot.
    """
    today = today or date.today()
    unavailable: list[str] = []

    running_balance: Decimal | None = None
    balance_as_of: date | None = None
    try:
        balance = await paycheck_service.get_running_balance(user.id, db)
        running_balance, balance_as_of = balance.balance, balance.as_of_date
    except ValueError as e:
        unavailable.append(f"running_balance: {e}")

    next_payday = next_payday_estimate = spendable_surplus = None
    free_to_allocate = bills_before_next_payday = None
    try:
        surplus = await paycheck_service.get_spendable_surplus(
            user.id, user.spending_reserve or ZERO, db
        )
        next_payday = surplus.next_payday
        next_payday_estimate = surplus.next_payday_estimate
        spendable_surplus = surplus.spendable_surplus
        free_to_allocate = surplus.free_to_allocate
        bills_before_next_payday = surplus.bills_before_next_payday
    except ValueError as e:
        unavailable.append(f"spendable_surplus: {e}")

    estimated_savings = saved_so_far = None
    try:
        savings = await paycheck_service.get_estimated_savings(user.id, db)
        estimated_savings, saved_so_far = savings.estimated_savings, savings.saved_so_far
    except ValueError as e:
        unavailable.append(f"estimated_savings: {e}")

    cash = await tip_deposit_service.get_cash_on_hand(user.id, db, today.year, today.month)

    return SnapshotResult(
        as_of=today,
        running_balance=running_balance,
        balance_as_of=balance_as_of,
        spending_reserve=user.spending_reserve or ZERO,
        next_payday=next_payday,
        next_payday_estimate=next_payday_estimate,
        spendable_surplus=spendable_surplus,
        free_to_allocate=free_to_allocate,
        bills_before_next_payday=bills_before_next_payday,
        estimated_savings=estimated_savings,
        saved_so_far=saved_so_far,
        cash_on_hand=cash.cash_on_hand,
        unavailable=unavailable,
    )


async def get_commitments(current_user: UUID, db: AsyncSession) -> CommitmentsResult:
    """Forward-looking monthly obligations: active recurring payments and
    active installments.

    This is what the spending totals can't tell you - money already promised
    but not yet spent. Installments with no monthly_payment set contribute
    nothing to the total but are still listed, so they don't vanish silently.
    """
    recurring = (
        (
            await db.execute(
                select(RecurringPayment)
                .where(RecurringPayment.created_by == current_user, RecurringPayment.active.is_(True))
                .order_by(RecurringPayment.amount.desc())
            )
        )
        .scalars()
        .all()
    )
    installments = (
        (
            await db.execute(
                select(Installment)
                .where(Installment.created_by == current_user, Installment.active.is_(True))
                .order_by(Installment.name.asc())
            )
        )
        .scalars()
        .all()
    )

    items = [
        CommitmentItemResult(
            name=r.name,
            amount=r.amount,
            category=r.category,
            day_of_month=r.day_of_month,
            kind="recurring",
            remaining_payments=None,
        )
        for r in recurring
    ]
    items += [
        CommitmentItemResult(
            name=i.name,
            amount=i.monthly_payment or ZERO,
            category=i.category,
            day_of_month=i.day_of_month,
            kind="installment",
            remaining_payments=(
                max(i.period_months - i.payments_made, 0) if i.period_months is not None else None
            ),
        )
        for i in installments
    ]

    recurring_total = sum((r.amount for r in recurring), ZERO)
    installment_total = sum((i.monthly_payment for i in installments if i.monthly_payment), ZERO)

    return CommitmentsResult(
        monthly_recurring_total=recurring_total,
        monthly_installment_total=installment_total,
        monthly_committed_total=recurring_total + installment_total,
        items=items,
    )

def spending_summary_to_response(result: SpendingSummaryResult) -> SpendingSummaryResponse:
    return SpendingSummaryResponse(
        start_date=result.start_date,
        end_date=result.end_date,
        group_by=result.group_by,
        category=result.category.value if result.category else None,
        total_spending=result.total_spending,
        total_income=result.total_income,
        total_saved=result.total_saved,
        transaction_count=result.transaction_count,
        groups=[SummaryGroup(key=g.key, total=g.total, transaction_count=g.transaction_count) for g in result.groups],
    )


def comparison_to_response(result: ComparisonResult) -> ComparisonResponse:
    return ComparisonResponse(
        current=PeriodTotals(**result.current._asdict()),
        prior=PeriodTotals(**result.prior._asdict()),
        spending_change=result.spending_change,
        income_change=result.income_change,
    )


def transaction_search_to_response(result: TransactionSearchResult) -> TransactionSearchResponse:
    return TransactionSearchResponse(
        start_date=result.start_date,
        end_date=result.end_date,
        query=result.query,
        category=result.category.value if result.category else None,
        match_count=result.match_count,
        match_total=result.match_total,
        limit=result.limit,
        offset=result.offset,
        items=[MatchedTransaction.model_validate(t) for t in result.items],
    )


def snapshot_to_response(result: SnapshotResult) -> SnapshotResponse:
    return SnapshotResponse(**result._asdict())


def commitments_to_response(result: CommitmentsResult) -> CommitmentsResponse:
    return CommitmentsResponse(
        monthly_recurring_total=result.monthly_recurring_total,
        monthly_installment_total=result.monthly_installment_total,
        monthly_committed_total=result.monthly_committed_total,
        items=[
            CommitmentItem(
                name=i.name,
                amount=i.amount,
                category=i.category.value,
                day_of_month=i.day_of_month,
                kind=i.kind,
                remaining_payments=i.remaining_payments,
            )
            for i in result.items
        ],
    )
