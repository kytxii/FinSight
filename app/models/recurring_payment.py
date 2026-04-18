from sqlalchemy import String, Numeric, Integer, Enum as CategoryEnum, UUID, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone
from decimal import Decimal
from app.models.category import Category
from app.database import Base
import uuid

class RecurringPayment(Base):
    __tablename__ = "recurring_payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    day_of_month: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[Category] = mapped_column(CategoryEnum(Category), nullable=False)

    last_applied_month: Mapped[str | None] = mapped_column(String(7), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    updated_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)