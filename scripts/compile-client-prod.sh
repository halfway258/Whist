#!/bin/bash
set -e

# Change directory to project root if script run from subfolder
cd "$(dirname "$0")/.."

echo "========================================="
echo "Building client assets for production..."
npm run build --prefix client
echo "Client production compilation completed successfully."
echo "========================================="
