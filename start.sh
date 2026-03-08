#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:-both}"

if [[ "$MODE" != "slack" && "$MODE" != "discord" && "$MODE" != "both" ]]; then
  echo "Usage: ./start.sh [slack|discord|both]"
  echo "  slack    — API + Slack app"
  echo "  discord  — API + Discord bot"
  echo "  both     — API + Discord bot + Slack app (default)"
  exit 1
fi

echo "==> Starting Postgres..."
cd "$ROOT/api" && docker compose up -d

echo "==> Starting Rails API..."
cd "$ROOT/api"
rm -f tmp/pids/server.pid
bin/rails server -p 3001 -d
echo "    Rails running on port 3001"

echo "==> Starting deposit poller..."
cd "$ROOT/bot"
node src/poller.js &
PIDS+=($!)
echo "    Deposit poller running (PID ${PIDS[-1]})"

if [[ "$MODE" == "discord" || "$MODE" == "both" ]]; then
  echo "==> Starting Discord bot..."
  cd "$ROOT/bot"
  node src/index.js &
  PIDS+=($!)
  echo "    Discord bot running (PID ${PIDS[-1]})"
fi

if [[ "$MODE" == "slack" || "$MODE" == "both" ]]; then
  echo "==> Starting ngrok tunnel..."
  ngrok http 3002 &
  PIDS+=($!)
  sleep 2
  NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "    ngrok tunnel: $NGROK_URL"

  echo "==> Starting Slack app..."
  cd "$ROOT/slack"
  node src/index.js &
  PIDS+=($!)
  echo "    Slack app running on port 3002 (PID ${PIDS[-1]})"
fi

echo ""
echo "All services started. To stop Node processes: kill ${PIDS[*]}"
