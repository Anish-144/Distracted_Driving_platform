# 🛡️ SafeDrive AI

A behavioral training platform designed to combat distracted driving through interactive simulations and real-time behavioral analysis.

## 🎯 Platform Overview

SafeDrive AI simulates real-world distracted driving conditions to provide measurable behavioral feedback. Unlike static learning tools, it:
*   **Adapts** to user performance in real-time.
*   **Identifies** specific behavioral weaknesses.
*   **Tracks** long-term cognitive and reflex improvement.

## 🏗️ Architecture Stack

- **Frontend**: Next.js 14, React Hooks, Tailwind CSS
- **Backend**: FastAPI, SQLAlchemy, Alembic Migrations
- **Database**: PostgreSQL (Dockerized)

## 📖 Documentation

The complete architectural documentation, including design system choices, component mapping, and testing strategies, can be found in the `/docs` directory:
- [Architecture & Database Details](docs/architecture.md)
- [Design System & UI Guidelines](docs/design-system.md)
- [Project Roadmap & Feature Status](docs/roadmap.md)
- [Testing & Quality Assurance](docs/testing.md)
- [Setup & Deployment Instructions](docs/deployment.md)

## 🚀 Quick Start

Ensure Docker Desktop is running, then execute:
```bash
cp backend/.env.example backend/.env
docker compose up --build -d
```
Access the platform at `http://localhost:3000`. Test credentials are `test@example.com` / `password123`.

### 🎮 Gamification & Progression

SafeDrive AI features a built-in gamification engine designed to engage teen and early-stage drivers:
*   **Daily Missions:** Three rotating micro-tasks generated daily (e.g., ignoring distractions or completing speed reaction sprints) to earn XP.
*   **Weekly Boss Challenges:** Mythic high-stakes challenges (such as the "Unbreakable" boss) that reset weekly to unlock special profile badges.
*   **Driver Class & Evolution:** A progression tier (Iron, Silver, Gold, etc.) with evolution triggers when XP thresholds are met.
*   **Streak Freeze:** Save your daily login streak using streak freeze tokens.

### 🧪 Running Tests

To verify that the API endpoints, token authentication, and protected routes are operating properly, execute the test suite from the root directory:

```bash
python tests/api/test_auth.py
```

### 🔐 Admin Setup

The platform does not create admin users by default. To bootstrap an admin account or grant admin privileges to an existing user, run the bootstrap script from the root directory:

```bash
python scripts/create_admin.py
```
You will be prompted to enter the admin's email, name, and a secure password.

*For detailed local development setup, see [docs/deployment.md](docs/deployment.md).*
