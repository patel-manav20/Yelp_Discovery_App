## Yelp Discovery App — Distributed Restaurant Discovery Platform

Yelp Discovery App is a full-stack platform for diners and restaurant owners to discover restaurants, write and manage reviews, save favorites, and get AI-assisted recommendations through a conversational interface. It is designed for users who want fast local discovery and owners who need operational visibility into listing activity. What makes this Lab 2 build special is the combination of AI-powered recommendations (Gemini + Tavily + Yelp context), event-driven write processing through Kafka, and containerized microservices deployed with Docker and Kubernetes.

---

# Section 1: Tech Stack Table

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, Redux Toolkit, React Router, Tailwind CSS, Axios |
| Backend | FastAPI, Beanie ODM, Motor (async MongoDB driver) |
| Database | MongoDB 7 |
| Messaging | Apache Kafka (Confluent), Zookeeper |
| AI/ML | Google Gemini, Tavily Web Search, LangChain |
| Containerization | Docker, Docker Compose |
| Orchestration | Kubernetes (AWS EKS) |
| Testing | Apache JMeter |
| Auth | JWT + bcrypt |

---

# Section 2: Project Structure

```text
Yelp_Discovery_App/
├── backend/
│   ├── Dockerfile
│   ├── app/
│   │   ├── core/
│   │   ├── db/
│   │   ├── kafka/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── workers/
│   │   ├── main_restaurant.py
│   │   ├── main_restaurant_owner.py
│   │   ├── main_review.py
│   │   ├── main_user_reviewer.py
│   │   └── service_app_factory.py
│   ├── scripts/
│   └── services/
│       ├── restaurant/
│       ├── restaurant-owner/
│       ├── restaurant-worker/
│       ├── review/
│       ├── review-worker/
│       ├── user-reviewer/
│       └── user-worker/
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── store/
├── k8s/
│   ├── backend/
│   ├── frontend/
│   ├── kafka/
│   ├── mongodb/
│   ├── restaurant-owner/
│   ├── restaurant-service/
│   ├── restaurant-worker/
│   ├── review-service/
│   ├── review-worker/
│   ├── user-reviewer/
│   ├── user-worker/
│   ├── zookeeper/
│   ├── namespace.yaml
│   └── deploy.sh
├── jmeter/
│   ├── yelp-load-test.jmx
│   ├── yelp-load-test-100only.jmx
│   └── README.md
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE_VISUAL_GUIDE.md
│   └── kafka-architecture.mermaid
└── docker-compose.yml
```

---

# Section 3: System Architecture Diagram

```mermaid
flowchart LR
    U[User]
    FE[Frontend React + Redux + Nginx]

    subgraph API[API Gateway / Backend Services]
      UA[User API Service]
      RA[Restaurant API Service]
      RVA[Review API Service]
      OA[Owner API Service]
      AI[AI Assistant Service]
    end

    subgraph MQ[Kafka]
      T1[review.created]
      T2[review.updated]
      T3[review.deleted]
      T4[restaurant.created]
      T5[restaurant.updated]
      T6[restaurant.claimed]
      T7[user.created]
      T8[user.updated]
    end

    subgraph W[Worker Services]
      RW[Review Worker]
      RESTW[Restaurant Worker]
      UW[User Worker]
    end

    MDB[(MongoDB)]
    YELP[Yelp Fusion API]
    TAV[Tavily API]
    GEM[Gemini API]

    U --> FE
    FE --> UA
    FE --> RA
    FE --> RVA
    FE --> OA
    FE --> AI

    UA --> T7
    UA --> T8
    RA --> T4
    RA --> T5
    RA --> T6
    RVA --> T1
    RVA --> T2
    RVA --> T3

    T1 --> RW
    T2 --> RW
    T3 --> RW
    T4 --> RESTW
    T5 --> RESTW
    T6 --> RESTW
    T7 --> UW
    T8 --> UW

    RW --> MDB
    RESTW --> MDB
    UW --> MDB

    UA -. read ops .-> MDB
    RA -. read ops .-> MDB
    RVA -. read ops .-> MDB
    OA -. read ops .-> MDB
    AI -. read ops .-> MDB

    AI --> YELP
    AI --> TAV
    AI --> GEM
```

---

# Section 4: Kafka Event-Driven Architecture Diagram

