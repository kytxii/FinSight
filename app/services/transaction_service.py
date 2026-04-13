from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.models import Transaction
from app.schemas import CreateTransaction, UpdateTransaction



async def get_transactions(current_user: UUID, db: AsyncSession):
    result = await db.execute(select(Transaction).where(Transaction.created_by == current_user))
    return result.scalars().all()

async def get_transaction_by_id(transaction_id: UUID, current_user: UUID,db: AsyncSession):
    result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
    transaction = result.scalar_one_or_none()

    if transaction is None:
        raise ValueError("Transaction not found")
    if transaction.created_by != current_user:
        raise ValueError("Transaction not found")

    return transaction

async def create_transaction(transaction: CreateTransaction, current_user: UUID, db: AsyncSession):
    data = transaction.model_dump()
    new_transaction = Transaction(**data, created_by=current_user, updated_by=current_user)

    db.add(new_transaction)
    await db.commit()
    await db.refresh(new_transaction)
    return new_transaction

async def update_transaction(transaction_id: UUID, data: UpdateTransaction, current_user: UUID, db: AsyncSession):
    result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
    transaction = result.scalar_one_or_none()

    if transaction is None:
        raise ValueError("Transaction not found")
    if transaction.created_by != current_user:
        raise ValueError("Transaction not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(transaction, key, value)
    transaction.updated_by = current_user

    await db.commit()
    await db.refresh(transaction)
    return transaction
    

async def delete_transaction(transaction_id: UUID, current_user: UUID, db: AsyncSession):
    result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
    transaction = result.scalar_one_or_none()

    if transaction is None:
        raise ValueError("Transaction not found")
    if transaction.created_by != current_user:
        raise ValueError("Transaction not found")

    await db.delete(transaction)
    await db.commit()