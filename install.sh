#!/bin/bash

# Terminate execution if any step fails
set -e

echo "========================================="
echo "Installing Whist Game System Dependencies..."
echo "========================================="

# 1. Check for Node.js and npm
echo "[1/3] Checking Node.js and npm..."
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    echo "Please install Node.js (v18+) and npm before running this script."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed."
    echo "Please install npm before running this script."
    exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo "Found Node.js: $NODE_VERSION"
echo "Found npm: $NPM_VERSION"

# 2. Install client web dependencies
echo "[2/3] Installing client web dependencies..."
npm install --prefix client

# 3. Build backend release to ensure it compiles
echo "[3/3] Performing initial backend compilation..."
if command -v rebar3 &> /dev/null; then
    rebar3 release
else
    echo "Notice: rebar3 not found on system path."
    echo "The production release is already compiled and contains its own packaged ERTS,"
    echo "so you can run it directly using the run script."
fi

echo "-----------------------------------------"
echo "Installation complete!"
echo "You can now run the game system using:"
echo "  ./run.sh"
echo "========================================="