```mermaid
flowchart LR
    subgraph P[Producers]
      PR[Review API Service]
      PST[Restaurant API Service]
      PU[User API Service]
    end

    subgraph K[Kafka Topics]
      K1[review.created]
      K2[review.updated]
      K3[review.deleted]
      K4[restaurant.created]
      K5[restaurant.updated]
      K6[restaurant.claimed]
      K7[user.created]
      K8[user.updated]
    end

    subgraph C[Consumers]
      CR[Review Worker Service]
      CST[Restaurant Worker Service]
      CU[User Worker Service]
    end

    PR --> K1
    PR --> K2
    PR --> K3

    PST --> K4
    PST --> K5
    PST --> K6

    PU --> K7
    PU --> K8

    K1 --> CR
    K2 --> CR
    K3 --> CR

    K4 --> CST
    K5 --> CST
    K6 --> CST

    K7 --> CU
    K8 --> CU
```

> All write operations are async via Kafka. Read operations query MongoDB directly.

---

# Section 5: MongoDB Schema Design

```mermaid
erDiagram
    users ||--o{ reviews : writes
    users ||--o{ favorites : saves
    users ||--o{ user_history : creates
    users ||--|| user_preferences : has
    users ||--o{ sessions : owns
    users ||--o{ restaurants : owns
    restaurants ||--o{ reviews : receives
    restaurants ||--o{ restaurant_photos : has
    restaurants ||--o{ restaurant_claims : has
    reviews ||--o{ review_photos : has
    users ||--o{ chat_sessions : opens
    chat_sessions ||--o{ chat_messages : contains
```

Collections and key fields:

- `users`: email, password_hash, role, display_name, phone, city, state, country, bio, avatar_url, languages, gender, is_active
- `restaurants`: name, description, city, cuisine_tags, average_rating, review_count, owner_user_id, price_level, dietary_tags, ambiance_tags, yelp_business_id
- `reviews`: user_id, restaurant_id, rating, body
- `favorites`: user_id, restaurant_id
- `user_preferences`: user_id, default_city, price_level, cuisine_tags
- `user_history`: user_id, restaurant_id, action, viewed_at
- `restaurant_photos`: restaurant_id, photo_url, sort_order
- `review_photos`: review_id, photo_url
- `restaurant_claims`: user_id, restaurant_id, status, message, admin_note, resolved_at
- `chat_sessions`: user_id, title
- `chat_messages`: chat_session_id, role, content
- `sessions`: user_id, token, expires_at

> Sessions use TTL index for auto-expiry. Passwords encrypted with bcrypt.

---

# Section 6: Redux State Management Diagram

```mermaid
flowchart TB
    STORE[(Redux Store)]
    AUTH[Auth Slice\nstate: user, token, isAuthenticated, loading, error\nthunks: loginUser, signupUser, initializeAuth, logoutUser\nused by: LoginPage, SignupPage, MainLayout, ProtectedRoute]
    REST[Restaurant Slice\nstate: restaurants, currentRestaurant, loading, error, filters\nthunks: fetchRestaurants, fetchRestaurantById, searchRestaurants\nused by: ExplorePage, RestaurantDetailsPage]
    REV[Review Slice\nstate: reviews, myReviews, loading, error, submitStatus\nthunks: fetchReviews, createReview, updateReview, deleteReview\nused by: RestaurantDetailsPage, WriteReviewPage]
    FAV[Favorites Slice\nstate: favorites, loading, error\nthunks: fetchFavorites, addFavorite, removeFavorite\nused by: FavoritesPage, RestaurantDetailsPage]

    STORE --- AUTH
    STORE --- REST
    STORE --- REV
    STORE --- FAV

    C[Component] --> D[dispatch thunk]
    D --> A[Axios API call]
    A --> F[fulfilled/rejected]
    F --> U[state updated]
    U --> R[component re-renders]
```

---

# Section 7: AI Assistant Workflow Diagram

```mermaid
flowchart TD
    M[User message] --> I[Intent Classification Gemini]
    I --> Q{Intent type}

    Q -->|greeting/farewell/off-topic| C1[Generate conversational reply]
    C1 --> O1[Return reply only no restaurant cards]

    Q -->|general_question| T[Tavily web search]
    T --> G1[Gemini answer generation]
    G1 --> O2[Return reply only no restaurant cards]

    Q -->|restaurant query| F1[Extract filters cuisine city price dietary]
    F1 --> M1[Query MongoDB]
    M1 --> Y{Enough candidates?}
    Y -->|No| YP[Supplement with Yelp API]
    Y -->|Yes| R1[Use MongoDB candidates]
    YP --> W[Tavily web context]
    R1 --> W
    W --> RK[Rank candidates]
    RK --> G2[Gemini natural response]
    G2 --> O3[Return reply + restaurant cards]
```

---

# Section 8: Docker & Kubernetes Deployment Diagram

