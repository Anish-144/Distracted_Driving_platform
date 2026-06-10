# 🛡️ SafeDrive AI — Final Hardening Checklist

> Run this document when you are ready to do the final production/demo hardening.
> Each section is self-contained with exact file paths and code snippets.

---

## ✅ Pre-Run Health Check

Before starting, confirm Docker is running and the app boots cleanly:

```bash
# From project root
docker compose up --build -d
curl http://localhost:8000/health
curl http://localhost:3000
```

Expected:
- Backend → `{"status":"ok","version":"1.0.0"}`
- Frontend → SafeDrive AI login page loads with no console errors

---

## 🐛 CRITICAL BUG FIX — Sidebar.tsx Missing Import (Do This First)

**File:** `frontend/src/components/layout/Sidebar.tsx`

The file is missing its `import` line at the top — this causes a runtime crash in the app shell.

**Fix:** Replace the top of the file (lines 1–18) with:

```tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Car,
  BookOpen,
  BarChart2,
  Settings,
  ShieldCheck,
  Microscope,
  Users,
  PieChart,
  MessageSquare,
  Zap,
  Target,
  Trophy,
  User
} from 'lucide-react';
```

**Also fix the broken nav links** (lines 97–102) — replace phantom routes with real ones:

```tsx
: [
    { label: 'Dashboard', href: '/dashboard',             icon: Zap,    badge: 'Go' },
    { label: 'Simulation',href: '/simulation',            icon: Car },
    { label: 'Lessons',   href: '/lessons',               icon: BookOpen },
    { label: 'Progress',  href: '/dashboard/progress',    icon: BarChart2 },
    { label: 'Settings',  href: '/settings',              icon: User },
  ];
```

---

## 🔴 Phase 1 — Security & Cost Protection

### 1a. Add Rate Limiting to Backend

**File:** `backend/requirements.txt`

Add this line:
```
slowapi==0.1.9
```

**File:** `backend/app/main.py`

Add after the existing imports (around line 8):
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
```

Add after `app = FastAPI(...)` is created (around line 228):
```python
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

**File:** `backend/app/routes/auth.py`

Add rate limit decorators to login and register:
```python
from app.main import limiter
from fastapi import Request

@router.post("/register", ...)
@limiter.limit("5/minute")
async def register(request: Request, ...):
    ...

@router.post("/login", ...)
@limiter.limit("10/minute")
async def login(request: Request, ...):
    ...
```

**File:** `backend/app/routes/ai.py`

Add rate limit to AI endpoints:
```python
from app.main import limiter
from fastapi import Request

@router.post("/feedback", ...)
@limiter.limit("20/minute")
async def generate_feedback(request: Request, ...):
    ...
```

### 1b. HttpOnly Cookie for JWT (Optional but Recommended)

**File:** `backend/app/routes/auth.py`

In the `login` endpoint, after building the `LoginResponse`, also set the cookie:
```python
from fastapi.responses import JSONResponse
from fastapi import Response

# At the end of the login route, instead of `return LoginResponse(...)`:
response_data = LoginResponse(
    access_token=token,
    user_id=user.id,
    name=user.name,
    email=user.email,
    profile_type=user.profile_type.value,
    is_admin=user.is_admin,
)
response = JSONResponse(content=response_data.model_dump())
response.set_cookie(
    key="access_token",
    value=token,
    httponly=True,
    secure=False,       # Set to True in production with HTTPS
    samesite="lax",
    max_age=86400,      # 24 hours
    path="/",
)
return response
```

Add a logout endpoint:
```python
@router.post("/logout")
async def logout():
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("access_token")
    return response
```

---

## 🟠 Phase 2 — TTS Latency Optimization

### 2a. Increase In-Memory Cache Size

**File:** `backend/app/services/tts_service.py`

Change line 48:
```python
# Before:
_MAX_CACHE_SIZE = 200

# After:
_MAX_CACHE_SIZE = 500
```

### 2b. Verify Audio Streaming Endpoint Works

The `/api/ai/synthesize` endpoint already returns raw `audio/mpeg` bytes (not base64).
This is correct. Confirm the frontend is using it properly for real-time speech:

```bash
# Quick test (replace TOKEN with a real JWT):
curl -X POST http://localhost:8000/api/ai/synthesize \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Stay focused on the road.", "agent_type": "instructor"}' \
  --output test_audio.mp3

# Should produce a valid ~50-100KB MP3 file
ls -lh test_audio.mp3
```

---

