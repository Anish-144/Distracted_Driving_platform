# SECURITY_REPORT.md — SafeDrive AI Platform

**Audit date:** 2026-08-26 (updated 2026-10-01)
**Auditor:** Antigravity Security Analysis
**Scope:** Full MVP codebase — backend (FastAPI/Python), frontend (Next.js/TypeScript), Docker, Supabase Database

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 2 | Fixed in code + manual action required |
| HIGH | 5 | Fixed in code |
| MEDIUM | 7 | 6 fixed in code, 1 in TODO |
| LOW | 6 | 4 fixed in code, 2 in TODO |
| DB SECURITY (Supabase) | 27 lints | Fixed — RLS migration applied (2026-10-01) |

---

## CRITICAL Issues

### CRIT-01 — Live API Keys Committed to Repository
- **File:** backend/.env
- **Type:** Secret Exposure (CWE-798)
- **Details:** Real live credentials committed: GEMINI_API_KEY=AIzaSyB4... and ELEVENLABS_API_KEY=sk_19030c...
- **Fix:** Keys replaced with placeholders in .env
- **ACTION REQUIRED:** Rotate BOTH keys immediately at their respective dashboards, then run git filter-repo to purge from git history.

### CRIT-02 — SQLite Database File with User Data in Repository
- **File:** backend/distracted_driving.db (241 KB)
- **Type:** Sensitive Data Exposure (CWE-312)
- **Details:** .gitignore had *.sqlite but NOT *.db. The database file with hashed passwords, emails, sessions was unprotected.
- **Fix:** Added *.db, *.sqlite3, distracted_driving.db to .gitignore
- **ACTION REQUIRED:** Run: git rm --cached backend/distracted_driving.db

---

## HIGH Issues

### HIGH-01 — No Security Headers on Any Response
- **Files:** backend/app/main.py, frontend/next.config.js
- **Type:** Missing Security Controls (OWASP A05)
- **Details:** No X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, or Permissions-Policy on any response. Users were exposed to clickjacking, MIME sniffing, and XSS.
- **Fix:** Added SecurityHeadersMiddleware to FastAPI; added headers() block to next.config.js

### HIGH-02 — API Docs Exposed in Production
- **File:** backend/app/main.py
- **Type:** Information Disclosure
- **Details:** /docs, /redoc, /openapi.json always enabled, exposing full API surface to attackers.
- **Fix:** docs_url/redoc_url/openapi_url set to None when DEBUG=False

### HIGH-03 — CORS Using Wildcard allow_methods and allow_headers
- **File:** backend/app/main.py
- **Type:** Misconfigured CORS (CWE-346)
- **Details:** allow_methods=["*"], allow_headers=["*"] — defeats CORS purpose.
- **Fix:** Replaced with explicit allowlists

### HIGH-04 — JWT Token Expiry 24 Hours (No Refresh)
- **File:** backend/app/config.py
- **Type:** Broken Authentication (OWASP A07)
- **Details:** ACCESS_TOKEN_EXPIRE_MINUTES=1440. Stolen JWT valid for 24h with no revocation.
- **Fix:** Reduced to 60 minutes. Full refresh token mechanism in TODO_SECURITY.md.

### HIGH-05 — User Enumeration via Login Timing Side-Channel
- **File:** backend/app/routes/auth.py
- **Type:** User Enumeration (CWE-203)
- **Details:** When user not found, bcrypt was skipped — response was measurably faster, leaking whether email exists.
- **Fix:** Dummy bcrypt verify always runs, making response time constant.

---

## MEDIUM Issues

### MED-01 — Password Minimum Length Too Short (6 chars)
- **Files:** backend/app/routes/auth.py, backend/app/routes/user.py
- **Fix:** Minimum raised to 8 chars; maximum capped at 128 chars (prevents bcrypt DoS)

### MED-02 — DEBUG=True Default Exposes Stack Traces
- **File:** backend/app/config.py
- **Fix:** DEBUG now defaults to False

### MED-03 — Production Startup Allows Insecure JWT Secrets
- **Files:** backend/app/config.py, backend/app/main.py
- **Fix:** model_validator raises ValueError for known-bad or short secrets in production

### MED-04 — JWT Token Stored in localStorage (XSS-Vulnerable)
- **File:** frontend/src/api/client.ts
- **Status:** Not code-fixed — architectural decision required. See TODO_SECURITY.md.

