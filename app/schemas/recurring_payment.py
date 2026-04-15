from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from app.models.category import Category

class RecurringPaymentBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: Decimal
    day_of_month: int = Field(ge=1, le=28)
    category: Category

class CreateRecurringPayment(RecurringPaymentBase):
    pass

class UpdateRecurringPayment(BaseModel):
    name: str | None =  Field(default=None, min_length=1, max_length=100)
    amount: Decimal | None = None
    day_of_month: int | None = Field(default=None, ge=1, le=28)
    category: Category | None = None

class RecurringPaymentResponse(RecurringPaymentBase):
    id: UUID
    created_at: datetime
    created_by: UUID
    updated_at: datetime
    updated_by: UUID

    model_config = ConfigDict(from_attributes=True)