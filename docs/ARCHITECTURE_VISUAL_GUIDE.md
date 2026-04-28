# Yelp Discovery App — Complete Architecture & Workflow Guide

## Purpose
This document describes every architecture diagram, workflow, and data flow in the Yelp Discovery App. Feed this file to any AI tool to generate visuals, presentations, or documentation.

---

## DIAGRAM 1: Full System Architecture

Type: Architecture diagram / Block diagram
Title: "Yelp Discovery App — Distributed System Architecture"

Nodes and groups:

GROUP "Client Layer":
  - Node: "User Browser" (icon: monitor)
  - Node: "React Frontend" (sub-label: "Vite + Redux Toolkit + Tailwind")
  - Node: "Nginx Reverse Proxy" (sub-label: "serves static files, proxies API")

GROUP "API Layer" (label: "FastAPI Backend Services"):
  - Node: "User API Service" (sub-label: "auth, profile, preferences")
  - Node: "Restaurant API Service" (sub-label: "CRUD, search, Yelp proxy")
  - Node: "Review API Service" (sub-label: "create, update, delete reviews")
  - Node: "Owner API Service" (sub-label: "dashboard, claims, listings")
  - Node: "AI Assistant Service" (sub-label: "chat, intent classification, recommendations")

GROUP "Message Queue" (label: "Apache Kafka"):
  - Node: "Zookeeper" (sub-label: "cluster coordination")
  - Node: "Kafka Broker" (sub-label: "event streaming")
  - Topics listed: review.created, review.updated, review.deleted, restaurant.created, restaurant.updated, restaurant.claimed, user.created, user.updated

GROUP "Worker Layer" (label: "Kafka Consumer Workers"):
  - Node: "Review Worker" (sub-label: "processes review events, recalculates ratings")
  - Node: "Restaurant Worker" (sub-label: "processes restaurant events")
  - Node: "User Worker" (sub-label: "processes user events")

GROUP "Data Layer":
  - Node: "MongoDB 7" (sub-label: "12 collections, TTL sessions, bcrypt passwords")

GROUP "External APIs":
  - Node: "Yelp Fusion API" (sub-label: "restaurant search, business details")
  - Node: "Tavily API" (sub-label: "web search for current info")
  - Node: "Google Gemini API" (sub-label: "LLM for chat, intent classification, response generation")

Connections (arrows):
  - User Browser → React Frontend (label: "user interactions")
  - React Frontend → Nginx (label: "API requests")
  - Nginx → all API services (label: "proxy_pass /api")
  - User API Service → Kafka (label: "publishes user.created, user.updated")
  - Restaurant API Service → Kafka (label: "publishes restaurant.created, restaurant.updated, restaurant.claimed")
  - Review API Service → Kafka (label: "publishes review.created, review.updated, review.deleted")
  - Kafka → Review Worker (label: "consumes review topics")
  - Kafka → Restaurant Worker (label: "consumes restaurant topics")
  - Kafka → User Worker (label: "consumes user topics")
  - Review Worker → MongoDB (label: "writes reviews, updates ratings")
  - Restaurant Worker → MongoDB (label: "writes restaurant data")
  - User Worker → MongoDB (label: "writes user data")
  - All API Services → MongoDB (label: "direct reads — GET endpoints")
  - AI Assistant Service → Yelp Fusion API (label: "supplemental restaurant data")
  - AI Assistant Service → Tavily API (label: "web search context")
  - AI Assistant Service → Gemini API (label: "intent classification + response generation")
  - React Frontend ← API Services (label: "JSON responses")

Color suggestions: API layer = blue, Kafka = orange, Workers = green, MongoDB = dark green, External APIs = purple, Frontend = light blue

---

## DIAGRAM 2: Kafka Producer-Consumer Architecture

Type: Flow diagram / Left-to-right architecture
Title: "Event-Driven Architecture — Kafka Producer-Consumer Pattern"

LEFT COLUMN (label: "Producers — API Services"):
  - Node: "Review API Service"
  - Node: "Restaurant API Service"
  - Node: "User API Service"

MIDDLE COLUMN (label: "Kafka Topics"):
  - Node: "review.created"
  - Node: "review.updated"
  - Node: "review.deleted"
  - Node: "restaurant.created"
  - Node: "restaurant.updated"
  - Node: "restaurant.claimed"
  - Node: "user.created"
  - Node: "user.updated"

RIGHT COLUMN (label: "Consumers — Worker Services"):
  - Node: "Review Worker Service"
  - Node: "Restaurant Worker Service"
  - Node: "User Worker Service"

