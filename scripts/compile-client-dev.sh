#!/bin/bash
set -e

# Change directory to project root if script run from subfolder
cd "$(dirname "$0")/.."

echo "========================================="
echo "Installing client dependencies for dev mode..."
npm install --prefix client
echo "Client dev preparation completed successfully."
echo "========================================="
