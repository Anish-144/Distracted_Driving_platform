"""add_behavioral_calibration_engine

Revision ID: b2c4e8f9a1d3
Revises: 1de207e2f5ee
Create Date: 2026-05-22

Adds:
  1. New columns to personality_profiles for behavioral calibration Layer 2 & 3
  2. New calibration_events table for per-scenario behavioral telemetry
"""
# pyrefly: ignore [missing-import]
from alembic import op
# pyrefly: ignore [missing-import]
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c4e8f9a1d3'
down_revision = '1de207e2f5ee'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Add new columns to personality_profiles ──────────────────────────────
    with op.batch_alter_table('personality_profiles', schema=None) as batch_op:
        # Calibration status
        batch_op.add_column(sa.Column('calibration_completed', sa.Boolean(), nullable=False, server_default='false'))
        batch_op.add_column(sa.Column('calibration_confidence', sa.Float(), nullable=False, server_default='0.0'))
        batch_op.add_column(sa.Column('prior_weight', sa.Float(), nullable=False, server_default='1.0'))

        # Behaviorally-inferred trait scores
        batch_op.add_column(sa.Column('behavioral_impulsiveness', sa.Float(), nullable=False, server_default='0.5'))
        batch_op.add_column(sa.Column('behavioral_attention', sa.Float(), nullable=False, server_default='0.5'))
        batch_op.add_column(sa.Column('behavioral_notification_fixation', sa.Float(), nullable=False, server_default='0.5'))
        batch_op.add_column(sa.Column('behavioral_urgency_susceptibility', sa.Float(), nullable=False, server_default='0.5'))
        batch_op.add_column(sa.Column('behavioral_authority_compliance', sa.Float(), nullable=False, server_default='0.5'))
        batch_op.add_column(sa.Column('behavioral_cognitive_overload', sa.Float(), nullable=False, server_default='0.5'))

        # Mismatch analysis
        batch_op.add_column(sa.Column('overconfidence_index', sa.Float(), nullable=False, server_default='0.0'))
        batch_op.add_column(sa.Column('mismatch_flags', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('onboarding_telemetry', sa.Text(), nullable=True))

    # ── Create calibration_events table ──────────────────────────────────────
    op.create_table(
        'calibration_events',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('scenario_id', sa.String(16), nullable=False),
        sa.Column('scenario_name', sa.String(64), nullable=False),

        # Primary behavioral signals
        sa.Column('first_response_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('time_to_choice_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('interaction_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('distraction_clicks', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('re_read_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('choice_made', sa.String(32), nullable=False, server_default=''),
        sa.Column('abandoned', sa.Boolean(), nullable=False, server_default='false'),

        # Per-scenario trait evidence
        sa.Column('evidence_impulsiveness', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('evidence_attention_control', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('evidence_notification_fixation', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('evidence_urgency_susceptibility', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('evidence_authority_compliance', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('evidence_cognitive_overload', sa.Float(), nullable=False, server_default='0.5'),

        # Raw telemetry
        sa.Column('raw_telemetry', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_calibration_events_user_id', 'calibration_events', ['user_id'])


def downgrade() -> None:
    # Drop calibration_events table
    op.drop_index('ix_calibration_events_user_id', table_name='calibration_events')
    op.drop_table('calibration_events')

    # Remove new columns from personality_profiles
    with op.batch_alter_table('personality_profiles', schema=None) as batch_op:
        batch_op.drop_column('onboarding_telemetry')
        batch_op.drop_column('mismatch_flags')
        batch_op.drop_column('overconfidence_index')
        batch_op.drop_column('behavioral_cognitive_overload')
        batch_op.drop_column('behavioral_authority_compliance')
        batch_op.drop_column('behavioral_urgency_susceptibility')
        batch_op.drop_column('behavioral_notification_fixation')
        batch_op.drop_column('behavioral_attention')
        batch_op.drop_column('behavioral_impulsiveness')
        batch_op.drop_column('prior_weight')
        batch_op.drop_column('calibration_confidence')
        batch_op.drop_column('calibration_completed')
