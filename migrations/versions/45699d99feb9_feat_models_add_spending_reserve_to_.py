"""feat(models): add spending_reserve to users

Revision ID: 45699d99feb9
Revises: e2dbacdd9e09
Create Date: 2026-07-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '45699d99feb9'
down_revision: Union[str, Sequence[str], None] = 'e2dbacdd9e09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('spending_reserve', sa.Numeric(10, 2), server_default='0', nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'spending_reserve')
