from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models import User
from app.schemas.assistant import ChatRequest, ChatResponse, UsageResponse
from app.services import assistant_service
from app.services.assistant_service import AssistantUnavailable, AssistantRateLimited, DailyLimitReached

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        reply, daily_remaining, minute_remaining = await assistant_service.send_message(
            current_user, db, data.message, data.history
        )
    except DailyLimitReached as e:
        raise HTTPException(status_code=429, detail=str(e))
    except AssistantRateLimited as e:
        raise HTTPException(status_code=429, detail=str(e))
    except AssistantUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    return ChatResponse(
        reply=reply,
        requests_remaining_today=daily_remaining,
        requests_remaining_this_minute=minute_remaining,
    )


@router.get("/usage", response_model=UsageResponse)
async def usage(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    daily_remaining = await assistant_service.get_remaining_daily_quota(current_user.id, db)
    minute_remaining = assistant_service.get_remaining_minute_quota(current_user.id)
    return UsageResponse(
        requests_remaining_today=daily_remaining,
        requests_remaining_this_minute=minute_remaining,
    )
