from pydantic import BaseModel, ConfigDict, Field, model_validator
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from app.models.category import Category

class RecurringPaymentBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: Decimal
    day_of_month: int | None = Field(default=None, ge=1, le=31)
    category: Category
    is_estimate: bool = False
    active: bool = True

class CreateRecurringPayment(RecurringPaymentBase):
    @model_validator(mode="after")
    def check_day_required_for_non_estimates(self):
        if not self.is_estimate and self.day_of_month is None:
            raise ValueError("day_of_month is required unless is_estimate is True")
        return self

class UpdateRecurringPayment(BaseModel):
    name: str | None =  Field(default=None, min_length=1, max_length=100)
    amount: Decimal | None = None
    day_of_month: int | None = Field(default=None, ge=1, le=31)
    category: Category | None = None
    is_estimate: bool | None = None
    active: bool | None = None

class RecurringPaymentResponse(RecurringPaymentBase):
    id: UUID
    created_at: datetime
    created_by: UUID
    updated_at: datetime
    updated_by: UUID

    model_config = ConfigDict(from_attributes=True)
