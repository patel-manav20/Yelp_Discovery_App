# Restaurant Lab API (Yelp-style backend)

> **Full project overview** (frontend, demo script, AI/Yelp summaries): see the [root README](../README.md).  
> **HTTP endpoint tables:** [docs/API.md](../docs/API.md).

FastAPI + SQLAlchemy + MySQL (PyMySQL). JWT auth, restaurants, reviews, favorites, owner tools, optional Yelp import and Gemini chat.

## Prerequisites

- Python 3.11+
- MySQL 8+ with an empty schema (e.g. `restaurant_lab`)

## Step-by-step: first run

1. **Create the database** (MySQL Workbench or CLI):

   ```sql
   CREATE DATABASE restaurant_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Clone env and configure**

   ```bash
   cd backend
   cp .env.example .env
   ```

   Edit `.env`:

   - `DATABASE_URL` — e.g. `mysql+pymysql://USER:PASSWORD@localhost:3306/restaurant_lab`
   - `SECRET_KEY` — run `openssl rand -hex 32` and paste the output
   - `CORS_ORIGINS` — comma-separated frontend origins (default covers Vite on 5173)
  - Optional: `YELP_API_KEY`, `GEMINI_API_KEY`, `TAVILY_API_KEY`

3. **Virtual environment and dependencies**

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Alembic migrations** (see section below)

   ```bash
   alembic upgrade head
   ```

5. **Optional: inspect MySQL** (row counts + sample restaurants)

   ```bash
   python -m app.db.inspect_db
   python -m app.db.inspect_db --sample 25 --json
   ```

   **Explore in the browser:** with **`YELP_API_KEY`** set, the Explore page calls **Yelp Fusion search** for listings (up to Yelp’s per-query limits, ~1000 results window). If Yelp is unavailable, it falls back to **`GET /restaurants`** (MySQL only).

   **Persist in the database:** sign up, add listings manually, or use **`POST /restaurants/import-from-yelp`** / **`GET /restaurants/yelp/{yelp_id}?persist=true`** (Bearer) as in `/docs`.

   **Clear all restaurants (CLI):** removes every `restaurants` row; related photos, reviews, favorites, claims, and history entries cascade. Users stay.

   ```bash
   python -m app.db.clear_restaurants --yes
   python -m app.db.clear_restaurants --yes --only-local   # keep Yelp-imported rows
   ```

   **Bulk seed from Yelp (CLI):** same flow as a standalone `seed_restaurants.py` script—search per city, then Fusion business details—mapped to this app’s models:

   ```bash
   python -m app.db.seed_restaurants_from_yelp
   python -m app.db.seed_restaurants_from_yelp --per-city 50 --term restaurants
   python -m app.db.seed_restaurants_from_yelp --cities "San Jose, CA|San Francisco, CA"
   ```

   Requires **`YELP_API_KEY`** in `.env`. Default cities: San Jose, Santa Clara, Sunnyvale, Fremont (40 businesses each, deduped by Yelp id).

6. **Run the API**

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   - OpenAPI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - Health: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

   **Restaurant photo uploads:** signed-in users can `POST /uploads/restaurant-photo` (multipart `file`). Images are stored under `backend/uploads/restaurant_photos/` and served at `/files/restaurant_photos/...`. Requires `python-multipart` (listed in `requirements.txt`).

Always run `uvicorn`, `alembic`, and `python -m ...` from the **`backend`** directory so `.env` and `alembic.ini` resolve correctly.

**Yelp import completeness:** each `POST /restaurants/import-from-yelp` (or `GET .../yelp/{id}?persist=true`) stores the **entire** Fusion business-details JSON in `restaurants.yelp_fusion_snapshot`, maps the main fields into columns, and creates a `restaurant_photos` row for **every** photo URL Yelp returns (not capped at 10). Re-run `alembic upgrade head` if you pull a revision that adds `yelp_fusion_snapshot`.

---

## Alembic migration setup

- Config: `alembic.ini` + `alembic/env.py`
- **`DATABASE_URL` is read from `.env`** via `app.core.config.settings` (the `sqlalchemy.url` line in `alembic.ini` is not used at runtime).

**Initial migration (empty database)**

```bash
cd backend
source .venv/bin/activate
alembic revision --autogenerate -m "initial_schema"
```

Review the file under `alembic/versions/` (especially defaults and indexes), then:

```bash
alembic upgrade head
```

**After you change SQLAlchemy models**

```bash
alembic revision --autogenerate -m "describe_change"
alembic upgrade head
```

**Useful commands**

| Command | Purpose |
|--------|---------|
| `alembic current` | Show current DB revision |
| `alembic history` | List migration chain |
| `alembic downgrade -1` | Undo last migration |

If autogenerate produces noisy MySQL diffs, edit the revision manually before applying.

---

## Registered routes (summary)

| Area | Base path |
|------|-----------|
| Auth | `/auth` |
| Users | `/users` |
| Preferences | `/preferences` |
| Restaurants | `/restaurants` |
| Reviews | `/restaurants/{id}/reviews` (list), `/reviews` (create/update/delete) |
| Favorites | `/favorites` |
| Owner | `/owner` |
| AI chat | `/ai-assistant` |
| Health | `/health` |

CORS is applied in `app/main.py` using `settings.cors_origins_list` from `CORS_ORIGINS` in `.env`.

On startup, the app runs `SELECT 1` against the DB and logs success or a warning (the process still starts if MySQL is down).
