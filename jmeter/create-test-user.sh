#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
EMAIL="${EMAIL:-testuser@example.com}"
PASSWORD="${PASSWORD:-Test123!}"
DISPLAY_NAME="${DISPLAY_NAME:-JMeter Test User}"

echo "Ensuring test user exists at ${BASE_URL} ..."

payload=$(cat <<EOF
{"email":"${EMAIL}","password":"${PASSWORD}","display_name":"${DISPLAY_NAME}"}
EOF
)

signup_code=$(curl -s -o /tmp/jmeter_signup_body.json -w "%{http_code}" \
  -X POST "${BASE_URL}/auth/signup" \
  -H "Content-Type: application/json" \
  -d "${payload}")

if [[ "${signup_code}" == "200" || "${signup_code}" == "201" ]]; then
  echo "Created test user: ${EMAIL}"
elif [[ "${signup_code}" == "400" || "${signup_code}" == "409" ]]; then
  echo "User already exists (or duplicate): ${EMAIL}"
else
  echo "Signup failed with status ${signup_code}"
  cat /tmp/jmeter_signup_body.json || true
  exit 1
fi

login_payload=$(cat <<EOF
{"email":"${EMAIL}","password":"${PASSWORD}"}
EOF
)

login_code=$(curl -s -o /tmp/jmeter_login_body.json -w "%{http_code}" \
  -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "${login_payload}")

if [[ "${login_code}" == "200" ]]; then
  echo "Login check passed for ${EMAIL}"
else
  echo "Login check failed with status ${login_code}"
  cat /tmp/jmeter_login_body.json || true
  exit 1
fi

echo "Ready for JMeter run."