## 🟡 Phase 3 — Curriculum Enrichment (New Scenario Seeds)

### 3a. Add New Scenarios to Seed Data

**File:** `backend/app/models/scenario.py`

Append these 5 entries to the `SEED_SCENARIOS` list:

```python
{
    "id": "scenario-004",
    "name": "Low-Visibility Fog Hazard",
    "description": "Dense fog reduces visibility to 20 meters. Your GPS is beeping with a reroute alert while you strain to see the road.",
    "distraction_type": EventType.GPS_REROUTING,
    "difficulty_level": "hard",
    "is_active": True,
    "instruction_text": "Visibility is near zero. Your GPS is rerouting. Do you look at the screen?",
},
{
    "id": "scenario-005",
    "name": "Animal Crossing Hazard",
    "description": "A deer runs across the highway. At the same moment, your phone buzzes with an urgent notification.",
    "distraction_type": EventType.WHATSAPP_NOTIFICATION,
    "difficulty_level": "hard",
    "is_active": True,
    "instruction_text": "There's an animal on the road and your phone just buzzed. What do you do?",
},
{
    "id": "scenario-006",
    "name": "Backseat Passenger Argument",
    "description": "Two passengers in the back are having a loud disagreement and asking you to mediate while you're on a busy highway.",
    "distraction_type": EventType.INCOMING_CALL,
    "difficulty_level": "medium",
    "is_active": True,
    "instruction_text": "Your passengers are fighting and demanding your attention. Do you engage?",
},
{
    "id": "scenario-007",
    "name": "Emergency Vehicle Approaching",
    "description": "You hear a siren behind you. Your phone rings at the same time — it's your boss.",
    "distraction_type": EventType.INCOMING_CALL,
    "difficulty_level": "hard",
    "is_active": True,
    "instruction_text": "Siren behind you + phone ringing. What takes priority?",
},
{
    "id": "scenario-008",
    "name": "Social Media Notification Storm",
    "description": "You posted something viral. 5 rapid-fire notifications buzz in 10 seconds during stop-and-go traffic.",
    "distraction_type": EventType.WHATSAPP_NOTIFICATION,
    "difficulty_level": "medium",
    "is_active": True,
    "instruction_text": "Your phone is going crazy with notifications. Do you check it?",
},
```

### 3b. Update Seeding Logic to Upsert (Not Skip)

**File:** `backend/app/main.py`

Find the scenario seeding block (around line 94–112) and replace with:

```python
# Upsert scenarios — adds new ones without wiping existing data
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
logger.info("🌱 Checking and upserting scenarios...")
for s in SEED_SCENARIOS:
    existing = await session.execute(
        select(Scenario).where(Scenario.id == s["id"])
    )
    if not existing.scalar_one_or_none():
        session.add(Scenario(
            id=s["id"],
            name=s["name"],
            description=s["description"],
            distraction_type=s["distraction_type"],
            difficulty_level=s["difficulty_level"],
            is_active=s["is_active"],
            instruction_text=s["instruction_text"]
        ))
await session.commit()
logger.info("✅ Scenarios upserted (%d total)", len(SEED_SCENARIOS))
```

---

## 🔍 Final Verification Checklist

After making all changes, restart the platform and go through this checklist:

```
[ ] docker compose up --build -d   → No errors in build log
[ ] http://localhost:8000/health   → {"status":"ok"}
[ ] http://localhost:3000/auth/login → Page loads, no console errors
[ ] Login with test@example.com / password123
[ ] Dashboard loads → XP bar, streak, achievements visible
[ ] Sidebar renders with correct nav links (no crash)
[ ] Click "Play" → Simulation starts
[ ] Complete a session → XP awarded (check dashboard)
[ ] http://localhost:8000/api/scenarios → Shows 8 scenarios (3 original + 5 new)
[ ] /dashboard/achievements → All achievement cards render
[ ] Leaderboard tab → User appears with XP ranking
[ ] POST /api/auth/login → Response includes Set-Cookie header (if HttpOnly enabled)
[ ] POST /api/auth/login (6th time in 1 min) → 429 Too Many Requests (if rate limit enabled)
```

---

## 🚀 Post-Hardening Notes

- **Test user:** `test@example.com` / `password123`
- **Admin setup:** Run `python scripts/create_admin.py` to bootstrap an admin account
- **Docker reset (if DB is corrupted):** `docker compose down -v && docker compose up --build -d`
- **Logs:** `docker compose logs -f backend` for real-time backend logs

---

*Document created: June 2026 | SafeDrive AI MVP*
