#!/bin/bash

# Terminate execution if any step fails
set -e

# Clear any previous traps
trap - INT TERM EXIT

echo "========================================="
echo "Building and starting Whist Game System..."
echo "========================================="

# Build the Erlang backend release if rebar3 is available
if command -v rebar3 &> /dev/null; then
    echo "[1/3] Rebuilding Erlang backend release..."
    rebar3 release
else
    echo "[1/3] rebar3 not found. Using pre-compiled release with packaged ERTS..."
fi

# Ensure the backend is stopped if it was running from a previous crash
_build/default/rel/whist/bin/whist stop || true

# Start the Erlang backend release
echo "[2/3] Starting Erlang backend daemon..."
_build/default/rel/whist/bin/whist daemon

# Set up cleanup trap to stop backend on script termination
cleanup() {
    trap - INT TERM EXIT
    echo ""
    echo "[Clean] Stopping Erlang backend..."
    _build/default/rel/whist/bin/whist stop || true
    echo "[Clean] Whist Game System stopped."
}
trap cleanup INT TERM EXIT

# Start the frontend client
echo "[3/3] Starting client application..."
echo "Open your browser at the URL shown below."
echo "Press Ctrl+C to terminate both client and backend."
echo "-----------------------------------------"

# Start Vite dev server in the foreground
npm run dev --prefix client -- --host 127.0.0.1
