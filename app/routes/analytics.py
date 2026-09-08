from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from decimal import Decimal
from app.dependencies import get_db, get_current_user
from app.models import User
from app.models.category import Category
from app.schemas.analytics import (
    GroupBy,
    SpendingSummaryResponse,
    ComparisonResponse,
    TransactionSearchResponse,
    SnapshotResponse,
    CommitmentsResponse,
)
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/spending-summary", response_model=SpendingSummaryResponse)
async def get_spending_summary(
    start_date: date | None = None,
    end_date: date | None = None,
    group_by: GroupBy = GroupBy.CATEGORY,
    category: Category | None = None,
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await analytics_service.get_spending_summary(
            current_user.id, db, start_date, end_date, group_by, category, limit
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return analytics_service.spending_summary_to_response(result)


@router.get("/compare", response_model=ComparisonResponse)
async def compare_periods(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await analytics_service.compare_periods(current_user.id, db, start_date, end_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return analytics_service.comparison_to_response(result)


@router.get("/search", response_model=TransactionSearchResponse)
async def search_transactions(
    query: str | None = None,
    category: Category | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    min_amount: Decimal | None = None,
    max_amount: Decimal | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await analytics_service.search_transactions(
            current_user.id, db, query, category, start_date, end_date, min_amount, max_amount, limit, offset
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return analytics_service.transaction_search_to_response(result)


@router.get("/snapshot", response_model=SnapshotResponse)
async def get_snapshot(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await analytics_service.get_snapshot(current_user, db)
    return analytics_service.snapshot_to_response(result)


@router.get("/commitments", response_model=CommitmentsResponse)
async def get_commitments(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await analytics_service.get_commitments(current_user.id, db)
    return analytics_service.commitments_to_response(result)
