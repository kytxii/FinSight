from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.models import RecurringPayment
from app.schemas import CreateRecurringPayment, UpdateRecurringPayment

async def get_recurring_payments(current_user: UUID, db: AsyncSession):
    result = await db.execute(select(RecurringPayment).where(RecurringPayment.created_by == current_user))
    return result.scalars().all()

async def get_recurring_payment_by_id(recurring_payment_id: UUID, current_user: UUID, db: AsyncSession):
    result = await db.execute(select(RecurringPayment).where(RecurringPayment.id == recurring_payment_id))
    recurring_payment = result.scalar_one_or_none()

    if recurring_payment is None:
        raise ValueError("Recurring payment not found")
    if recurring_payment.created_by != current_user:
        raise ValueError("Recurring payment not found")
    
    return recurring_payment

async def create_recurring_payment(recurring_payment: CreateRecurringPayment, current_user: UUID, db: AsyncSession):
    data = recurring_payment.model_dump()
    new_recurring_payment = RecurringPayment(**data, created_by=current_user, updated_by=current_user)

    db.add(new_recurring_payment)
    await db.commit()
    await db.refresh(new_recurring_payment)
    return new_recurring_payment

async def update_recurring_payment(recurring_payment_id: UUID, data: UpdateRecurringPayment, current_user: UUID, db: AsyncSession):
    result = await db.execute(select(RecurringPayment).where(RecurringPayment.id == recurring_payment_id))
    recurring_payment = result.scalar_one_or_none()

    if recurring_payment is None:
        raise ValueError("Recurring payment not found")
    if recurring_payment.created_by != current_user:
        raise ValueError("Recurring payment not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(recurring_payment, key, value)
    recurring_payment.updated_by = current_user

    await db.commit()
    await db.refresh(recurring_payment)
    return recurring_payment

async def delete_recurring_payment(recurring_payment_id: UUID, current_user: UUID, db: AsyncSession):
    result = await db.execute(select(RecurringPayment).where(RecurringPayment.id == recurring_payment_id))
    recurring_payment = result.scalar_one_or_none()

    if recurring_payment is None:
        raise ValueError("Recurring payment not found")
    if recurring_payment.created_by != current_user:
        raise ValueError("Recurring payment not found")

    await db.delete(recurring_payment)
    await db.commit()