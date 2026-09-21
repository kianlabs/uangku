"""add FK ondelete RESTRICT and transaction amount check constraint

Revision ID: f9a798b54228
Revises: 3a8f2e1d9b7c
Create Date: 2026-09-19 10:24:47.230834

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f9a798b54228'
down_revision: str | Sequence[str] | None = '3a8f2e1d9b7c'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    # Hanya FK ondelete + CHECK constraint. Index tidak disentuh
    # (sudah dideklarasikan di models dan dibuat migrasi sebelumnya).
    op.drop_constraint(op.f('categories_user_id_fkey'), 'categories', type_='foreignkey')
    op.create_foreign_key(op.f('categories_user_id_fkey'), 'categories', 'users', ['user_id'], ['id'], ondelete='RESTRICT')
    op.drop_constraint(op.f('transactions_user_id_fkey'), 'transactions', type_='foreignkey')
    op.drop_constraint(op.f('transactions_category_id_fkey'), 'transactions', type_='foreignkey')
    op.create_foreign_key(op.f('transactions_user_id_fkey'), 'transactions', 'users', ['user_id'], ['id'], ondelete='RESTRICT')
    op.create_foreign_key(op.f('transactions_category_id_fkey'), 'transactions', 'categories', ['category_id'], ['id'], ondelete='RESTRICT')
    op.create_check_constraint('ck_transaction_amount_positive', 'transactions', 'amount > 0')




def downgrade() -> None:
    op.drop_check_constraint('ck_transaction_amount_positive', 'transactions')
    op.drop_constraint(op.f('transactions_category_id_fkey'), 'transactions', type_='foreignkey')
    op.drop_constraint(op.f('transactions_user_id_fkey'), 'transactions', type_='foreignkey')
    op.create_foreign_key(op.f('transactions_category_id_fkey'), 'transactions', 'categories', ['category_id'], ['id'])
    op.create_foreign_key(op.f('transactions_user_id_fkey'), 'transactions', 'users', ['user_id'], ['id'])
    op.drop_constraint(op.f('categories_user_id_fkey'), 'categories', type_='foreignkey')
    op.create_foreign_key(op.f('categories_user_id_fkey'), 'categories', 'users', ['user_id'], ['id'])
