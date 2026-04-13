# 🛡️ Project Summary: SafeDrive AI — Distracted Driving Platform

This document serves as a comprehensive overview of the **SafeDrive AI** project for AI-assisted context (e.g., ChatGPT). It details the project's purpose, current technical achievements, and the immediate roadmap.

---

## 1. Project Vision
**SafeDrive AI** is a behavioral training platform designed to reduce distracted driving. It uses interactive simulations to put users in high-pressure driving scenarios, captures their decisions in real-time, and provides AI-driven corrective feedback.

**Core Loop**: `Simulation` ➔ `User Decision/Interaction` ➔ `Safety Scoring` ➔ `AI Voice/Text Feedback`.

---

## 2. Technical Architecure
The project is built using a modern, asynchronous full-stack architecture:

*   **Frontend**: Next.js 14 (App/Pages Router), TypeScript, Tailwind CSS, Framer Motion (Animations), Redux Toolkit (State Management).
*   **Backend**: FastAPI (Python), SQLAlchemy 2.0 (Async), Pydantic v2.
*   **Database**: SQLite (via `aiosqlite`) for local development, configured for easy migration to PostgreSQL.
*   **AI Integration**: (Planned) Gemini/Groq for real-time analysis and ElevenLabs for voice feedback.

---

## 3. What We Have Done Till Now (Week 1 Milestones)

### ✅ Infrastructure & Security
*   **Authentication**: Fully implemented JWT-based auth flow (Register, Login, Profile). Includes secure password hashing with `bcrypt`.
*   **Dev Productivity**: Added a "Bypass (Dev Test)" feature to skip login during rapid UI/Simulation testing.
*   **Repository Optimization**: Cleaned Git history of large binaries and established a robust `.gitignore`.

### ✅ Backend Development
*   **Robust Database Schema**: Defined models for `Users`, `Sessions`, `Scenarios`, `Events`, and `BehavioralLogs`.
*   **Async Core**: The entire backend is built for high-performance async processing.
*   **Seed System**: Automated scripts to populate the database with test users and initial distraction scenarios (e.g., "Incoming Phone Call", "GPS Rerouting").

### ✅ Frontend Development
*   **Premium Dashboard**: A "Glassmorphic" dark-themed UI featuring live stats (Safety Score, Avg. Response Time, Session History).
*   **Simulation Container**: A specialized component framework ready to host video/instructional scenarios and capture user responses (Ignore vs. Interact).
*   **State Persistence**: Redux integration to handle global user state across the application.

---

## 4. Current Database Schema
The system tracks 5 main entities:
1.  **Users**: Profile data and behavioral driver types.
2.  **Sessions**: Individual training runs with aggregate safety scores.
3.  **Scenarios**: The "Library" of distractions (e.g., WhatsApp notification, Phone Call).
4.  **Events**: Granular tracking of what happened *during* a session (Type of distraction + User's reaction time + Reaction choice).
5.  **Behavioral Logs**: Post-processed analysis of user decisions (e.g., labeling a reaction as "Impulsive Unsafe").

---

## 5. Next Steps (Roadmap)

### 🚀 Week 2: Behavioral Loop Integration
*   Connecting the **Simulation Engine** to the backend API.
*   Implementing the logic to evaluate user decisions based on distraction timestamps.
*   Enhancing the UI to provide immediate visual results after a scenario ends.

### 🎙️ Week 3: AI-Driven Voice & Correction
*   Integrating **Gemini/Groq** to analyze *why* a user's decision was unsafe.
*   Connecting **ElevenLabs** to provide real-time, personalized audio feedback (e.g., "Keep your eyes on the road!").

### 📈 Week 4: Analytics & Scaling
*   Building a **Supervisor Dashboard** for fleet managers.
*   Adding gamification features like leaderboards and performance medals.

---

## 💡 How to Help With This Project
When working on this project, emphasize **premium aesthetics (Glassmorphism)** on the frontend and **asynchronous performance** on the backend. Always ensure behavioral events are logged with precise timestamps for accurate safety scoring.
