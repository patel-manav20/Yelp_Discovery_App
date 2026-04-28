#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="yelp-app"
IMAGE_TAG="${IMAGE_TAG:-v1.0.0}"

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

kubectl config current-context >/dev/null

require_env SECRET_KEY
require_env YELP_API_KEY
require_env GEMINI_API_KEY
require_env TAVILY_API_KEY

kubectl apply -f "${ROOT_DIR}/namespace.yaml"

kubectl apply -f "${ROOT_DIR}/mongodb/pvc.yaml"
kubectl apply -f "${ROOT_DIR}/mongodb/deployment.yaml"
kubectl apply -f "${ROOT_DIR}/mongodb/service.yaml"

kubectl apply -f "${ROOT_DIR}/zookeeper/deployment.yaml"
kubectl apply -f "${ROOT_DIR}/zookeeper/service.yaml"

kubectl apply -f "${ROOT_DIR}/kafka/deployment.yaml"
kubectl apply -f "${ROOT_DIR}/kafka/service.yaml"

kubectl apply -f "${ROOT_DIR}/backend/configmap.yaml"
kubectl -n "${NAMESPACE}" create secret generic backend-secrets \
  --from-literal=SECRET_KEY="${SECRET_KEY}" \
  --from-literal=YELP_API_KEY="${YELP_API_KEY}" \
  --from-literal=GEMINI_API_KEY="${GEMINI_API_KEY}" \
  --from-literal=TAVILY_API_KEY="${TAVILY_API_KEY}" \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f "${ROOT_DIR}/backend/uploads-pvc.yaml"
kubectl apply -f "${ROOT_DIR}/backend/deployment.yaml"
kubectl apply -f "${ROOT_DIR}/backend/service.yaml"

kubectl apply -f "${ROOT_DIR}/user-reviewer/deployment.yaml"
kubectl apply -f "${ROOT_DIR}/user-reviewer/service.yaml"

kubectl apply -f "${ROOT_DIR}/restaurant-owner/deployment.yaml"
kubectl apply -f "${ROOT_DIR}/restaurant-owner/service.yaml"

kubectl apply -f "${ROOT_DIR}/restaurant-service/deployment.yaml"
kubectl apply -f "${ROOT_DIR}/restaurant-service/service.yaml"

kubectl apply -f "${ROOT_DIR}/review-service/deployment.yaml"
kubectl apply -f "${ROOT_DIR}/review-service/service.yaml"

kubectl apply -f "${ROOT_DIR}/user-worker/deployment.yaml"
kubectl apply -f "${ROOT_DIR}/restaurant-worker/deployment.yaml"
kubectl apply -f "${ROOT_DIR}/review-worker/deployment.yaml"

kubectl apply -f "${ROOT_DIR}/frontend/deployment.yaml"
kubectl apply -f "${ROOT_DIR}/frontend/service.yaml"

echo "Kubernetes manifests applied successfully (image tag: ${IMAGE_TAG})."
