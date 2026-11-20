#!/usr/bin/env bash
# Usage : scripts/smoke.sh https://mon-app.example
set -euo pipefail
URL="${1:?usage: smoke.sh URL}"
curl -fsS "$URL/api/health" | grep -q '"ok":true' && echo "API ok"
curl -fsS -o /dev/null -w "WEB %{http_code} en %{time_total}s\n" "$URL/"
curl -fsS "$URL/api/items" > /dev/null && echo "items ok"
