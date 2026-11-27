#!/usr/bin/env bash
# Chạy kiểm thử E2E trên CSDL và thư mục tệp riêng (không đụng dữ liệu demo).
set -euo pipefail
cd "$(dirname "$0")/.."
export DATABASE_URL="file:../data/e2e.db"
export UPLOAD_DIR="./data/uploads-e2e"
export DEMO_PASSWORD="${DEMO_PASSWORD:-demo-stem-2026}"
export PORT=3100 BASE_URL="http://localhost:3100"
export INSECURE_COOKIES=1
rm -f data/e2e.db data/e2e.db-journal; rm -rf data/uploads-e2e
npx prisma migrate deploy >/dev/null
npx tsx prisma/seed.ts >/dev/null
[ -d .next ] || npm run build
./node_modules/.bin/next start -p "$PORT" >/tmp/e2e-server.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true; pkill -f "next-server" 2>/dev/null || true' EXIT
for i in $(seq 1 40); do curl -sf "$BASE_URL/login" >/dev/null && break; sleep 0.5; done
npx tsx scripts/e2e.ts
