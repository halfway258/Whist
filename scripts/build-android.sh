#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "Building client for mobile..."
npm run build:mobile

echo "Syncing Capacitor for Android..."
npx cap sync android

echo "Building Android APK..."
cd android
./gradlew assembleDebug

echo "========================================="
echo "Done! APK is located in android/app/build/outputs/apk/debug/app-debug.apk"
echo "========================================="
