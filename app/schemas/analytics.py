from pydantic import BaseModel, ConfigDict
from datetime import date
from decimal import Decimal
from enum import Enum
from uuid import UUID


class GroupBy(str, Enum):
    CATEGORY = "category"
    MERCHANT = "merchant"
    MONTH = "month"


class SummaryGroup(BaseModel):
    key: str
    total: Decimal
    transaction_count: int


class SpendingSummaryResponse(BaseModel):
    start_date: date
    end_date: date
    group_by: GroupBy
    category: str | None
    total_spending: Decimal
    total_income: Decimal
    total_saved: Decimal
    transaction_count: int
    groups: list[SummaryGroup]


class PeriodTotals(BaseModel):
    start_date: date
    end_date: date
    total_spending: Decimal
    total_income: Decimal
    total_saved: Decimal
    transaction_count: int


class ComparisonResponse(BaseModel):
    current: PeriodTotals
    prior: PeriodTotals
    spending_change: Decimal
    income_change: Decimal


class MatchedTransaction(BaseModel):
    id: UUID
    name: str
    amount: Decimal
    category: str
    transaction_date: date
    note: str | None
    paid_with_cash: bool

    model_config = ConfigDict(from_attributes=True)


class TransactionSearchResponse(BaseModel):
    start_date: date | None
    end_date: date | None
    query: str | None
    category: str | None
    match_count: int
    match_total: Decimal
    limit: int
    offset: int
    items: list[MatchedTransaction]


class SnapshotResponse(BaseModel):
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


class CommitmentItem(BaseModel):
    name: str
    amount: Decimal
    category: str
    day_of_month: int | None
    kind: str
    remaining_payments: int | None


class CommitmentsResponse(BaseModel):
    monthly_recurring_total: Decimal
    monthly_installment_total: Decimal
    monthly_committed_total: Decimal
    items: list[CommitmentItem]
