-- =============================================================================
-- Migration: Enable Row Level Security (RLS) on all public tables
-- Fixes: Supabase Security Lints (rls_disabled_in_public + sensitive_columns_exposed)
-- Date: 2026-10-01
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public
-- =============================================================================
-- Tables addressed (20 total):
--   ai_feedback_insights_cache, admin_platform_insights_cache, alembic_version,
--   behavioral_states, behavioral_logs, calibration_events, cognitive_reports,
--   events, feedbacks, feedback_attachments, feedback_notes,
--   generated_scenarios, intervention_logs, lessons, personality_profiles,
--   scenarios, sessions, user_lessons, user_settings, users
-- =============================================================================


-- ============================================================
-- STEP 1: Enable RLS on every public table
-- ============================================================

ALTER TABLE public.users                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioral_states             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personality_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioral_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cognitive_reports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_attachments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_notes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_scenarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lessons                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alembic_version               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback_insights_cache    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_platform_insights_cache ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 2: Drop old/conflicting policies (idempotency guard)
-- ============================================================

-- users
DROP POLICY IF EXISTS "users: owner can read own row"   ON public.users;
DROP POLICY IF EXISTS "users: owner can update own row" ON public.users;
DROP POLICY IF EXISTS "users: admin can read all"       ON public.users;

-- sessions
DROP POLICY IF EXISTS "sessions: owner can select"    ON public.sessions;
DROP POLICY IF EXISTS "sessions: owner can insert"    ON public.sessions;
DROP POLICY IF EXISTS "sessions: owner can update"    ON public.sessions;
DROP POLICY IF EXISTS "sessions: owner can delete"    ON public.sessions;
DROP POLICY IF EXISTS "sessions: admin can select all" ON public.sessions;

-- user_settings
DROP POLICY IF EXISTS "user_settings: owner can select"     ON public.user_settings;
DROP POLICY IF EXISTS "user_settings: owner can insert"     ON public.user_settings;
DROP POLICY IF EXISTS "user_settings: owner can update"     ON public.user_settings;
DROP POLICY IF EXISTS "user_settings: admin can select all" ON public.user_settings;

-- behavioral_states
DROP POLICY IF EXISTS "behavioral_states: owner can select"     ON public.behavioral_states;
DROP POLICY IF EXISTS "behavioral_states: owner can insert"     ON public.behavioral_states;
DROP POLICY IF EXISTS "behavioral_states: owner can update"     ON public.behavioral_states;
DROP POLICY IF EXISTS "behavioral_states: admin can select all" ON public.behavioral_states;

-- personality_profiles
DROP POLICY IF EXISTS "personality_profiles: owner can select"     ON public.personality_profiles;
DROP POLICY IF EXISTS "personality_profiles: owner can insert"     ON public.personality_profiles;
DROP POLICY IF EXISTS "personality_profiles: owner can update"     ON public.personality_profiles;
DROP POLICY IF EXISTS "personality_profiles: admin can select all" ON public.personality_profiles;

-- calibration_events
DROP POLICY IF EXISTS "calibration_events: owner can select"     ON public.calibration_events;
DROP POLICY IF EXISTS "calibration_events: owner can insert"     ON public.calibration_events;
DROP POLICY IF EXISTS "calibration_events: admin can select all" ON public.calibration_events;

-- behavioral_logs
DROP POLICY IF EXISTS "behavioral_logs: owner via session"        ON public.behavioral_logs;
DROP POLICY IF EXISTS "behavioral_logs: owner insert via session" ON public.behavioral_logs;
DROP POLICY IF EXISTS "behavioral_logs: admin can select all"     ON public.behavioral_logs;

-- cognitive_reports
DROP POLICY IF EXISTS "cognitive_reports: owner can select"     ON public.cognitive_reports;
DROP POLICY IF EXISTS "cognitive_reports: owner can insert"     ON public.cognitive_reports;
DROP POLICY IF EXISTS "cognitive_reports: admin can select all" ON public.cognitive_reports;

-- events
DROP POLICY IF EXISTS "events: owner via session"        ON public.events;
DROP POLICY IF EXISTS "events: owner insert via session" ON public.events;
DROP POLICY IF EXISTS "events: admin can select all"     ON public.events;

