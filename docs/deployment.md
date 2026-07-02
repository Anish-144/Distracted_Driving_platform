# 🚀 Deployment & Setup

## 1. Quick Start with Docker (Recommended)
The easiest way to run the entire stack is using Docker Compose:

```bash
cp backend/.env.example backend/.env
docker compose up --build -d
```
- **Frontend**: `http://localhost:4000`
- **Backend API**: `http://localhost:9000`
- **API Docs**: `http://localhost:9000/docs`
- **Database (Postgres)**: `localhost:6432`

> [!NOTE]
> On startup, all PostgreSQL database tables, native enums, and seeds (test scenarios, lessons, and the `test@example.com` driver user) are **automatically initialized**. No manual seeding commands are required!

> [!IMPORTANT]
> **Database Storage Persistence**:
> * To stop the application safely while keeping all registered users, sessions, and histories intact, run:
>   ```bash
>   docker compose down
>   ```
> * **Avoid** using the `-v` flag (i.e. `docker compose down -v`) unless you explicitly want to destroy the persistent storage volume and delete all user accounts.

## 2. Local Backend Development (Without Docker)
```bash
cd backend
# Create and activate virtual environment
python -m venv venv
source venv/Scripts/activate # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations to setup PostgreSQL Schema
alembic upgrade head

# Run the API
python -m uvicorn app.main:app --reload --port 9000
```

## 3. Local Frontend Development (Without Docker)
```bash
cd frontend
# Install dependencies
npm install

# Run the Dev Server
npm run dev -- -p 4000
```

## 4. Production Deployment Guide (PaaS)

This guide covers securely deploying the SafeDrive AI platform to modern Platform-as-a-Service (PaaS) providers, specifically **Render** (Backend & DB) and **Vercel** (Frontend).

### Phase A: Prepare the Backend Database (Render)
1. Go to **Render.com** and click **New PostgreSQL**.
2. Name the database (e.g., `safedrive-db`).
3. Once created, copy the **Internal Database URL** (if deploying backend on Render) or **External Database URL** (if connecting from outside).

### Phase B: Deploy the Backend API (Render)
1. Go to **Render.com** and click **New Web Service**.
2. Connect your GitHub repository and select the SafeDrive AI project.
3. Set the **Root Directory** to `backend`.
4. **Environment Variables Setup (CRITICAL)**:
   - Add `DATABASE_URL` and paste the Postgres URL from Phase A.
   - Add `SYNC_DATABASE_URL` and paste the same URL (replace `postgresql+asyncpg://` with `postgresql://`).
   - Add `JWT_SECRET_KEY` and **input a long, secure random string**. Do NOT use the default development string.
   - Add `ALLOWED_ORIGINS`. Set this to your future Vercel frontend URL (e.g., `https://safedrive-ai.vercel.app`).
   - Add any required LLM API keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`, etc).
5. Click **Deploy**. Once it finishes building, copy the live backend URL (e.g., `https://safedrive-api.onrender.com`).

### Phase C: Deploy the Frontend (Vercel)
1. Go to **Vercel.com** and click **Add New Project**.
2. Import your GitHub repository.
3. Set the **Root Directory** to `frontend`. Vercel will automatically detect Next.js.
4. **Environment Variables Setup**:
   - Add `NEXT_PUBLIC_API_URL` and paste your live Render backend URL from Phase B (do not include trailing slashes).
5. Click **Deploy**. Vercel will build the frontend and provide you with a live domain.

### Phase D: Final Verification
1. Ensure that the Vercel domain exactly matches the `ALLOWED_ORIGINS` variable in your Render backend settings.
2. Visit your live Vercel URL, attempt to log in or create an account, and verify that API requests succeed without CORS errors.
