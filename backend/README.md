# Backend (FastAPI + MySQL)

This is the backend API for the Yelp_Demo project.

It handles:
- authentication (JWT)
- restaurants, reviews, favorites
- owner dashboard APIs
- AI assistant APIs
- optional Yelp/Tavily/Gemini integrations

## Tech used
- FastAPI
- SQLAlchemy
- Alembic
- MySQL

## Prerequisites
- Python 3.11+
- MySQL 8+

## Quick setup

### 1) Create DB

```sql
CREATE DATABASE restaurant_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2) Configure env

```bash
cd backend
cp .env.example .env
```

Important vars in `.env`:
- `DATABASE_URL`
- `SECRET_KEY`
- `CORS_ORIGINS`

Optional vars:
- `YELP_API_KEY`
- `GEMINI_API_KEY`
- `TAVILY_API_KEY`

### 3) Install and migrate

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
```

### 4) Run API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Useful URLs
- Swagger docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

## Main route groups
- `/auth`
- `/users`
- `/preferences`
- `/restaurants`
- `/reviews`
- `/favorites`
- `/owner`
- `/ai-assistant`

## Helpful commands

Check DB quickly:

```bash
python -m app.db.inspect_db
```

Seed from Yelp (optional, needs API key):

```bash
python -m app.db.seed_restaurants_from_yelp
```

## Common issues
- `401` -> token missing/expired
- CORS error -> update `CORS_ORIGINS`
- DB error -> check `DATABASE_URL` and MySQL status

## Note
Keep `.env` private. Only share `.env.example`.
