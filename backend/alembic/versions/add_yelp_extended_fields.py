"""add yelp_url hours transactions to restaurants

Revision ID: b1c2d3e4f5a6
Revises: 2a42a1972927
Create Date: 2026-03-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "2a42a1972927"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("restaurants", sa.Column("yelp_url", sa.String(512), nullable=True))
    op.add_column("restaurants", sa.Column("hours", sa.JSON(), nullable=True))
    op.add_column("restaurants", sa.Column("transactions", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("restaurants", "transactions")
    op.drop_column("restaurants", "hours")
    op.drop_column("restaurants", "yelp_url")
