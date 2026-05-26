# DATABASE_RULES.md — SafeDrive AI Persistence Governance

---

## Stack & Config
- **ORM**: SQLAlchemy 2.0 (Async mode)
- **Migrations**: Alembic
- **Engine**: SQLite (development/MVP) / PostgreSQL (production)

## Async SQLAlchemy Rules (CRITICAL)

The backend is fully asynchronous. Mixing sync and async SQLAlchemy patterns will cause thread blocking and connection pool deadlocks.

1. **Only use `select()`**: Never use `session.query()`. Always use `select(Model).where(...)`.
2. **Execute and Scalar**:
   ```python
   # DO:
   result = await db.execute(select(User).where(User.id == id))
   user = result.scalar_one_or_none()
   
   # DON'T:
   user = db.query(User).filter(User.id == id).first()
   ```
3. **No Lazy Loading**: Async SQLAlchemy does not support lazy loading of relationships by default (it requires sync DB access). If you need related data, either use `joinedload()` in your query or fetch it explicitly.
4. **Dependency Injection**: Route handlers MUST use `Depends(get_db)`. Do not instantiate `AsyncSessionLocal` manually in routes.
5. **Background Tasks**: Background tasks MUST instantiate their own `AsyncSessionLocal` using a context manager. They CANNOT use the session from the route.

## Schema & Migrations

1. **Model Registration**: All models must inherit from `Base` and be imported in `app/main.py` before `init_db()` is called.
2. **UUIDs**: All tables use UUIDs (stored as `String(36)`) for primary keys. Never use auto-incrementing integers for primary keys.
3. **Migrations**: When adding a new model or column, you must generate an Alembic migration. 
   - DO NOT rely on `Base.metadata.create_all` in production.
   - Command: `alembic revision --autogenerate -m "Add new table"`

## Relationship Constraints

1. **User Isolation**: Every stateful table (`Session`, `BehavioralState`, `PersonalityProfile`, `UserLesson`, `CognitiveReport`) MUST have a `user_id` foreign key.
2. **Queries**: All GET/UPDATE/DELETE queries MUST filter by `user_id == current_user.id` to prevent cross-tenant data leaks.
3. **BehavioralState**: There is exactly ONE `BehavioralState` record per user. Use `unique=True` on the `user_id` column.

## JSON Storage

Several AI-generated fields (like `behavioral_exercises` in `UserLesson`) store arrays. Since SQLite does not have a native ARRAY type, these are stored as `Text` or `String` containing JSON arrays.
- **Write**: Use `json.dumps(data)` before `db.add()`.
- **Read**: Use `json.loads(field)` when serializing to Pydantic responses. Catch `JSONDecodeError`.