```mermaid
flowchart LR
    subgraph DC[Docker Compose]
      M[mongodb:27017]
      Z[zookeeper:2181]
      K[kafka:9092]
      B[backend services:8000-8004]
      W[worker services]
      F[frontend:3000]
      M --- Z --- K --- B --- W --- F
    end

    subgraph K8S[Kubernetes Namespace yelp-app]
      DEP[Deployments\nfrontend backend services workers mongodb kafka zookeeper]
      SVC[Services\nClusterIP internal\nLoadBalancer frontend]
      CM[ConfigMaps]
      SEC[Secrets]
      PVC[PersistentVolumeClaims]
      DEP --> SVC
      DEP --> CM
      DEP --> SEC
      DEP --> PVC
    end
```

---

# Section 9: End-to-End Request Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant R as React Component
    participant X as Axios
    participant A as FastAPI Review Route
    participant K as Kafka review.created
    participant C as Review Consumer
    participant M as MongoDB

    U->>R: Fill review form and submit
    R->>R: dispatch(createReview thunk)
    R->>X: POST /reviews with JWT
    X->>A: HTTP request
    A->>A: Validate request and auth
    A->>K: Publish review.created event
    A-->>X: 202 Accepted
    X-->>R: Resolve promise
    R-->>U: Show Review submitted, processing...
    K->>C: Deliver event
    C->>M: Insert Review document
    C->>M: Recalculate restaurant average_rating
    C->>M: Save updated restaurant