-- feedbacks
DROP POLICY IF EXISTS "feedbacks: owner can select"     ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks: owner can insert"     ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks: owner can update"     ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks: admin can select all" ON public.feedbacks;

-- feedback_attachments
DROP POLICY IF EXISTS "feedback_attachments: owner via feedback"  ON public.feedback_attachments;
DROP POLICY IF EXISTS "feedback_attachments: admin can select all" ON public.feedback_attachments;

-- feedback_notes
DROP POLICY IF EXISTS "feedback_notes: owner can select" ON public.feedback_notes;
DROP POLICY IF EXISTS "feedback_notes: admin can manage" ON public.feedback_notes;

-- generated_scenarios
DROP POLICY IF EXISTS "generated_scenarios: owner can select"     ON public.generated_scenarios;
DROP POLICY IF EXISTS "generated_scenarios: owner can insert"     ON public.generated_scenarios;
DROP POLICY IF EXISTS "generated_scenarios: admin can select all" ON public.generated_scenarios;

-- intervention_logs
DROP POLICY IF EXISTS "intervention_logs: owner can select"     ON public.intervention_logs;
DROP POLICY IF EXISTS "intervention_logs: owner can insert"     ON public.intervention_logs;
DROP POLICY IF EXISTS "intervention_logs: admin can select all" ON public.intervention_logs;

-- user_lessons
DROP POLICY IF EXISTS "user_lessons: owner can select"     ON public.user_lessons;
DROP POLICY IF EXISTS "user_lessons: owner can insert"     ON public.user_lessons;
DROP POLICY IF EXISTS "user_lessons: owner can update"     ON public.user_lessons;
DROP POLICY IF EXISTS "user_lessons: admin can select all" ON public.user_lessons;

-- scenarios / lessons
DROP POLICY IF EXISTS "scenarios: anyone can read"  ON public.scenarios;
DROP POLICY IF EXISTS "scenarios: admin can manage" ON public.scenarios;
DROP POLICY IF EXISTS "lessons: anyone can read"    ON public.lessons;
DROP POLICY IF EXISTS "lessons: admin can manage"   ON public.lessons;

-- alembic + cache
DROP POLICY IF EXISTS "alembic_version: deny all anon"            ON public.alembic_version;
DROP POLICY IF EXISTS "ai_feedback_insights_cache: admin only"    ON public.ai_feedback_insights_cache;
DROP POLICY IF EXISTS "admin_platform_insights_cache: admin only" ON public.admin_platform_insights_cache;


-- ============================================================
-- STEP 3: Helper — is_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users WHERE id = auth.uid()::text LIMIT 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;


-- ============================================================
-- STEP 4: RLS Policies
-- Strategy:
--   - auth.uid()::text matches users.id (UUID stored as text)
--   - is_admin() helper for admin policy checks
--   - Cache & alembic tables blocked from public API
--   - Lookup tables (scenarios, lessons) publicly readable
-- ============================================================

-- TABLE: users
CREATE POLICY "users: owner can read own row"
  ON public.users FOR SELECT USING (id = auth.uid()::text);

CREATE POLICY "users: owner can update own row"
  ON public.users FOR UPDATE
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "users: admin can read all"
  ON public.users FOR SELECT USING (public.is_admin());

-- TABLE: sessions
CREATE POLICY "sessions: owner can select"
  ON public.sessions FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "sessions: owner can insert"
  ON public.sessions FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "sessions: owner can update"
  ON public.sessions FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "sessions: owner can delete"
  ON public.sessions FOR DELETE USING (user_id = auth.uid()::text);

CREATE POLICY "sessions: admin can select all"
  ON public.sessions FOR SELECT USING (public.is_admin());

-- TABLE: user_settings
CREATE POLICY "user_settings: owner can select"
  ON public.user_settings FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "user_settings: owner can insert"
  ON public.user_settings FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_settings: owner can update"
  ON public.user_settings FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_settings: admin can select all"
  ON public.user_settings FOR SELECT USING (public.is_admin());

