#!/usr/bin/env bash
# Non-GUI run: Users 100 only. Strips 200–500 thread groups from the JMX (disabling them still
# leaves ModuleControllers that fail in -n mode).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
export ROOT
python3 <<'PY'
from pathlib import Path
import os
root = Path(os.environ["ROOT"])
src = root / "yelp-load-test.jmx"
dst = root / "yelp-load-test-100only.jmx"
lines = src.read_text().splitlines(keepends=True)
# Splice: Test plan + Users 100 only; skip 200–500 (see README). Line numbers follow yelp-load-test.jmx.
out = lines[0:184] + lines[260:]
text = "".join(out).replace(
    'testname="View Results Tree" enabled="true"',
    'testname="View Results Tree" enabled="false"',
)
dst.write_text(text)
print("Wrote", dst)
PY
cd "$ROOT"
chmod +x create-test-user.sh 2>/dev/null || true
./create-test-user.sh
rm -rf results-run report-run results-run.csv
jmeter -n -t yelp-load-test-100only.jmx -l results-run.csv -e -o report-run
echo "Done. HTML report: ${ROOT}/report-run/index.html"
