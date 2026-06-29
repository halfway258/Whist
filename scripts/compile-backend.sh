#!/bin/bash
set -e

# Change directory to project root if script run from subfolder
cd "$(dirname "$0")/.."

echo "========================================="
# Build the Erlang backend release if rebar3 is available
if command -v rebar3 &> /dev/null; then
    echo "Rebuilding Erlang backend release..."
    rebar3 release
else
    echo "ERROR: rebar3 is not installed or not in PATH."
    exit 1
fi
echo "Backend release compiled successfully."
echo "========================================="
