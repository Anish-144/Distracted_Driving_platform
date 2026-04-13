# Database Architecture

The MVP for the Distracted Driving Platform uses a relational database managed with [SQLAlchemy](https://www.sqlalchemy.org/) asynchronously (`sqlalchemy.ext.asyncio`). By default, it supports SQLite for local development and PostgreSQL for production environments depending on the `DATABASE_URL` environment variable.

## Schema Overview

The database is built around **5 primary models**:
1. **Users** (`users`)
2. **Sessions** (`sessions`)
3. **Scenarios** (`scenarios`)
4. **Events** (`events`)
5. **Behavioral Logs** (`behavioral_logs`)

---

### 1. Users (`users`)
Stores registered users and categorizes their behavioral driver profile based on how they process distractions.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | String(36) | Primary Key (UUID) |
| `name` | String(100) | Full name of the user |
| `email` | String(255) | Unique email address |
| `hashed_password`| String(255) | Encrypted password |
| `profile_type` | Enum | The driver's profile: `UNKNOWN`, `IMPULSIVE`, `OVERCONFIDENT`, `ANXIOUS`, `DISTRACTIBLE`, `RULE_FOLLOWING` |
| `created_at` | DateTime | Timestamp of creation |
| `updated_at` | DateTime | Timestamp of last update |

**Relationships:**
- Has many `Sessions` (`User.sessions`)

---

### 2. Sessions (`sessions`)
Represents a single simulation/training run undertaken by a user.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | String(36) | Primary Key (UUID) |
| `user_id` | String(36) | Foreign Key linking to `users.id` |
| `score` | Float | The driver's performance score (default 100.0) |
| `start_time` | DateTime | Timestamp when the session began |
| `end_time` | DateTime | Timestamp when the session ended (nullable) |
| `created_at` | DateTime | Timestamp of creation |

**Relationships:**
- Belongs to `User` (`Session.user`)
- Has many `Events` (`Session.events`)
- Has many `BehavioralLogs` (`Session.behavioral_logs`)

---

### 3. Scenarios (`scenarios`)
Pre-seeded distraction triggers or events that act as templates within the simulation (e.g., Incoming Call, GPS Rerouting).

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | String(36) | Primary Key (UUID) |
| `name` | String(100) | Name of the scenario |
| `description` | Text | Description of the scenario |
| `distraction_type` | Enum | Relates to `EventType` |
| `difficulty_level` | String(20) | `easy` \| `medium` \| `hard` |
| `is_active` | Boolean | Whether the scenario is active (default True) |
| `instruction_text` | Text | Text shown/spoken to the user about what the agent says |

> **Note:** Seed scenarios are automatically populated using `backend/init.sql` upon initial Docker build.

---

### 4. Events (`events`)
Records each distraction event fired to the user and tracks the user's specific response and timing during a `Session`.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | String(36) | Primary Key (UUID) |
| `session_id` | String(36) | Foreign Key linking to `sessions.id` |
| `event_type` | Enum | `INCOMING_CALL`, `WHATSAPP_NOTIFICATION`, `GPS_REROUTING`, `EMAIL_ALERT`, `SOCIAL_MEDIA` |
| `user_response`| Enum | The user's action: `IGNORED`, `INTERACTED`, `VOICE_COMMAND`, `NO_RESPONSE` (nullable) |
| `response_time`| Float | Reaction time in seconds (nullable) |
| `notes` | Text | Any additional notes (nullable) |
| `triggered_at` | DateTime | Timestamp the distraction appeared |
| `responded_at` | DateTime | Timestamp the user responded (nullable) |

**Relationships:**
- Belongs to `Session` (`Event.session`)

---

### 5. Behavioral Logs (`behavioral_logs`)
Aggregated analytics or logs capturing the behavioral analysis logic per session (e.g., if a user consistently reacts quickly and unsafely).

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | String(36) | Primary Key (UUID) |
| `session_id` | String(36) | Foreign Key linking to `sessions.id` |
| `decision_type`| Enum | Result of interaction: `IMPULSIVE_UNSAFE`, `ACCEPTABLE`, `DELAYED_HESITANT`, `SAFE_IGNORE`, `RISKY` |
| `pattern_flags`| Text | Comma-separated pattern tags (e.g. `quick_reactor`) (nullable) |
| `is_risky` | Boolean | Flag indicating if this behavior reflects risk (default False) |
| `logged_at` | DateTime | Timestamp the behavioral log was created |

**Relationships:**
- Belongs to `Session` (`BehavioralLog.session`)

## Engine & Connection Setup
- Defined in `backend/app/database.py`.
- Employs `create_async_engine` and generic mapping via SQLAlchemy's `DeclarativeBase`.
- App configuration pulls from `.env` variable `DATABASE_URL`.

## Migrations / Initialization
- Core tables are created programmatically on startup by SQLAlchemy through the `init_db()` lifespan hook in FastAPI.
- A manual `.sql` script is executed (`init.sql`) to seed default data into the `scenarios` table if the table exists but is empty.