### MED-05 — Anonymous Feedback Endpoint (No Auth)
- **File:** backend/app/routes/feedback.py
- **Fix:** Changed Optional[User] to required User dependency

### MED-06 — Feedback Fields Missing Length Validation
- **File:** backend/app/routes/feedback.py
- **Fix:** Length checks and truncation added for all freeform metadata fields

### MED-07 — Raw Exception Details Exposed in Admin AI Endpoints
- **Files:** backend/app/routes/admin.py, backend/app/routes/feedback.py
- **Fix:** str(e) replaced with generic messages; real errors logged server-side

---

## LOW Issues

### LOW-01 — SQL Echo Enabled in Production
- **File:** backend/app/database.py
- **Fix:** echo tied to DEBUG flag (which now defaults to False)

### LOW-02 — Test User Seeded in Production
- **File:** backend/app/main.py
- **Fix:** Test user creation gated with if settings.DEBUG

### LOW-03 — Feedback Rating Range Not Validated
- **File:** backend/app/routes/feedback.py
- **Fix:** rating validated to range 1-5

### LOW-04 — Name Field No Maximum Length
- **File:** backend/app/routes/auth.py
- **Fix:** Added max 100 char validation

### LOW-05 — Server Version Banner Disclosed
- **File:** backend/app/main.py
- **Fix:** SecurityHeadersMiddleware removes server header

### LOW-06 — Upload Path Not Absolute
- **File:** backend/app/routes/feedback.py
- **Status:** In TODO_SECURITY.md — deploy fragility, not exploitable

---

## Supabase Database Security (2026-10-01)

### DB-01 — RLS Disabled on All 20 Public Tables (ERROR severity)
- **Lint:** `rls_disabled_in_public` — all 20 public schema tables lacked Row Level Security
- **Risk:** Any unauthenticated or under-privileged PostgREST API call could read or write any row
- **Fix:** `supabase/migrations/20261001_enable_rls_all_tables.sql` enables RLS on all tables and adds ownership-scoped policies
- **Tables fixed:** users, sessions, user_settings, behavioral_states, personality_profiles, calibration_events, behavioral_logs, cognitive_reports, events, feedbacks, feedback_attachments, feedback_notes, generated_scenarios, intervention_logs, user_lessons, scenarios, lessons, alembic_version, ai_feedback_insights_cache, admin_platform_insights_cache

### DB-02 — Sensitive Columns Exposed via API without RLS (ERROR severity)
- **Lint:** `sensitive_columns_exposed` — `session_id` column exposed without RLS on 7 tables
- **Risk:** Session IDs (PII linkage data) could be enumerated via PostgREST API
- **Affected tables:** behavioral_logs, cognitive_reports, events, feedbacks, generated_scenarios, intervention_logs, user_lessons
- **Fix:** Covered by DB-01 migration — session-joined policies for tables without direct user_id (behavioral_logs, events); user_id-scoped policies for others

### DB-03 — Admin Helper Function
- **Added:** `public.is_admin()` SECURITY DEFINER function for safe, non-recursive admin policy checks
- **Pattern:** All admin dashboard tables use `USING (public.is_admin())` instead of inline subqueries

### DB-04 — Anon Role Privilege Revocation
- **Added:** `REVOKE ALL ... FROM anon` on all 18 sensitive tables
- **Retained:** `scenarios` and `lessons` remain readable by anon (public lookup tables)

---

## Files Modified

| File | Changes |
|------|---------|
| backend/.env | Redacted live API keys |
| backend/app/main.py | Security headers, docs disabled in prod, CORS tightened, prod test-user guard, server banner removal |
| backend/app/config.py | DEBUG=False default, JWT validator, 60min token TTL |
| backend/app/database.py | SQL echo comment |
| backend/app/routes/auth.py | Password policy, timing-safe login, name max-length |
| backend/app/routes/user.py | Password policy |
| backend/app/routes/feedback.py | Auth required, field limits, rating validation, error suppression |
| backend/app/routes/admin.py | Error detail suppression |
| frontend/next.config.js | Security headers block |
| .gitignore | Added *.db, uploads/ |
| supabase/migrations/20261001_enable_rls_all_tables.sql | **NEW** — RLS enabled on all 20 tables, 50+ policies, is_admin() helper, role grants |