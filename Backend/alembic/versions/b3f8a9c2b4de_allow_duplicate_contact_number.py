"""Allow duplicate contact numbers for customers

Revision ID: b3f8a9c2b4de
Revises: 6d5445bc2bfd
Create Date: 2026-05-28 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b3f8a9c2b4de'
down_revision = 'ad46c83f3519'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop any unique index on mobile/contact number and ensure a non-unique index exists
    # Using IF EXISTS so the migration is idempotent across environments
    op.execute("DROP INDEX IF EXISTS ix_customers_mobile_number;")
    op.execute("DROP INDEX IF EXISTS ix_customers_contact_number;")
    op.execute("CREATE INDEX IF NOT EXISTS ix_customers_contact_number ON customers (contact_number);")


def downgrade() -> None:
    # Recreate the unique index on the original mobile_number column if desired.
    # Note: Downgrading to a unique constraint may fail if duplicates exist.
    op.execute("DROP INDEX IF EXISTS ix_customers_contact_number;")
    # Try to recreate the legacy unique index name (on mobile_number). Keep as non-unique to be safe.
    op.execute("CREATE INDEX IF NOT EXISTS ix_customers_mobile_number ON customers (mobile_number);")
