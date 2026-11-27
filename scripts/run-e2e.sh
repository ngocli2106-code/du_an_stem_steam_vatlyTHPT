#!/usr/bin/env bash
# Chạy kiểm thử E2E trên một CSDL Postgres riêng (không đụng dữ liệu demo).
#   E2E_DATABASE_URL=postgresql://user@host:port/stem_e2e npm run test:e2e
# CSDL sẽ bị XOÁ SẠCH trước khi chạy, nên tên CSDL bắt buộc chứa "e2e" hoặc "test".
set -euo pipefail
cd "$(dirname "$0")/.."
: "${E2E_DATABASE_URL:?Đặt E2E_DATABASE_URL tới một CSDL Postgres dành riêng cho kiểm thử}"
DBNAME="${E2E_DATABASE_URL##*/}"; DBNAME="${DBNAME%%\?*}"
case "$DBNAME" in *e2e*|*test*) ;; *) echo "Từ chối: tên CSDL '$DBNAME' không chứa 'e2e' hoặc 'test'." >&2; exit 1;; esac
export DATABASE_URL="$E2E_DATABASE_URL" DATABASE_URL_UNPOOLED="$E2E_DATABASE_URL"
export STORAGE_DRIVER=local UPLOAD_DIR="./data/uploads-e2e"
export DEMO_PASSWORD="${E2E_DEMO_PASSWORD:-demo-stem-2026}"
export PORT=3100 BASE_URL="http://localhost:3100" INSECURE_COOKIES=1
rm -rf data/uploads-e2e
echo 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;' | npx prisma db execute --stdin --url "$DATABASE_URL" >/dev/null
npx prisma migrate deploy >/dev/null
NODE_ENV=development npx tsx prisma/seed.ts >/dev/null
[ -d .next ] || npm run build
./node_modules/.bin/next start -p "$PORT" >/tmp/e2e-server.log 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true; pkill -f "next-server" 2>/dev/null || true' EXIT
for i in $(seq 1 40); do curl -sf "$BASE_URL/login" >/dev/null && break; sleep 0.5; done
npx tsx scripts/e2e.ts
