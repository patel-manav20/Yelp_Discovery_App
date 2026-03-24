# Frontend (React + Vite)

This is the UI for the Yelp_Demo project.

It includes:
- login/signup pages
- explore/search restaurants
- restaurant details + reviews
- favorites, profile, preferences
- owner pages
- AI chat widget

## Tech used
- React
- Vite
- React Router
- Tailwind CSS
- Axios

## Folder
- `src/` -> all pages, components, services
- `public/` -> static files

## Setup

```bash
cd frontend
npm install
```

## Run in dev mode

```bash
npm run dev
```

Default URL is usually:
- `http://localhost:5173`

## Environment variable

Create `.env` (optional) if backend is not running on localhost:

```env
VITE_API_URL=http://localhost:8000
```

If deployed, set this to your live backend URL.

## Build for production

```bash
npm run build
```

Preview build locally:

```bash
npm run preview
```
