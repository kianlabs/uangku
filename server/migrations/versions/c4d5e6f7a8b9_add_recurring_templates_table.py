"""add recurring_templates table

Revision ID: c4d5e6f7a8b9
Revises: 7d3e9a1b2c4f
Create Date: 2026-09-23 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: str | Sequence[str] | None = '7d3e9a1b2c4f'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'recurring_templates',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('category_id', sa.Uuid(), nullable=False),
        sa.Column('type', sa.String(length=10), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('amount', sa.Numeric(19, 4), nullable=False),
        sa.Column('day', sa.SmallInteger(), nullable=False),
        sa.Column('active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('last_confirmed', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('amount > 0', name='ck_recurring_amount_positive'),
        sa.CheckConstraint('day >= 1 AND day <= 31', name='ck_recurring_day_range'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_recurring_user', 'recurring_templates', ['user_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_recurring_user', table_name='recurring_templates')
    op.drop_table('recurring_templates')
