from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas import UpdateUser, UserResponse
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserResponse)
async def get_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserResponse)
async def update_user(data: UpdateUser, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):  
    result = await user_service.update_user(data, current_user, db)
    return result

@router.delete("/me", status_code=204)
async def delete_user(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)): 
    await user_service.delete_user(current_user, db)