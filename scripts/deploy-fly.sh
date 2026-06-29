#!/bin/bash
set -e

# Change directory to project root if script run from subfolder
cd "$(dirname "$0")/.."

echo "========================================="
echo "Deploying server to Fly.io..."
if command -v fly &> /dev/null; then
    fly deploy --depot=false
elif command -v flyctl &> /dev/null; then
    flyctl deploy --depot=false
else
    echo "ERROR: flyctl CLI is not installed or not in PATH."
    exit 1
fi
echo "========================================="
