# Frontend (React + Vite)

This is the client app for the Yelp-style restaurant project.

## What it includes

- Home, Explore, Restaurant Details
- Add/Edit listing for owners
- Write reviews, favorites, history
- AI dining assistant chat widget

## Requirements

- Node.js 18+
- Backend API running on `http://localhost:8000`

## Setup

```bash
cd frontend
cp .env.example .env
npm install
```

Set in `.env`:

```env
VITE_API_URL=http://localhost:8000
```

## Run

```bash
npm run dev -- --port 5173
```

Open: [http://localhost:5173](http://localhost:5173)

## Build

```bash
npm run build
npm run preview
```

## Notes

- Make sure backend CORS allows your frontend port.
- If API calls fail, check `VITE_API_URL` first.
