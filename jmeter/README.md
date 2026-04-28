# Yelp Discovery JMeter Load Test

This folder contains an Apache JMeter test plan for Lab 2:

- `yelp-load-test.jmx`
- `create-test-user.sh`

## Prerequisites

- Apache JMeter `5.6+` installed and available in `PATH`
- Yelp Discovery backend running at `http://localhost:8000`
- Docker stack/services healthy (if using Docker Compose)

## 1) Create test user first

Run:

```bash
cd jmeter
chmod +x create-test-user.sh
./create-test-user.sh
```

The load test login step uses:

- email: `testuser@example.com`
- password: `Test123!`

## 2) Run the load test (non-GUI)

From the `jmeter/` directory:

```bash
jmeter -n -t yelp-load-test.jmx -l results.csv -e -o report/
```

## 3) Generate HTML report from existing results

If you already have `results.csv`:

```bash
jmeter -g results.csv -o report/
```

Open:

- `report/index.html`

## Test coverage in this plan

Each thread group runs these API calls in sequence:

1. `POST /auth/login` (extracts `$.access_token` into `${token}`)
2. `GET /restaurants?query=pizza&city=San+Jose` with `Authorization: Bearer ${token}`
3. `POST /reviews` with `Authorization: Bearer ${token}` (expects `202`)
   - Uses `restaurant_id` extracted from search response (`$.items[0].id`)

Thread groups included:

- 100 users
- 200 users
- 300 users
- 400 users
- 500 users

Each uses:

- Ramp-up: `30` seconds
- Loop count: `1`

Listeners included:

- Summary Report
- Aggregate Report
- View Results Tree
- Response Time Graph

## Metrics to focus on

- **Average response time** (overall and per endpoint)
- **Throughput** (requests/sec)
- **Error rate** (failed requests and assertion failures)
- **Percentiles** (p90/p95/p99 in HTML dashboard)

