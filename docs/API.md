# Restaurant Lab API — Endpoint summary

Base URL (local default): `http://localhost:8000`  
Interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger) · [http://localhost:8000/redoc](http://localhost:8000/redoc)

Unless noted, request/response bodies are JSON. Protected routes need:

```http
Authorization: Bearer <access_token>
```

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Liveness check (`{"status":"ok"}`) |

---

## Authentication (`/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/signup` | No | Create **diner** account; returns JWT + user |
| `POST` | `/auth/owner-signup` | No | Create **owner** account; returns JWT + user |
| `POST` | `/auth/login` | No | Login; returns JWT + user |
| `GET` | `/auth/me` | Yes | Current user (same info as profile summary) |

---

## Users (`/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users/me` | Yes | Get my profile |
| `PUT` | `/users/me` | Yes | Update my profile |
| `POST` | `/users/me/profile-photo` | Yes | Set profile photo URL |
| `GET` | `/users/me/history` | Yes | Activity history (`limit`, `offset` query params) |

---

## Preferences (`/preferences`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/preferences/me` | Yes | Get dining preferences |
| `PUT` | `/preferences/me` | Yes | Update dining preferences |

---

## Restaurants (`/restaurants`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/restaurants` | No | Search/browse (query params: `query`, `city`, `zip`, `cuisine`, `keyword`, `price`, `rating`, `dietary`, `ambiance`, `sort_by`, `page`, `limit`, optional `open_now=true` — filters by stored Yelp-style `hours` JSON using a timezone inferred from `city`, e.g. `, CA` → Pacific) |
| `GET` | `/restaurants/yelp` | No | **Yelp Fusion search** — `term`, `city` (or ZIP), `limit` (1–50), `page` (1-based; offset capped by Yelp’s ~1000-result window), optional `price` (1–4), `sort_by` (`best_match` \| `rating` \| `review_count` \| `distance`), optional `open_now=true` (Yelp only returns businesses open **now** for that **same** `location`). Returns `restaurants`, `total`, `page`, `limit`, `offset`. Explore uses this for live listings. Requires `YELP_API_KEY`. |
| `GET` | `/restaurants/yelp/{yelp_id}` | No* | **Yelp Fusion detail proxy** — full business JSON in the same lab-style shape (plus `hours`, `latitude`/`longitude`). Query `persist=true` **requires Bearer auth** and upserts into MySQL (same as import-from-yelp). |
| `GET` | `/restaurants/{restaurant_id}` | No | Restaurant detail (local DB numeric id) |
| `POST` | `/restaurants` | Yes | Create listing |
| `PUT` | `/restaurants/{restaurant_id}` | Yes | Update **my** listing |
| `DELETE` | `/restaurants/{restaurant_id}` | Yes | Delete **my** listing |
| `POST` | `/restaurants/{restaurant_id}/claim` | Yes | Submit claim request |
| `POST` | `/restaurants/import-from-yelp` | Yes | Import/refresh one business by Yelp business id (`YELP_API_KEY` required) |

---

## Reviews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/restaurants/{restaurant_id}/reviews` | No | List reviews (`page`, `limit`) |
| `POST` | `/reviews` | Yes | Create review |
| `PUT` | `/reviews/{review_id}` | Yes | Update **my** review |
| `DELETE` | `/reviews/{review_id}` | Yes | Delete **my** review |

---

## Favorites (`/favorites`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/favorites/me` | Yes | List saved restaurants |
| `POST` | `/favorites/{restaurant_id}` | Yes | Save restaurant |
| `DELETE` | `/favorites/{restaurant_id}` | Yes | Remove save |

---

## Owner dashboard (`/owner`)

Requires authenticated user with **owner** role.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/owner/dashboard` | Owner | Summary stats and recent activity |
| `GET` | `/owner/restaurants` | Owner | List owned restaurants |
| `GET` | `/owner/restaurants/{restaurant_id}/reviews` | Owner | Reviews for owned restaurant (`page`, `limit`) |

---

## AI assistant (`/ai-assistant`)

Requires authenticated user (any role). Optional `GEMINI_API_KEY` for full behavior; Yelp supplement uses `YELP_API_KEY` when set.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/ai-assistant/chat` | Yes | Send message; returns `reply`, `recommendations`, `session_id`, `applied_filters` |
| `GET` | `/ai-assistant/sessions` | Yes | List my chat sessions |
| `GET` | `/ai-assistant/sessions/{session_id}` | Yes | Session + messages |
| `DELETE` | `/ai-assistant/sessions/{session_id}` | Yes | Delete session |

---

## Notes

- There is **no** global `/api` prefix; the frontend calls paths like `/auth/login` directly against the API base URL (`VITE_API_URL`).
- CORS allowed origins come from `CORS_ORIGINS` in `backend/.env` (comma-separated).
