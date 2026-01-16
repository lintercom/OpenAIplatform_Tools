#!/bin/bash
# Start Architect Script
# Spustí Architect API a UI v samostatných terminálech

echo "🚀 Starting Architect..."

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed!"
    echo "Please install pnpm first:"
    echo "  npm install -g pnpm"
    exit 1
fi

# Start API in background
echo "Starting Architect API..."
cd apps/architect-api
pnpm dev &
API_PID=$!

# Wait a bit
sleep 2

# Start UI in background
echo "Starting Architect UI..."
cd ../architect-ui
pnpm dev &
UI_PID=$!

# Wait a bit
sleep 3

echo ""
echo "✅ Architect is starting!"
echo ""
echo "API: http://localhost:3001"
echo "UI:  http://localhost:5174"
echo ""
echo "Open http://localhost:5174 in your browser"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "kill $API_PID $UI_PID; exit" INT TERM
wait
