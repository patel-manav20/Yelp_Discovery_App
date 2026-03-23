# Restaurant Lab — Yelp-Style Discovery App

**Restaurant Lab** is an educational full-stack project inspired by **directory-style restaurant discovery** (layout and patterns similar to Yelp, but **not affiliated** with Yelp). It includes search, reviews, favorites, owner tools, optional **Yelp Fusion** import, and an **AI dining assistant**.

| Layer | Stack |
|--------|--------|
| **Frontend** | React (Vite), React Router, Tailwind CSS, Axios |
| **Backend** | FastAPI, SQLAlchemy 2, Alembic, PyJWT, bcrypt |
| **Database** | MySQL 8+ |
| **AI** | Google Gemini (optional) over HTTP; structured filters + reply text |
| **External data** | Yelp Fusion API (optional) for import + supplemental search |

---

## Repository layout

```
Lab1/
├── README.md                 ← You are here (project overview & lab guide)
├── docs/
│   └── API.md                ← Full HTTP endpoint reference
├── backend/                  ← FastAPI app (see backend/README.md for Alembic detail)
│   ├── .env.example
│   ├── app/
│   └── alembic/
└── frontend/                 ← React SPA
    ├── .env.example
    └── src/
```

---

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** (for Vite)
- **MySQL 8+** and a GUI or CLI client
- (Optional) **Yelp Fusion** API key — [Yelp Developers](https://www.yelp.com/developers/documentation/v3/authentication)
- (Optional) **Google AI** API key — [Google AI Studio](https://aistudio.google.com/) (Gemini)

---

## Project setup (first time)

### 1. Database

Create an empty schema (UTF-8):

```sql
CREATE DATABASE restaurant_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit **`.env`**:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | `mysql+pymysql://USER:PASSWORD@HOST:3306/restaurant_lab` |
| `SECRET_KEY` | Long random string (`openssl rand -hex 32`) |
| `CORS_ORIGINS` | Frontend origins, e.g. `http://localhost:5173` |
| `YELP_API_KEY` | Optional — import + AI supplement |
| `GEMINI_API_KEY` | Optional — AI chat quality |

Install and migrate:

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
```

**Data:** create users and restaurants via the web app, or import from Yelp with `YELP_API_KEY` using **`POST /restaurants/import-from-yelp`** or **`GET /restaurants/yelp/{yelp_id}?persist=true`** (see [docs/API.md](./docs/API.md) and `/docs`). Optional: `python -m app.db.inspect_db` from `backend` to check row counts.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env               # optional; defaults work for local API
```

If the API is not on `http://localhost:8000`, set `VITE_API_URL` in `frontend/.env`.

---

## Local development — run steps

You need **two terminals**: MySQL running, then backend + frontend.

### Terminal A — API

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)  
- Health: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### Terminal B — Web app

```bash
cd frontend
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**).

**Tip:** Run `uvicorn`, `alembic`, and `python -m app.db...` from the **`backend`** folder so `.env` and `alembic.ini` resolve correctly. More migration notes: `backend/README.md`.

---

## API endpoint summary

A concise table of all routes lives in **[docs/API.md](./docs/API.md)**. The live OpenAPI spec is always at `/docs` when the server is running.

---

## Accounts

Register through **Sign up** / **Owner sign up** in the UI. There is no bundled seed script.

> **Submission tip:** Do not commit real API keys or personal passwords. Use `.env` (gitignored) and document only `.env.example`.

---

## Sample test flow (lab demo checklist)

Use this ~5–10 minute script to show end-to-end behavior:

1. **Health & docs** — Open `/health` and `/docs`; confirm DB connected (check backend log on startup).
2. **Browse** — Without logging in, open **Explore**, search `San Jose` or `pizza`, open a restaurant **detail** page.
3. **Sign up** — Create a diner account (and optionally an owner account).
4. **Profile & preferences** — Update **Profile**; set **Preferences** (city, cuisines, price).
5. **Social proof** — **Write a review** on a restaurant; confirm it appears in the list.
6. **Save** — Toggle **Save** / view **Saved** (favorites).
7. **Owner path** — Log in as an **owner**; open **For business** / owner dashboard.
8. **AI assistant** — Open the **chat bubble**; send “Dinner tonight” or “Vegan options”; show reply + recommendation cards (requires **`GEMINI_API_KEY`** for best results; without it, behavior may degrade to fallbacks).
9. **Optional Yelp** — With **`YELP_API_KEY`**, use Swagger `POST /restaurants/import-from-yelp` with a real Yelp business id; refresh Explore.

---

## AI chatbot architecture (short)

1. **Session** — Each chat belongs to a `ChatSession` in MySQL; `POST /ai-assistant/chat` accepts `session_id` or starts a new session.
2. **Filter extraction** — The user message (plus recent history) is sent to **Gemini** with a JSON-only prompt to produce structured fields (cuisine, price, location, keywords, etc.). If Gemini is unavailable or returns empty fields, a small **heuristic** extracts keywords.
3. **Preferences merge** — Extracted filters are merged with the user’s saved **dining preferences** (default city, cuisines, price).
4. **Candidate sources** — The app queries **local MySQL** restaurants using those filters. If there are fewer than five local matches, it may call **Yelp Fusion search** to add supplemental candidates (when `YELP_API_KEY` is set).
5. **Ranking** — Candidates are scored/ranked (message relevance, ratings, prefs).
6. **Reply** — Gemini generates a short natural-language answer using preference summary, applied filters, and the top recommendations. A **fallback** message is used if no model text is returned.
7. **Persistence** — User and assistant messages are stored; the frontend can list sessions and reload history.

---

## Yelp Fusion integration (short)

- **Import (authoritative row):** `POST /restaurants/import-from-yelp` calls Yelp’s **Business Details** endpoint (`GET https://api.yelp.com/v3/businesses/{id}`), normalizes the JSON, and **inserts or updates** a row in MySQL (photos, rating, categories, address, etc.). Requires `YELP_API_KEY`.
- **AI supplement:** When local search returns few results, the assistant may call Yelp’s **Business Search** API to suggest additional places. Those hits may appear as recommendations **without** a local numeric `id` until imported.
- **Attribution:** Yelp data is subject to [Yelp’s API terms](https://www.yelp.com/developers/api_terms); this lab uses the API for learning purposes only.

---

## Production / submission notes

- Rotate `SECRET_KEY` and use strong MySQL credentials.
- Never commit `.env` files; only **`.env.example`** templates.
- The UI states clearly that the project is **educational** and not affiliated with Yelp.

---

## License / academic use

Use and adapt for coursework per your instructor’s policy. Keep third-party API terms (Yelp, Google) in mind for any public deployment.
