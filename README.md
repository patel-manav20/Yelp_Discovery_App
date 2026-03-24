# Yelp_Demo - End-to-End Restaurant Discovery App

This is a full-stack student project inspired by Yelp-style restaurant discovery.

It supports:
- user login/signup
- explore and search restaurants
- write reviews and save favorites
- owner dashboard and listing management
- AI assistant for restaurant recommendations

---

## 1) What this project uses

| Layer | Tech |
|---|---|
| Frontend | React (Vite), React Router, Tailwind CSS, Axios |
| Backend | FastAPI, SQLAlchemy, Alembic, JWT |
| Database | MySQL |
| AI | Gemini + LangChain parser + custom ranking logic |
| External APIs | Yelp Fusion, Tavily |

---

## 2) Project folder structure

```text
Yelp_Demo/
├── frontend/         # React app
├── backend/          # FastAPI app
├── docs/API.md       # API endpoint docs
└── README.md         # This file
```

---

## 3) Whole project architecture diagram

```mermaid
flowchart LR
    U[User] --> FE[Frontend React App]
    FE --> API[Axios Service Layer]
    API --> BE[FastAPI Backend]

    BE --> DB[(MySQL)]
    BE --> YELP[Yelp Fusion API]
    BE --> TAV[Tavily API]
    BE --> GEM[Gemini API]

    DB --> BE
    YELP --> BE
    TAV --> BE
    GEM --> BE

    BE --> FE
    FE --> U
```

---

## 4) End-to-end workflow (simple)

```mermaid
flowchart TD
    A[User action on UI] --> B[Frontend sends API request]
    B --> C[FastAPI route receives request]
    C --> D[Service logic runs]
    D --> E[Read/write MySQL data]
    D --> F[Optional call: Yelp / Tavily / Gemini]
    E --> G[Build final response JSON]
    F --> G
    G --> H[Frontend renders result]
```

### Step-by-step in simple words
1. User clicks/searches/sends chat message in frontend.
2. Frontend calls backend API endpoint.
3. Backend validates user and reads DB data.
4. Backend may call external APIs (Yelp/Tavily/Gemini) if needed.
5. Backend returns JSON response.
6. Frontend shows cards, text, ratings, profile info, etc.

---

## 5) AI Assistant workflow diagram

```mermaid
flowchart TD
    A[User message from ChatWidget] --> B[POST /ai-assistant/chat]
    B --> C[Load session + user preferences]
    C --> D[Build context from conversation_history]
    D --> E{Intent check}

    E -->|Open/Hours question| F[Open-status handler]
    F --> F1{Local hours available?}
    F1 -->|Yes| F2[Compute open/closed from DB hours]
    F1 -->|No| F3[Use Tavily context]
    F2 --> Z[Save chat messages + return reply]
    F3 --> Z

    E -->|Ratings question| G[Ratings handler]
    G --> G1[Fetch local reviews + rating summary]
    G1 --> Z

    E -->|General recommendation| H[Extract filters with LangChain + Gemini]
    H --> I[Merge with saved user preferences]
    I --> J[Query local restaurants]
    J --> K{Enough local matches?}
    K -->|No| L[Add Yelp supplemental candidates]
    K -->|Yes| M[Use local candidates]
    L --> N[Rank all candidates]
    M --> N
    N --> O[Build reason for each recommendation]
    O --> P[Generate conversational response]
    P --> Z
```

### AI answer sources (important)
- **First preference:** local MySQL data
- **If needed:** Yelp supplemental data
- **For extra context:** Tavily web snippets
- **For natural language response:** Gemini

---

## 6) Main app modules

### User side
- auth (login/signup)
- restaurant explore and details
- write reviews
- favorites
- profile + preferences

### Owner side
- owner login/signup
- owner dashboard
- add/edit listings
- owner activity

### AI side
- multi-turn chat sessions
- preference-aware recommendations
- recommendation reasons on cards
- intent-specific handling (open/hours, ratings)

---

## 7) Local setup

### Backend
```bash
cd backend
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 8) UI screenshots section (headings)

Add your screenshots in `./screenshots/` and replace file names below.

### Login UI
![Login UI](./screenshots/login.png)

### Signup UI
![Signup UI](./screenshots/signup.png)

### Home Dashboard UI
![Home Dashboard UI](./screenshots/home-dashboard.png)

### Explore Restaurants UI
![Explore Restaurants UI](./screenshots/explore-restaurants.png)

### Restaurant Details UI
![Restaurant Details UI](./screenshots/restaurant-details.png)

### Write Review UI
![Write Review UI](./screenshots/write-review.png)

### Profile UI
![Profile UI](./screenshots/profile.png)

### Favorites UI
![Favorites UI](./screenshots/favorites.png)

### AI Assistant Chat UI
![AI Assistant Chat UI](./screenshots/ai-chatbot.png)

### Owner Dashboard UI
![Owner Dashboard UI](./screenshots/owner-dashboard.png)

### Owner Listings UI
![Owner Listings UI](./screenshots/owner-listings.png)

### Owner Activity UI
![Owner Activity UI](./screenshots/owner-activity.png)

---

## 9) My Experience Building This Project

This project taught me how a complete end-to-end product works, not just one file or one page.

I learned how frontend and backend are connected in real life. In the frontend, I worked on React pages, routing, forms, and reusable components. In the backend, I worked with FastAPI routes, service logic, database models, and migrations. It helped me understand how user actions in UI become API requests, then database operations, and finally responses back to the UI.

The AI assistant part was the most challenging and most interesting. I learned how to combine user preferences, conversation history, local DB search, ranking logic, and external APIs (Gemini, Yelp, Tavily) to generate better recommendations. I also learned that good AI output depends a lot on clean data and clear logic, not only on prompts.

I also improved my debugging skills during this project. Many times, one small issue in filtering, routing, or data shape caused wrong results in chat or explore pages. Fixing those issues helped me understand full-stack flow deeply.

Overall, this project gave me strong practical experience in building, debugging, and improving a real-world data-driven web application.
