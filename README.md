# Yelp Discovery App — Lab 2

Distributed restaurant discovery platform with microservice-style FastAPI services, Kafka-backed async write flows, MongoDB persistence, Redux state management, Docker packaging, Kubernetes deployment manifests, and JMeter load testing assets.

## What is included

- `backend/`: FastAPI API services, Kafka producers/consumers, worker services, MongoDB models, and business logic
- `frontend/`: React app with Redux Toolkit store/slices and service integrations
- `k8s/`: Kubernetes manifests for EKS-style deployment (namespace, services, deployments, config/secret wiring)
- `docker-compose.yml`: Local multi-service stack (frontend, backend services, workers, MongoDB, Zookeeper, Kafka)
- `jmeter/`: Load-test plans and helper scripts for concurrency testing
- `docs/`: API/architecture documentation including the architecture visual guide

## Run locally (quick start)

1. Copy and update environment values:
   - `.env.example` for root compose variables
   - `backend/.env` for backend/local development secrets
2. Start all services:
   - `docker compose up --build`
3. Access:
   - Frontend: `http://localhost:3000`
   - Backend health: `http://localhost:8000/health`

## Notes

- Write-heavy operations are routed through Kafka topics and worker consumers.
- Read paths are direct from API services to MongoDB.
- Keep secrets in environment variables; do not commit local `.env` files.
