from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas import RegisterRequest, LoginRequest
from app.models import User
from app.core.security import hash_password, verify_password, create_access_token

async def register_user(db: AsyncSession, data: RegisterRequest) -> User:
    result = await db.execute(select(User).where(User.email_address == data.email_address))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email_address=data.email_address,
        password_hash=hash_password(data.password)
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def login_user(db: AsyncSession, data: LoginRequest) -> str:
    result = await db.execute(select(User).where(User.email_address == data.email_address))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    verified = verify_password(data.password, user.password_hash)
    if not verified:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(str(user.id))

    return token