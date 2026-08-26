# TODO_SECURITY.md — Issues Requiring Manual Review or Infrastructure Action

These items were found during the security audit but cannot be fixed purely in code.
Each requires a deliberate architectural or operational decision before deployment.

---

## P0 — Do Before ANY Deployment

### TODO-01: Rotate Compromised API Keys
**WHY:** Real GEMINI_API_KEY and ELEVENLABS_API_KEY were committed to git history.
**HOW:**
1. Go to https://aistudio.google.com/app/apikey -> Revoke the committed key -> Create new key
2. Go to https://elevenlabs.io/app/settings/api-keys -> Revoke old key -> Create new key
3. Set new keys as environment variables in your deployment platform (Railway, Render, Fly.io, etc.)
   — NEVER put them in .env files committed to git
4. Purge from git history:
   ```
   pip install git-filter-repo
   git filter-repo --path backend/.env --invert-paths
   git push --force --all origin
   ```
   (WARNING: force-push rewrites history — coordinate with all collaborators)

### TODO-02: Remove SQLite Database File from Git Tracking
**WHY:** backend/distracted_driving.db contains real user data and was not gitignored.
**HOW:**
```bash
git rm --cached backend/distracted_driving.db
git commit -m "security: remove SQLite database from tracking"
```
Then verify the file is still in .gitignore (it is after this audit).

---

## P1 — Do Before Public Launch

### TODO-03: Migrate JWT from localStorage to HttpOnly Cookies
**FILE:** frontend/src/api/client.ts
**WHY:** Tokens in localStorage are readable by any JavaScript on the page. A single XSS
vulnerability anywhere allows full account takeover with the token.
**HOW:**
1. Backend: Modify /api/auth/login and /api/auth/register to set a Set-Cookie header
   with HttpOnly, Secure, SameSite=Strict attributes instead of returning the token in the body
2. Backend: Add /api/auth/refresh endpoint for silent token refresh
3. Frontend: Remove localStorage reads/writes; credentials cookie is sent automatically
4. FastAPI dependency: Switch OAuth2PasswordBearer to a custom cookie extractor

### TODO-04: Implement a Refresh Token Mechanism
**WHY:** With the JWT TTL reduced to 60 minutes, users will be logged out frequently.
A refresh token flow is needed for good UX.
**HOW:**
1. Issue a short-lived access token (15-60 min) AND a long-lived refresh token (7 days) at login
2. Refresh token should be: opaque random string, stored in the DB, sent only via HttpOnly cookie
3. Add POST /api/auth/refresh endpoint that validates the refresh token and issues a new access token
4. Add POST /api/auth/logout that deletes the refresh token from DB (true invalidation)

### TODO-05: Add Rate Limiting to Auth and Sensitive Endpoints
**WHY:** No rate limiting exists anywhere in the API, allowing:
- Brute-force attacks on /api/auth/login
- Spam on /api/feedback POST
- Abuse of expensive /api/ai/* endpoints
**HOW (recommended: slowapi + Redis):
```bash
pip install slowapi redis
```
Add to main.py:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```
Apply to routes:
```python
@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, ...):
```
Apply stricter limits to /api/auth/login (5/min), /api/ai/* (30/min), /api/feedback (10/min).

### TODO-06: Fix Upload Directory to Use Absolute Path
**FILE:** backend/app/routes/feedback.py
**WHY:** `Path("uploads/feedback")` is relative to the working directory at runtime.
In Docker or if the server is started from a different directory, files go to unexpected locations.
**HOW:**
```python
import os
UPLOAD_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent.parent.parent / "uploads" / "feedback"
```

### TODO-07: Store local_feedback.json in a Controlled Location
**FILE:** backend/app/routes/feedback.py
**WHY:** `local_feedback.json` is written to the current working directory with no path control.
In a Docker container with a read-only filesystem or multi-instance deployment, this will fail silently.
**HOW:** Either remove this local JSON backup (database is the source of truth), or write to
an explicitly configured path via a settings variable.

---

## P2 — Recommended Security Enhancements

### TODO-08: Add CSRF Protection for State-Changing Requests
**WHY:** Although JWT Bearer auth naturally defends against classic CSRF (cookies aren't used),
if you migrate to cookie-based auth (recommended in TODO-03), you MUST add CSRF tokens.
**HOW:** Use `fastapi-csrf-protect` or implement Double-Submit Cookie pattern.

### TODO-09: Implement Proper Audit Logging
**WHY:** No structured audit trail exists for sensitive operations: admin role changes,
account deletions, password changes, data exports.
**HOW:** Create an audit_logs table and write entries for:
- User login / logout
- Password change
- Account deletion
- Admin role grant/revoke
- Data export requests
- Admin accessing user data

### TODO-10: Dependency Vulnerability Scan — Pin Versions
**WHY:** The Python packages in requirements.txt use exact pins (good), but some are outdated:
- `bcrypt==3.2.0` (current: 4.x — security improvements)
- `python-jose==3.3.0` (has known CVEs in some configurations; consider PyJWT as alternative)
- `passlib==1.7.4` (last release 2020, unmaintained; consider migrating to python-bcrypt directly)
**HOW:**
```bash
pip install pip-audit
pip-audit -r requirements.txt
```
For frontend:
```bash
npm audit
npm audit fix
```

### TODO-11: Implement Output Sanitization for LLM Responses
**WHY:** AI-generated text (from Gemini/GPT) is currently passed directly to the frontend
and rendered in UI components. If the LLM generates content that includes HTML/JS or
markdown that gets rendered as HTML, this could be a stored XSS vector.
**HOW:**
- Server-side: Strip HTML from all LLM response text before storing/returning
- Frontend: Ensure AI text is rendered as text content, not innerHTML (use React's dangerouslySetInnerHTML=false)

### TODO-12: Set Up Web Application Firewall (WAF)
**WHY:** No WAF protection exists. For production, a WAF layer can block:
- Known attack patterns (SQLi, XSS attempts in headers)
- DDoS and volumetric attacks
- Bad bot traffic
**HOW:** Cloudflare (free tier available) or AWS WAF in front of your deployment.

### TODO-13: HTTPS Configuration — Enforce TLS
**WHY:** The app has no TLS termination in docker-compose.yml. All traffic is plaintext HTTP,
meaning JWT tokens can be stolen in transit on any non-local network.
**HOW:**
- Use a reverse proxy (nginx/Caddy) with Let's Encrypt certificates
- Or deploy to a platform that handles TLS (Railway, Render, Fly.io)
- Caddy is the easiest: one line auto-TLS configuration

---

## Summary Checklist

- [ ] TODO-01: Rotate GEMINI and ElevenLabs API keys, purge from git history
- [ ] TODO-02: git rm --cached database file
- [ ] TODO-03: Migrate JWT to HttpOnly cookie
- [ ] TODO-04: Add refresh token mechanism
- [ ] TODO-05: Add rate limiting (slowapi)
- [ ] TODO-06: Fix upload path to absolute
- [ ] TODO-07: Fix local_feedback.json path
- [ ] TODO-08: Add CSRF protection (if cookies adopted)
- [ ] TODO-09: Implement audit logging
- [ ] TODO-10: Run pip-audit and npm audit, upgrade flagged packages
- [ ] TODO-11: Sanitize LLM output before rendering
- [ ] TODO-12: Deploy with WAF (Cloudflare)
- [ ] TODO-13: Configure HTTPS/TLS before any public exposure