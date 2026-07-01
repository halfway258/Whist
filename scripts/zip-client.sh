#!/bin/bash
set -e

# Change directory to project root if script run from subfolder
cd "$(dirname "$0")/.."

echo "========================================="
echo "Building client assets for production..."
npm run build --prefix client

echo "Packaging assets into client/client-prod.zip..."
cd client/dist
zip -r ../client-prod.zip *

echo "Client packaged into client/client-prod.zip successfully."
echo "========================================="
