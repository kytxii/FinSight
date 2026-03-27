# FinSight

> Summary

---

## Features

- [ ] User registration and login (email/password)
- [ ] Social login (Google, GitHub)
- [ ] JWT-based session management
- [ ] Create, read, update, delete expenses
- [ ] Categorize expenses
- [ ] Filter and paginate expense history
- [ ] Protected routes (auth required)
- [ ] Input validation and error handling

---

## Tech Stack

### Frontend

| Tool         | Purpose                    |
| ------------ | -------------------------- |
| Vite + React | UI framework               |
| JavaScript   | UI logic and interactivity |

### Backend

| Tool        | Purpose               |
| ----------- | --------------------- |
| Python 3.12 | Runtime               |
| FastAPI     | API framework         |
| Uvicorn     | ASGI server           |
| uv          | Dependency management |

### Database & ORM

| Tool           | Purpose                 |
| -------------- | ----------------------- |
| Neon           | Serverless PostgreSQL   |
| SQLAlchemy 2.x | ORM (async)             |
| asyncpg        | Async PostgreSQL driver |
| Alembic        | Database migrations     |

### Auth

| Tool           | Purpose                                  |
| -------------- | ---------------------------------------- |
| PyJWT          | JWT issuing and validation               |
| Authlib        | Social OAuth2 (Google, GitHub, etc.)     |
| pwdlib[argon2] | Password hashing (Argon2)                |
| httpx          | Async HTTP client (OAuth token exchange) |

### Validation & Config

| Tool              | Purpose                     |
| ----------------- | --------------------------- |
| Pydantic v2       | Request/response validation |
| pydantic-settings | Environment config          |

### Testing

| Tool           | Purpose                       |
| -------------- | ----------------------------- |
| pytest         | Test runner                   |
| pytest-asyncio | Async test support            |
| httpx          | Async test client for FastAPI |

### Deployment

| Service | Purpose                         |
| ------- | ------------------------------- |
| Vercel  | Frontend hosting                |
| Render  | Backend hosting (Python-native) |
| Neon    | Managed PostgreSQL              |

---

## Project Structure

```
app/
├── main.py           # FastAPI app entrypoint, router registration
├── database.py       # Async SQLAlchemy engine and session factory
├── models/           # SQLAlchemy ORM models
│   ├── user.py
│   ├── transaction.py
│   └── category.py
├── schemas/          # Pydantic request/response schemas
├── routers/          # Route handlers grouped by domain
├── services/         # Business logic (auth, transactions, etc.)
└── dependencies.py   # Shared FastAPI dependencies (e.g. get_current_user)
```

---

## Data Model

| Entity      | Key Fields                                                 |
| ----------- | ---------------------------------------------------------- |
| User        | id, email, hashed_password, provider (local/google/github) |
| Transaction | id, user_id, amount, description, category_id, date        |
| Category    | id, user_id, name (user-defined)                           |

---

## API Overview

| Method | Endpoint                  | Description                   | Auth |
| ------ | ------------------------- | ----------------------------- | ---- |
| POST   | /auth/register            | Register with email/password  | No   |
| POST   | /auth/login               | Login, returns JWT            | No   |
| GET    | /auth/{provider}          | Start social OAuth flow       | No   |
| GET    | /auth/{provider}/callback | OAuth callback, returns JWT   | No   |
| GET    | /users/me                 | Get current user              | Yes  |
| GET    | /transactions             | List transactions (paginated) | Yes  |
| POST   | /transactions             | Create transaction            | Yes  |
| PATCH  | /transactions/{id}        | Update transaction            | Yes  |
| DELETE | /transactions/{id}        | Delete transaction            | Yes  |
| GET    | /categories               | List categories               | Yes  |
| POST   | /categories               | Create category               | Yes  |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values.

```env
# Database
DATABASE_URL=postgresql+asyncpg://...

# Auth
SECRET_KEY=                        # generate: openssl rand -hex 32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OAuth2 (one block per provider)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

REDIRECT_URI=http://localhost:8000/auth/{provider}/callback

# App
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:5173
```

---

## Local Development

```bash
# Install all dependencies including dev tools
uv sync --extra dev

# Copy and fill in environment variables
cp .env.example .env

# Run migrations
uv run alembic upgrade head

# Start dev server
uv run uvicorn app.main:app --reload
```