-- TABLE: behavioral_states
CREATE POLICY "behavioral_states: owner can select"
  ON public.behavioral_states FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "behavioral_states: owner can insert"
  ON public.behavioral_states FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "behavioral_states: owner can update"
  ON public.behavioral_states FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "behavioral_states: admin can select all"
  ON public.behavioral_states FOR SELECT USING (public.is_admin());

-- TABLE: personality_profiles
CREATE POLICY "personality_profiles: owner can select"
  ON public.personality_profiles FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "personality_profiles: owner can insert"
  ON public.personality_profiles FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "personality_profiles: owner can update"
  ON public.personality_profiles FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "personality_profiles: admin can select all"
  ON public.personality_profiles FOR SELECT USING (public.is_admin());

-- TABLE: calibration_events
CREATE POLICY "calibration_events: owner can select"
  ON public.calibration_events FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "calibration_events: owner can insert"
  ON public.calibration_events FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "calibration_events: admin can select all"
  ON public.calibration_events FOR SELECT USING (public.is_admin());

-- TABLE: behavioral_logs (session-joined, sensitive: session_id)
CREATE POLICY "behavioral_logs: owner via session"
  ON public.behavioral_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = behavioral_logs.session_id
        AND s.user_id = auth.uid()::text
    )
  );

CREATE POLICY "behavioral_logs: owner insert via session"
  ON public.behavioral_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = behavioral_logs.session_id
        AND s.user_id = auth.uid()::text
    )
  );

CREATE POLICY "behavioral_logs: admin can select all"
  ON public.behavioral_logs FOR SELECT USING (public.is_admin());

-- TABLE: cognitive_reports (sensitive: session_id)
CREATE POLICY "cognitive_reports: owner can select"
  ON public.cognitive_reports FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "cognitive_reports: owner can insert"
  ON public.cognitive_reports FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "cognitive_reports: admin can select all"
  ON public.cognitive_reports FOR SELECT USING (public.is_admin());

-- TABLE: events (session-joined, sensitive: session_id)
CREATE POLICY "events: owner via session"
  ON public.events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = events.session_id
        AND s.user_id = auth.uid()::text
    )
  );

CREATE POLICY "events: owner insert via session"
  ON public.events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = events.session_id
        AND s.user_id = auth.uid()::text
    )
  );

CREATE POLICY "events: admin can select all"
  ON public.events FOR SELECT USING (public.is_admin());

-- TABLE: feedbacks (sensitive: session_id)
CREATE POLICY "feedbacks: owner can select"
  ON public.feedbacks FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "feedbacks: owner can insert"
  ON public.feedbacks FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "feedbacks: owner can update"
  ON public.feedbacks FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "feedbacks: admin can select all"
  ON public.feedbacks FOR SELECT USING (public.is_admin());

-- TABLE: feedback_attachments
CREATE POLICY "feedback_attachments: owner via feedback"
  ON public.feedback_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.feedbacks f
      WHERE f.id = feedback_attachments.feedback_id
        AND f.user_id = auth.uid()::text
    )
  );

CREATE POLICY "feedback_attachments: admin can select all"
  ON public.feedback_attachments FOR SELECT USING (public.is_admin());

-- TABLE: feedback_notes
CREATE POLICY "feedback_notes: owner can select"
  ON public.feedback_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.feedbacks f
      WHERE f.id = feedback_notes.feedback_id
        AND f.user_id = auth.uid()::text
    )
  );

CREATE POLICY "feedback_notes: admin can manage"
  ON public.feedback_notes FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- TABLE: generated_scenarios (sensitive: session_id)
CREATE POLICY "generated_scenarios: owner can select"
  ON public.generated_scenarios FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "generated_scenarios: owner can insert"
  ON public.generated_scenarios FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "generated_scenarios: admin can select all"
  ON public.generated_scenarios FOR SELECT USING (public.is_admin());

-- TABLE: intervention_logs (sensitive: session_id)
CREATE POLICY "intervention_logs: owner can select"
  ON public.intervention_logs FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "intervention_logs: owner can insert"
  ON public.intervention_logs FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "intervention_logs: admin can select all"
  ON public.intervention_logs FOR SELECT USING (public.is_admin());

