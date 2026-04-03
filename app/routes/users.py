from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas import UpdateUser, UserResponse

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserResponse)
async def get_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserResponse)
async def update_user(data: UpdateUser, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):  
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, key, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.delete("/me", status_code=204)
async def delete_user(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)): 
    await db.delete(current_user)
    await db.commit()