Connections:
  - Review API Service → review.created, review.updated, review.deleted
  - Restaurant API Service → restaurant.created, restaurant.updated, restaurant.claimed
  - User API Service → user.created, user.updated
  - review.created, review.updated, review.deleted → Review Worker Service
  - restaurant.created, restaurant.updated, restaurant.claimed → Restaurant Worker Service
  - user.created, user.updated → User Worker Service

Note at bottom: "Write operations are async (API returns 202 Accepted). Read operations bypass Kafka and query MongoDB directly."

---

## DIAGRAM 3: Review Submission — End-to-End Sequence

Type: Sequence diagram (timeline left to right)
Title: "Review Submission Flow — From User Click to Database Write"

Actors/Participants (left to right):
  1. User
  2. React Frontend (ReviewPage + Redux reviewSlice)
  3. Axios API Layer
  4. FastAPI Review Route
  5. Kafka Broker
  6. Review Worker (Consumer)
  7. MongoDB

Sequence:
  Step 1: User → React Frontend: "fills review form (rating + text), clicks Submit"
  Step 2: React Frontend → React Frontend: "dispatch(createReview({restaurant_id, rating, body}))"
  Step 3: React Frontend → Axios: "POST /reviews with JWT Bearer token"
  Step 4: Axios → FastAPI Review Route: "HTTP POST with JSON body"
  Step 5: FastAPI Review Route → FastAPI Review Route: "validate input, verify JWT, extract user_id"
  Step 6: FastAPI Review Route → Kafka Broker: "publish to topic 'review.created' with payload {user_id, restaurant_id, rating, body, timestamp}"
  Step 7: FastAPI Review Route → Axios: "return 202 Accepted {status: 'processing', message: 'Review submitted'}"
  Step 8: Axios → React Frontend: "thunk fulfilled with 202 response"
  Step 9: React Frontend → User: "shows 'Review submitted, processing...' toast/message"
  Step 10: Kafka Broker → Review Worker: "delivers review.created event"
  Step 11: Review Worker → MongoDB: "Review(user_id, restaurant_id, rating, body).insert()"
  Step 12: Review Worker → MongoDB: "recalculate: avg(all review ratings for this restaurant) → update restaurant.average_rating and restaurant.review_count"
  Step 13: Review Worker → Review Worker: "log success, commit offset"

---

## DIAGRAM 4: User Authentication Flow

Type: Sequence diagram
Title: "User Signup & Login Flow"

Actors: User, React (authSlice), Axios, FastAPI Auth Route, bcrypt, MongoDB, JWT

Signup sequence:
  1. User fills signup form (email, password, display_name)
  2. React dispatches signupUser thunk
  3. Axios POST /auth/signup
  4. FastAPI validates input
  5. FastAPI → bcrypt: hash password
  6. FastAPI → MongoDB: User(email, password_hash, ...).insert()
  7. FastAPI → Kafka: publish user.created
  8. FastAPI → JWT: create_access_token(sub=str(user.id))
  9. FastAPI → MongoDB: Session(user_id, token, expires_at).insert()
  10. Return {access_token, token_type: "bearer", user: {id, email, display_name, role}}
  11. Redux stores token in state + localStorage
  12. React redirects to home page

Login sequence:
  1. User fills login form (email, password)
  2. React dispatches loginUser thunk
  3. Axios POST /auth/login
  4. FastAPI finds user by email in MongoDB
  5. FastAPI → bcrypt: verify password against stored hash
  6. If valid → create JWT, create Session, return token + user
  7. Redux stores token in state + localStorage
  8. React redirects to home page

---

## DIAGRAM 5: AI Assistant Workflow

Type: Flowchart with decision nodes
Title: "AI Restaurant Assistant — Intent-Based Chat Flow"

Start: "User sends message via ChatWidget"

Step 1: POST /ai-assistant/chat → load chat session and user preferences from MongoDB

Step 2: DECISION — "Classify intent using Gemini (temperature=0.1)"
  Possible outcomes: greeting, farewell, general_question, off_topic, restaurant_recommendation, restaurant_info, open_hours, ratings

Branch A (greeting/farewell/off_topic):
  → Generate warm conversational reply via Gemini
  → Return reply text, empty recommendations list, no restaurant cards
  → End

Branch B (general_question):
  → Call Tavily web search with user's question
  → Pass web results as context to Gemini
  → Gemini generates informative answer using web context
  → Return reply text, empty recommendations list, no restaurant cards
  → End

