#!/bin/bash
set -e

# Change directory to project root if script run from subfolder
cd "$(dirname "$0")/.."

# Clear any previous traps
trap - INT TERM EXIT

echo "========================================="
echo "Building and starting Whist local production environment..."
echo "========================================="

# 1. Compile backend release
if command -v rebar3 &> /dev/null; then
    echo "Rebuilding Erlang backend release..."
    rebar3 release
else
    echo "rebar3 not found, skipping compile. Trying to run existing build..."
fi

# 2. Stop the backend if it was running from a previous crash
_build/default/rel/whist/bin/whist stop || true

# 3. Start the Erlang backend release in daemon mode
echo "Starting Erlang backend daemon..."
_build/default/rel/whist/bin/whist daemon

# 4. Set up cleanup trap to stop backend on script termination
cleanup() {
    trap - INT TERM EXIT
    echo ""
    echo "[Clean] Stopping Erlang backend..."
    _build/default/rel/whist/bin/whist stop || true
    echo "[Clean] Whist local production stopped."
}
trap cleanup INT TERM EXIT

# 5. Build client for production
echo "Compiling client production assets..."
VITE_WS_URL=ws://127.0.0.1:8080 npm run build --prefix client

# 6. Preview the production build
echo "Starting Vite client preview server..."
echo "Open your browser at the URL shown below."
echo "Press Ctrl+C to stop both client and backend daemon."
echo "-----------------------------------------"

npm run preview --prefix client -- --host 127.0.0.1
