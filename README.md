# 🛡️ SafeDrive AI — Distracted Driving Platform MVP

SafeDrive AI is a behavioral training platform designed to combat distracted driving through interactive simulations and real-time behavioral analysis.

## 🎯 Why SafeDrive AI

SafeDrive AI simulates real-world distracted driving conditions to provide measurable behavioral feedback. Unlike static learning tools, it:

*   **Adapts** to user performance in real-time.
*   **Identifies** specific behavioral weaknesses.
*   **Tracks** long-term cognitive and reflex improvement.

This transforms the platform from a simple simulator into a comprehensive behavioral training system.

## 🚀 Product Engineering Audit & Current State

## ✅ Verified Features (What Works)

Based on the current implementation, the following features are fully functional:

### 🎮 Simulation Engine

* Interactive distraction scenarios (Phone Calls, WhatsApp, GPS Alerts)
* Sequential, timed event-based simulation system driven by a controlled event loop
* Anti-repetition logic to prevent identical scenario spam
* Reaction-time based decision tracking

---

### ⚙️ Dynamic Adaptive Difficulty Engine

* Difficulty adjusts based on **recent performance (rolling history)**
* Smooth scaling using weighted performance (not binary success/failure)
* Features:

  * Controlled timing variance
  * Difficulty floor & ceiling (prevents extremes)
  * Weighted urgency-based scenario selection

---

### 🧠 Behavioral Insight Engine

* Rule-based behavioral analysis (no ML)
* Detects:

  * Cognitive fatigue
  * High-pressure reaction slowdown
  * Scenario-specific weaknesses (e.g., phone distractions)
* Uses real session data (reaction time + scenario type)

---

### 🌍 Global Benchmarking System

* Percentile ranking:

  > “You are faster & safer than X% of users”
* Based on:

  * Reaction speed (70%)
  * Decision accuracy (30%)
* Uses logistic S-curve (synthetic distribution)
* Includes:

  * Percentile smoothing (prevents sharp drops)
  * Delta tracking (improvement / decline / steady)

---

### 🧠 Insight + Benchmark Fusion

* Combines behavioral insights with ranking:

  > “You are faster than 78% of users, but your reactions slow under high-pressure distractions”
* Creates context-aware feedback instead of isolated metrics

---

### 📊 Progress Tracking Timeline

* Tracks last **10 sessions**
* Stores:

  * Percentile + timestamp
* Displays:

  * Session-wise performance
  * Micro-deltas (↑ / ↓ / steady)
  * Overall trend:

    > “Improved by +X% over last N sessions”
* Includes:

  * Safe reverse rendering
  * Schema migration for legacy data
  * Timestamp formatting for real-time feel

---

### 🔁 Cross-Session Persistence (Hardened LocalStorage)

Stored locally with **v1 Schema Validation**:

* Last session percentile
* Percentile delta (improvement/steady/decline)
* Personal best score
* Top 2 insights
* Session timeline history (auto-sanitizing)
* **Integrity Guard**: Defensive parsing and schema validation ensure the app remains stable even under corrupted or partial browser storage states.

---

### 🗺️ System UX & Navigation

* **Route-Matched Sidebar**: Navigation highlights are strictly tied to URL state (`usePathname`), preventing state-route desync.
* **Unified SaaS Theme**: Standardized `bg-gray-50` and `brand-600` design system across Dashboard, Simulation, and Progress pages.
* **Defensive Page Guards**: Synchronized authentication redirects and loading states.

### 🏆 Personal Best Tracking

* Tracks highest percentile achieved
* Highlights:

  * 🏆 New Personal Best
* Prevents noisy updates via threshold control

---

### 📊 Dashboard Intelligence Layer

Dashboard shows:

* Latest percentile ranking
* Improvement / decline badge
* Personal best
* Top behavioral insights
* Fully persistent without rerunning simulation

---

## ⚠️ Known Limitations & Breakpoints

### 1. LocalStorage Dependency

* All analytics are client-side
* Data is:

  * Device-specific
  * Lost on cache clear / incognito
* No cross-device sync

---

### 2. Synthetic Benchmarking

* Percentiles are mathematically generated
* Not based on real user population
* Can produce unrealistic jumps in edge cases

---

### 3. Rule-Based Insight System

* No machine learning
* Limited to predefined conditions
* Can become repetitive with extended usage

---

### 4. Simulation Engine Constraints

* Timing logic tied to React lifecycle
* No real-time engine (e.g., game loop / Web Worker)
* Not resilient to browser throttling in background tabs

---

### 5. Scenario Diversity Sensitivity

* Weighted selection may bias certain scenarios if not tuned
* Requires balancing when new scenarios are added

---

### 6. Timeline Accuracy Trade-offs

* Based on smoothed percentile (not raw performance)
* Trend may not perfectly reflect micro-improvements

---

### 7. UI/Layout Consistency Risks

* Pages rely on shared layout
* Misconfigured wrappers can cause:

  * Dark/light theme mismatch
  * Inconsistent UI blocks

---

## 📈 Required Improvements (What Needs Work Next)

### 🥇 High Impact (Must Fix)

* Replace synthetic percentile with **real backend aggregation**
* Migrate `localStorage` analytics to persistent backend (Postgres / API)
* Improve simulation timing (move away from `setTimeout` to stable engine loop)

---

### 🥈 Medium Impact

* Expand scenario variety (multi-event overlap, realistic distractions)
* Introduce trend-based insights across sessions
* Improve insight diversity (reduce repetition)

---

### 🥉 Future Enhancements

* ML-based behavioral modeling
* Fleet / organization dashboard (B2B)
* Hardware integration (Gamepad / WebHID)
* Audio-based cognitive distraction simulation

---

## 🏗️ Architecture Stack

### Frontend

* Next.js 14
* React Hooks + Refs
* Tailwind CSS
* LocalStorage-based analytics

### Backend (Extensible)

* FastAPI (planned/partial usage)
* SQLAlchemy
* JWT Authentication

---

## 🛠️ Setup & Local Development

### 1. Backend Setup
```bash
cd backend
# Create and activate virtual environment
python -m venv venv
source venv/Scripts/activate # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed the test user (Initializes the SQLite DB)
python scripts/seed_user.py

# Run the API
python -m uvicorn app.main:app --reload --port 9000
```
- **API Docs**: Available at `http://localhost:9000/docs`

### 2. Frontend Setup
```bash
cd frontend
# Install dependencies
npm install

# Run the Dev Server
npm run dev -- -p 4000
```
- **App URL**: `http://localhost:4000`

### 3. Quick Start with Docker
The easiest way to run the entire stack is using Docker Compose:
```bash
docker-compose up --build
```
- **Frontend**: `http://localhost:4000`
- **Backend API**: `http://localhost:9000`
- **API Docs**: `http://localhost:9000/docs`
- **Database (Postgres)**: `localhost:6432`

---

## 🧪 Testing the MVP
- **Login Bypass**: On the login page, click "Bypass (Dev Test)" to jump straight to the dashboard.
- **Test Credentials**:
  - **Email**: `test@example.com`
  - **Password**: `password123`

---

## 📅 Next Architectural Epics

* B2B multi-tenancy (fleet dashboards)
* Predictive risk modeling (ML pipeline)
* Hardware integration (WebHID)

---

## 📌 One-Line Summary

> A real-time adaptive driving simulation platform that analyzes behavior, benchmarks performance, and tracks user improvement over time.