Branch C (restaurant_recommendation):
  → Extract filters from message using Gemini + LangChain (cuisine, city, price, dietary)
  → Merge with user's saved preferences from MongoDB
  → Query MongoDB restaurants collection with filters
  → If not enough results → supplement with Yelp Fusion API
  → Rank all candidates (rating, relevance, review count, source priority)
  → Take top 5 candidates
  → Build Tavily web search query focused on user's city (NOT stuffed with local DB names)
  → Fetch web context from Tavily
  → Build reply prompt with: user message, preferences, filters, recommendations, web context
  → Gemini generates natural conversational response (2-4 sentences, no markdown, human tone)
  → Return reply text + recommendation cards with names, ratings, reasons
  → End

Branch D (restaurant_info / open_hours / ratings):
  → Existing specialized handlers
  → Query MongoDB for specific restaurant data
  → If open_hours: check hours JSON, compute open/closed
  → If ratings: aggregate review data
  → Generate response via Gemini
  → Return reply + optional cards
  → End

All branches: Save user message and assistant message to chat_messages collection in MongoDB.

---

## DIAGRAM 6: Redux State Management

Type: Tree / Mind map diagram
Title: "Redux Store — State Architecture"

Root: "Redux Store (configureStore)"

Branch 1: "authSlice"
  State: { user: null|{id, email, display_name, role, ...}, token: null|string, isAuthenticated: boolean, loading: boolean, error: null|string }
  Thunks: loginUser, signupUser, logoutUser
  Used by: LoginPage, SignupPage, ProfilePage, ProtectedRoute, OwnerRoute, MainLayout (nav)

Branch 2: "restaurantSlice"
  State: { restaurants: [], currentRestaurant: null, loading: boolean, error: null|string, filters: {} }
  Thunks: fetchRestaurants, fetchRestaurantById, searchRestaurants
  Used by: ExplorePage, RestaurantDetailsPage, WriteReviewHubPage

Branch 3: "reviewSlice"
  State: { reviews: [], myReviews: [], loading: boolean, error: null|string, submitStatus: 'idle'|'pending'|'success'|'error' }
  Thunks: fetchReviews, createReview, updateReview, deleteReview
  Used by: RestaurantDetailsPage, WriteReviewPage
  Note: createReview handles 202 Accepted from Kafka async flow

Branch 4: "favoritesSlice"
  State: { favorites: [], loading: boolean, error: null|string }
  Thunks: fetchFavorites, addFavorite, removeFavorite
  Used by: FavoritesPage, RestaurantDetailsPage (heart icon)

Data flow pattern: Component renders → user action → dispatch(thunk) → thunk calls service function → Axios API call → backend responds → extraReducer handles fulfilled/rejected → state updates → component re-renders via useSelector

---

## DIAGRAM 7: MongoDB Collection Schema

Type: ER diagram / Schema diagram
Title: "MongoDB Collections & Relationships"

Collections with key fields and relationships:

users: { _id, email (unique), password_hash, role, display_name, phone, city, state, country, bio, avatar_url, languages, gender, is_active, created_at, updated_at }

restaurants: { _id, name, description, address_line, city, state, postal_code, country, phone, website_url, latitude, longitude, source_type, yelp_business_id, is_claimed, owner_user_id → users._id, average_rating, review_count, price_level, cuisine_tags, dietary_tags, ambiance_tags, hours, transactions, is_active, created_at, updated_at }

reviews: { _id, user_id → users._id, restaurant_id → restaurants._id, rating, body, created_at, updated_at } — unique compound index on (user_id, restaurant_id)

favorites: { _id, user_id → users._id, restaurant_id → restaurants._id, created_at } — unique compound index on (user_id, restaurant_id)

user_preferences: { _id, user_id → users._id (unique), default_city, price_level, cuisine_tags, created_at, updated_at }

user_history: { _id, user_id → users._id, restaurant_id → restaurants._id (optional), action, viewed_at }

restaurant_photos: { _id, restaurant_id → restaurants._id, photo_url, sort_order, created_at }

review_photos: { _id, review_id → reviews._id, photo_url, created_at }

restaurant_claims: { _id, user_id → users._id, restaurant_id → restaurants._id, status (pending/approved/rejected), message, admin_note, created_at, updated_at, resolved_at }

chat_sessions: { _id, user_id → users._id, title, created_at, updated_at }

