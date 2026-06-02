"""merge_heads

Revision ID: a401d280e74f
Revises: 9ef1e45e1eca, b2c4e8f9a1d3
Create Date: 2026-05-27 11:26:52.713484

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a401d280e74f'
down_revision: Union[str, None] = ('9ef1e45e1eca', 'b2c4e8f9a1d3')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
