# ScamLens Backend — FastAPI starter

Shared API starter for the ScamLens Android app and browser extension.

## Features
- FastAPI `/api/v1` API and Swagger docs
- Local heuristic scan analyzer with explainable findings
- PostgreSQL + SQLAlchemy models and Alembic migration
- Guest analysis without cloud history persistence
- Google ID token verification and ScamLens access tokens
- 30-day, single-use rotating refresh credentials (returned as `secret_key`)
- Authenticated account-owned scan history, pagination, delete, account deletion
- Docker Compose for PostgreSQL and API

## Important limitations
This is a starter, not production-ready security software. The analyzer is a simple heuristic prototype, not an AI model or threat-intelligence service. Low/inconclusive does not mean safe. Logout revocation, rate limiting, provider integrations, deployment hardening, full guest history import, and client integration are not implemented yet.

## Quick start (Python 3.11+)
1. Copy `.env.example` to `.env` and set a long random `JWT_SECRET` and `GOOGLE_CLIENT_ID` if using Google sign-in.
2. Start PostgreSQL: `docker compose up -d db`
3. Create venv: Windows `py -3.11 -m venv .venv`; macOS/Linux `python3 -m venv .venv`
4. Activate venv and run `pip install -r requirements.txt`
5. Run migrations: `alembic upgrade head`
6. Start API: `uvicorn app.main:app --reload`
7. Open `http://127.0.0.1:8000/docs`

Or run everything with `docker compose up --build` after copying `.env.example` to `.env`.

## Endpoints
- `GET /health`
- `POST /api/v1/scans/analyze` — analysis; guest-safe by default. `save_to_history=true` requires authentication.
- `GET /api/v1/scans?page=1&page_size=20` — own cloud history
- `GET /api/v1/scans/{scan_id}` — own saved report
- `DELETE /api/v1/scans/{scan_id}` — delete own report
- `POST /api/v1/auth/google` — verify Google ID token and create/sign in account
- `POST /api/v1/auth/refresh` — exchange a `secret_key` for a new access token and one-time `secret_key`; refresh credentials expire after 30 days
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout` — client discards token; server-side revocation not yet implemented
- `DELETE /api/v1/account`

## Google sign-in
Configure a Google OAuth client and set `GOOGLE_CLIENT_ID` to the ID token audience expected by this backend. If Android and browser extension use different client IDs, replace the single audience setting with a secure allowlist. The backend verifies the ID token; it never trusts a client-supplied user ID. Never embed client secrets in extension code.

## Privacy
Unauthenticated scans are analyzed but not stored in PostgreSQL. Cloud history belongs to the authenticated account. `save_content` defaults to false; saved records keep the content only when a signed-in user explicitly opts in. Do not log request bodies or scanned text. Add consent/retention controls before production.


## Project structure

```text
ScamLensBackend/
├── app/
│   ├── api/
│   │   ├── routes/       # HTTP endpoints grouped by feature
│   │   ├── deps.py       # Shared request dependencies/auth guards
│   │   └── router.py     # API router composition
│   ├── core/             # Settings and token security
│   ├── db/               # SQLAlchemy base and session
│   ├── models/           # Database tables
│   ├── schemas/          # Request/response validation
│   ├── services/         # Scan analysis logic
│   └── main.py           # FastAPI app entry point
├── migrations/           # Alembic migrations
├── tests/                # Automated tests
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── alembic.ini
└── requirements.txt
```

No duplicate top-level `core.py`, `db.py`, `models.py`, `schemas.py`, `routes.py`, `security.py`, or `analyzer.py` modules are kept. Each responsibility has one canonical location.