chat_messages: { _id, chat_session_id → chat_sessions._id, role (user/assistant/system), content, created_at }

sessions: { _id, user_id → users._id, token (indexed), created_at, expires_at (TTL index — auto-delete after expiry) }

Relationships (arrows): users 1→many reviews, users 1→many favorites, users 1→many restaurants (as owner), restaurants 1→many reviews, restaurants 1→many photos, reviews 1→many review_photos, users 1→1 user_preferences, users 1→many chat_sessions, chat_sessions 1→many chat_messages

---

## DIAGRAM 8: Docker Compose Service Map

Type: Container diagram / Network diagram
Title: "Docker Compose — Local Development Stack"

Network: "yelp-network" (bridge)

Containers:
  1. mongodb (image: mongo:7, port: 27017, volume: mongodb_data:/data/db, healthcheck: mongosh --eval "db.runCommand('ping')")
  2. zookeeper (image: confluentinc/cp-zookeeper:7.5.0, port: 2181)
  3. kafka (image: confluentinc/cp-kafka:7.5.0, port: 9092, depends: zookeeper, env: KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181)
  4. backend (build: ./backend, port: 8000, depends: mongodb + kafka, env: MONGODB_URL, KAFKA_BOOTSTRAP_SERVERS, API keys)
  5. frontend (build: ./frontend, port: 3000→80, depends: backend, nginx proxies /api → backend:8000)

All containers on same "yelp-network". Show port mappings and dependency arrows.

---

## DIAGRAM 9: Kubernetes Cluster Layout

Type: Cluster diagram
Title: "Kubernetes Deployment — AWS EKS"

Namespace: yelp-app

Deployments:
  - mongodb (1 replica, PVC: 1Gi, Service: ClusterIP:27017)
  - zookeeper (1 replica, Service: ClusterIP:2181)
  - kafka (1 replica, Service: ClusterIP:9092)
  - backend (2 replicas, Service: ClusterIP:8000, ConfigMap + Secret)
  - frontend (2 replicas, Service: LoadBalancer:80 — external entry point)

Resources: ConfigMap "backend-config" (MONGODB_URL, KAFKA_BOOTSTRAP_SERVERS). Secret "backend-secrets" (SECRET_KEY, API keys). PVC "mongodb-pvc" (1Gi).

Traffic flow: Internet → LoadBalancer → frontend pods → backend service → backend pods → mongodb/kafka services

---

## DIAGRAM 10: JMeter Performance Test Setup

Type: Simple flow diagram
Title: "JMeter Load Testing Configuration"

Test flow per virtual user:
  Step 1: POST /auth/login → extract JWT token
  Step 2: GET /restaurants?query=pizza → with Bearer token
  Step 3: POST /restaurants/{id}/reviews → with Bearer token → expects 202

Concurrency levels: 100, 200, 300, 400, 500 concurrent users
Ramp-up: 30 seconds per level
Metrics: Average response time (ms), Throughput (req/sec), Error rate (%)

Expected graph: X-axis = concurrency level, Y-axis = average response time. Response time should increase gradually, with potential inflection point where Kafka consumer lag or MongoDB connection pool becomes bottleneck.

---

## DIAGRAM 11: Frontend Page Map & Route Structure

Type: Site map / Tree diagram
Title: "Frontend Routes & Page Hierarchy"

Public routes (no auth):
  / → HomePage
  /explore → ExplorePage
  /login → LoginPage
  /signup → SignupPage
  /owner/login → OwnerLoginPage
  /owner/signup → OwnerSignupPage
  /restaurants/:id → RestaurantDetailsPage
  /restaurants/yelp/:yelpId → RestaurantDetailsPage (Yelp source)
  /write-review → WriteReviewHubPage

Protected routes (requires JWT):
  /restaurants/new → AddRestaurantPage
  /restaurants/:id/edit → EditRestaurantPage
  /restaurants/:id/review → WriteReviewPage
  /restaurants/yelp/:yelpId/review → WriteReviewPage
  /restaurants/:id/claim → ClaimRestaurantPage
  /profile → ProfilePage
  /preferences → PreferencesPage
  /favorites → FavoritesPage
  /history → HistoryPage

Owner-only routes (requires role=owner):
  /owner → OwnerDashboardPage

Floating component (on all pages when logged in):
  ChatWidget → AI Assistant panel

---

END OF DOCUMENT.

This file should be detailed enough that pasting it into Claude, ChatGPT, Notebook LM, or any AI presentation tool produces complete professional diagrams without any additional context needed.
