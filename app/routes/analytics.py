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
    SummaryGroup,
    ComparisonResponse,
    PeriodTotals,
    TransactionSearchResponse,
    MatchedTransaction,
    SnapshotResponse,
    CommitmentsResponse,
    CommitmentItem,
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
    return ComparisonResponse(
        current=PeriodTotals(**result.current._asdict()),
        prior=PeriodTotals(**result.prior._asdict()),
        spending_change=result.spending_change,
        income_change=result.income_change,
    )


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


@router.get("/snapshot", response_model=SnapshotResponse)
async def get_snapshot(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await analytics_service.get_snapshot(current_user, db)
    return SnapshotResponse(**result._asdict())


@router.get("/commitments", response_model=CommitmentsResponse)
async def get_commitments(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await analytics_service.get_commitments(current_user.id, db)
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
