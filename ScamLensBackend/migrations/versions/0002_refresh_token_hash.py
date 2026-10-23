"""Store refresh-token hashes for single-use token rotation."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0002_refresh_token_hash"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    if "refresh_token_hash" not in {
        column["name"] for column in inspect(op.get_bind()).get_columns("accounts")
    }:
        op.add_column("accounts", sa.Column("refresh_token_hash", sa.String(length=64), nullable=True))


def downgrade():
    if "refresh_token_hash" in {
        column["name"] for column in inspect(op.get_bind()).get_columns("accounts")
    }:
        op.drop_column("accounts", "refresh_token_hash")