-- TABLE: user_lessons (sensitive: session_id)
CREATE POLICY "user_lessons: owner can select"
  ON public.user_lessons FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "user_lessons: owner can insert"
  ON public.user_lessons FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_lessons: owner can update"
  ON public.user_lessons FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "user_lessons: admin can select all"
  ON public.user_lessons FOR SELECT USING (public.is_admin());

-- TABLE: scenarios (public lookup — read for all, write for admins)
CREATE POLICY "scenarios: anyone can read"
  ON public.scenarios FOR SELECT USING (true);

CREATE POLICY "scenarios: admin can manage"
  ON public.scenarios FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- TABLE: lessons (public lookup — read for all, write for admins)
CREATE POLICY "lessons: anyone can read"
  ON public.lessons FOR SELECT USING (true);

CREATE POLICY "lessons: admin can manage"
  ON public.lessons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- TABLE: alembic_version (migration tool only — deny all via API)
CREATE POLICY "alembic_version: deny all anon"
  ON public.alembic_version FOR SELECT USING (false);

-- TABLE: ai_feedback_insights_cache (admin only)
CREATE POLICY "ai_feedback_insights_cache: admin only"
  ON public.ai_feedback_insights_cache FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- TABLE: admin_platform_insights_cache (admin only)
CREATE POLICY "admin_platform_insights_cache: admin only"
  ON public.admin_platform_insights_cache FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ============================================================
-- STEP 5: Role grants — principle of least privilege
-- ============================================================

-- Revoke default anon SELECT on sensitive tables
REVOKE ALL ON public.users                         FROM anon;
REVOKE ALL ON public.sessions                      FROM anon;
REVOKE ALL ON public.user_settings                 FROM anon;
REVOKE ALL ON public.behavioral_states             FROM anon;
REVOKE ALL ON public.personality_profiles          FROM anon;
REVOKE ALL ON public.calibration_events            FROM anon;
REVOKE ALL ON public.behavioral_logs               FROM anon;
REVOKE ALL ON public.cognitive_reports             FROM anon;
REVOKE ALL ON public.events                        FROM anon;
REVOKE ALL ON public.feedbacks                     FROM anon;
REVOKE ALL ON public.feedback_attachments          FROM anon;
REVOKE ALL ON public.feedback_notes                FROM anon;
REVOKE ALL ON public.generated_scenarios           FROM anon;
REVOKE ALL ON public.intervention_logs             FROM anon;
REVOKE ALL ON public.user_lessons                  FROM anon;
REVOKE ALL ON public.alembic_version               FROM anon;
REVOKE ALL ON public.ai_feedback_insights_cache    FROM anon;
REVOKE ALL ON public.admin_platform_insights_cache FROM anon;

-- anon may read public lookup tables
GRANT SELECT ON public.scenarios TO anon;
GRANT SELECT ON public.lessons   TO anon;

-- authenticated role: scoped grants (RLS enforces ownership above)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users                         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions                      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings                 TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON public.behavioral_states             TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON public.personality_profiles          TO authenticated;
GRANT SELECT, INSERT                  ON public.calibration_events            TO authenticated;
GRANT SELECT, INSERT                  ON public.behavioral_logs               TO authenticated;
GRANT SELECT, INSERT                  ON public.cognitive_reports             TO authenticated;
GRANT SELECT, INSERT                  ON public.events                        TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON public.feedbacks                     TO authenticated;
GRANT SELECT                          ON public.feedback_attachments          TO authenticated;
GRANT SELECT                          ON public.feedback_notes                TO authenticated;
GRANT SELECT, INSERT                  ON public.generated_scenarios           TO authenticated;
GRANT SELECT, INSERT                  ON public.intervention_logs             TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON public.user_lessons                  TO authenticated;
GRANT SELECT                          ON public.scenarios                     TO authenticated;
GRANT SELECT                          ON public.lessons                       TO authenticated;

-- ============================================================
-- END OF MIGRATION
-- All 20 tables now have RLS enabled.
-- Lint categories resolved:
--   rls_disabled_in_public  (20 tables)
--   sensitive_columns_exposed (7 tables with session_id)
-- ============================================================