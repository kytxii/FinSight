"""add composite index on transactions created_by transaction_date

Revision ID: 291a4bedb04c
Revises: c4d9e1f7b2a3
Create Date: 2026-09-08 14:36:58.585775

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '291a4bedb04c'
down_revision: Union[str, Sequence[str], None] = 'c4d9e1f7b2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Analytics queries (spending summary, comparisons, search) all filter on
    # created_by and range on transaction_date together - the existing
    # created_by-only index leaves the date range to a table scan.
    op.create_index(
        "ix_transactions_created_by_transaction_date",
        "transactions",
        ["created_by", "transaction_date"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_transactions_created_by_transaction_date", table_name="transactions")