```

---

# Section 10: API Endpoints Table

| Service | Method | Endpoint | Data Path |
| --- | --- | --- | --- |
| Auth | POST | `/auth/signup` | Kafka write (`user.created`) |
| Auth | POST | `/auth/login` | Direct MongoDB |
| Auth | GET | `/auth/me` | Direct MongoDB |
| Users | GET | `/users/me` | Direct MongoDB |
| Users | PUT | `/users/me` | Kafka write (`user.updated`) |
| Users | POST | `/users/me/profile-photo` | Direct MongoDB |
| Users | GET | `/users/me/history` | Direct MongoDB |
| Restaurants | GET | `/restaurants` | Direct MongoDB |
| Restaurants | GET | `/restaurants/{id}` | Direct MongoDB |
| Restaurants | POST | `/restaurants` | Kafka write (`restaurant.created`) |
| Restaurants | PUT | `/restaurants/{id}` | Kafka write (`restaurant.updated`) |
| Restaurants | GET | `/restaurants/yelp` | Yelp proxy (read) |
| Restaurants | GET | `/restaurants/yelp/{yelpId}` | Yelp proxy (read) |
| Reviews | GET | `/restaurants/{id}/reviews` | Direct MongoDB |
| Reviews | POST | `/reviews` | Kafka write (`review.created`) |
| Reviews | PUT | `/reviews/{id}` | Kafka write (`review.updated`) |
| Reviews | DELETE | `/reviews/{id}` | Kafka write (`review.deleted`) |
| Favorites | GET | `/favorites/me` | Direct MongoDB |
| Favorites | POST | `/favorites/{id}` | Direct MongoDB |
| Favorites | DELETE | `/favorites/{id}` | Direct MongoDB |
| Owner | GET | `/owner/dashboard` | Direct MongoDB |
| Owner | GET | `/owner/restaurants` | Direct MongoDB |
| Owner | GET | `/owner/reviews` | Direct MongoDB |
| Owner | POST | `/restaurants/{id}/claim` | Kafka write (`restaurant.claimed`) |
| AI | POST | `/ai-assistant/chat` | Direct MongoDB + AI providers |
| AI | GET | `/ai-assistant/sessions` | Direct MongoDB |
| AI | GET | `/ai-assistant/sessions/{id}` | Direct MongoDB |
| AI | DELETE | `/ai-assistant/sessions/{id}` | Direct MongoDB |
| Uploads | POST | `/uploads/restaurant-photo` | Direct storage + MongoDB refs |
| Uploads | POST | `/uploads/profile-photo` | Direct storage + MongoDB refs |
| Health | GET | `/health` | Direct service health |

---

# Section 11: JMeter Performance Testing

We load tested critical APIs using Apache JMeter: authentication (`POST /auth/login`), restaurant retrieval (`GET /restaurants`), and review submission (`POST /reviews`) through the Kafka async flow. Tests were executed at concurrency levels 100, 200, 300, 400, and 500 users. Metrics collected include average response time, throughput (requests/second), and error rate (%). This provides clear visibility into system behavior as load increases and where bottlenecks begin (CPU, MongoDB reads, consumer lag, etc.).

```bash
jmeter -n -t jmeter/yelp-load-test.jmx -l results.csv -e -o report/
```

---

# Section 12: Local Setup Instructions

```bash
git clone <repo>
cd Yelp_Discovery_App
cp .env.example .env  # fill in API keys
docker-compose up --build
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# MongoDB: localhost:27017
```

Manual setup (without Docker):

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main_user_reviewer:app --reload --port 8001
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

---

# Section 13: Kubernetes Deployment Instructions

```bash
cd k8s
kubectl apply -f namespace.yaml
kubectl apply -f mongodb/
kubectl apply -f zookeeper/
kubectl apply -f kafka/
kubectl apply -f backend/
kubectl apply -f frontend/
kubectl get pods -n yelp-app
```

---

# Section 14: UI screenshots section


### Login UI
<img width="1711" height="1299" alt="image" src="https://github.com/user-attachments/assets/d84261a8-2796-4f01-9218-b4487dbb3fac" />



### Signup UI
<img width="1711" height="807" alt="image" src="https://github.com/user-attachments/assets/cb740bdd-f29e-49d0-a3ad-e627b997cb58" />



### Home Dashboard UI
<img width="1715" height="1299" alt="image" src="https://github.com/user-attachments/assets/f682c6eb-f737-4fda-b269-4888700d5f30" />



### Explore Restaurants UI
<img width="1698" height="1298" alt="image" src="https://github.com/user-attachments/assets/c22162d5-dc2b-4b0c-a532-7b61a1ff6417" />


### Explore Home Service UI
<img width="1708" height="1305" alt="image" src="https://github.com/user-attachments/assets/8f8aab73-9ed2-46ff-869a-151a23b5c3cf" />



### Restaurant Details UI
<img width="1707" height="1306" alt="image" src="https://github.com/user-attachments/assets/4057530d-ef4d-46fb-81e9-1f456bbb573b" />


### Write Review UI
<img width="1698" height="1305" alt="image" src="https://github.com/user-attachments/assets/d0eeae29-1d22-4f88-a557-5c93f68a4bdd" />

###

<img width="1711" height="1299" alt="image" src="https://github.com/user-attachments/assets/416d8a64-471a-44db-b41d-024cd1822396" />

###

<img width="749" height="386" alt="image" src="https://github.com/user-attachments/assets/b953820a-3ec6-4cf6-a916-a13a5a26f4c1" />



### Profile UI
<img width="790" height="1026" alt="image" src="https://github.com/user-attachments/assets/35c91329-ba93-452f-ad4a-8d771c6e6bd4" />



### Favorites UI
<img width="1694" height="698" alt="image" src="https://github.com/user-attachments/assets/772f6067-faaf-4312-8b31-bf9bf582149c" />


### AI Assistant Chat UI
<img width="595" height="661" alt="image" src="https://github.com/user-attachments/assets/006c1e74-6f06-4e86-a29d-f29832bb3c73" />

###

<img width="589" height="658" alt="image" src="https://github.com/user-attachments/assets/6a60ba5a-3acf-402b-afd6-5aef7386b416" />


### Owner Dashboard UI
<img width="1671" height="1306" alt="image" src="https://github.com/user-attachments/assets/9664f397-1ffb-4a50-852a-afd238821188" />

###

<img width="1321" height="1289" alt="image" src="https://github.com/user-attachments/assets/c719e7f8-a9e6-41d4-ba0c-92e05d50fce6" />



### Owner Listings UI
<img width="1568" height="1242" alt="image" src="https://github.com/user-attachments/assets/ea8ed495-d6f4-4114-9db7-8d88265fb0b8" />


### Owner Activity UI
<img width="1308" height="1064" alt="image" src="https://github.com/user-attachments/assets/d2c3b1f7-f0a2-400c-916e-b34bf36d9e6a" />



---

# Section 15: Keep existing Work Distribution section (Section 10 from old README) as-is

## 10) Work Distribution

This lab was completed by Manav and Ritika.

- Manav: Frontend and Backend
- Ritika: Backend and AI Integration

---

# Section 16: Experience section — Docker, Kubernetes, Kafka, MongoDB migration, Redux, distributed systems concepts.

Lab 2 gave us practical experience in building and operating a real distributed system instead of only writing app logic. We learned how Docker standardizes environments across machines, and how Kubernetes on AWS EKS handles service deployment, networking, and runtime orchestration. Kafka taught us how event-driven write workflows decouple APIs from heavy processing and improve responsiveness under load. Migrating from MySQL to MongoDB helped us model flexible restaurant and user data more naturally, while Redux made frontend state transitions predictable and easier to debug. Overall, this lab connected core distributed systems concepts (asynchronous messaging, service separation, scalability, and resilience) to hands-on implementation.
