# 🛡️ SafeDrive AI — Distracted Driving Platform MVP

SafeDrive AI is a behavioral training platform designed to combat distracted driving through interactive simulations and AI-driven feedback.

## 🚀 First Phase: Foundation & Core Architecture (Week 1)

In this initial phase, we have established the full-stack architecture, essential security patterns, and the baseline user experience.

### ✅ Milestones Achieved
### 🏗️ Working Prototype Modules
The following modules are fully functional in the current `v0.1.0` prototype:

#### 🔐 Authentication & Identity
- **JWT Flow**: Complete registration, login, and `/me` profile retrieval.
- **Security**: Robust password hashing using `bcrypt`.
- **Dev Bypass**: A dedicated "Bypass (Dev Test)" button on the login page for rapid internal testing.

#### 📊 User Dashboard
- **Live Stats**: Overview of Safety Score, Sessions Completed, and Avg. Response Time.
- **Responsive UI**: Premium dark theme with glassmorphism, animations (Framer Motion), and mobile-friendly layouts.
- **Navigation**: Sidebar with routing to Simulation, Lessons, and Progress.

#### 🎮 Simulation Foundation
- **Scenario Host**: A `ScenarioContainer` component ready to load behavioral events.
- **Event Framework**: Support for different distraction types (e.g., Phone Call, WhatsApp Alert, GPS Notification).
- **Decision UI**: Interactive buttons for user response capture.

#### 🗄️ Core Infrastructure
- **Async Database**: Fully integrated SQLite database using `aiosqlite` for easy local development.
- **API Proxy**: Frontend configured with Next.js `rewrites` to handle seamless backend communication on `localhost`.
- **Seed System**: Standalone script to initialize and populate the test environment.

### 👤 Current User Journey
In the current prototype, a user can:
1.  **Identity Management**: Securely create an account or sign in with existing credentials.
2.  **Quick Access**: Immediately enter the environment using the **Bypass (Dev Test)** button.
3.  **Analyze Progress**: Review their current Safety Score and behavioral metrics on the Dashboard.
4.  **Explore Training**: Navigate to the **Simulation Stage**, where they can view the foundational scenario container for distraction training.
5.  **Interactive Steering**: Engage with a premium, responsive interface designed for both desktop and mobile behavioral tracking.

---

## 🏗️ Architecture Stack

### Backend (Python/FastAPI)
- **API Framework**: FastAPI (Async)
- **Database**: SQLAlchemy 2.0 with `aiosqlite` (Async SQLite)
- **Security**: JWT (HS256) with `passlib` (Bcrypt)
- **Validation**: Pydantic v2

### Frontend (TypeScript/Next.js)
- **Framework**: Next.js 14 (App/Pages Router)
- **Styling**: Tailwind CSS + Framer Motion (for animations)
- **State Management**: Redux Toolkit
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

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
python -m uvicorn app.main:app --reload --port 8000
```
- **API Docs**: Available at `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
cd frontend
# Install dependencies
npm install

# Run the Dev Server
npm run dev
```
- **App URL**: `http://localhost:3000`

---

## 🧪 Testing the MVP
- **Login Bypass**: On the login page, click "Bypass (Dev Test)" to jump straight to the dashboard.
- **Test Credentials**:
  - **Email**: `test@example.com`
  - **Password**: `password123`

---

## 📅 Roadmap (Next Steps)
- **Week 2**: Behavioral Loop Integration (Simulation Engine → Voice Input → Evaluation).
- **Week 3**: AI Integration (Gemini/Groq) for real-time voice feedback.
- **Week 4**: Advanced Analytics & Gamification.
