from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User
from app.schemas import UpdateUser

async def update_user(data: UpdateUser, current_user: User, db: AsyncSession):
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, key, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user

async def delete_user(current_user: User, db: AsyncSession):
    await db.delete(current_user)
    await db.commit()