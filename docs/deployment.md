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
