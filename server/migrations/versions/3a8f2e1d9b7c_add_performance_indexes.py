"""add performance indexes

Revision ID: 3a8f2e1d9b7c
Revises: 12ebad98a068
Create Date: 2026-09-18 04:34:31.173000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '3a8f2e1d9b7c'
down_revision: str | Sequence[str] | None = '12ebad98a068'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        'ix_transactions_user_date',
        'transactions',
        ['user_id', sa.text('transaction_date DESC')],
    )
    op.create_index(
        'ix_transactions_category',
        'transactions',
        ['category_id'],
    )
    op.create_index(
        'ix_categories_user',
        'categories',
        ['user_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_categories_user', table_name='categories')
    op.drop_index('ix_transactions_category', table_name='transactions')
    op.drop_index('ix_transactions_user_date', table_name='transactions')
