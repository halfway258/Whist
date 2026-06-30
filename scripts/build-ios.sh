#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "Building client for mobile..."
npm run build:mobile

echo "Syncing Capacitor for iOS..."
npx cap sync ios

echo "========================================="
echo "iOS project synced."
echo "You can open the project in Xcode to build:"
echo "  open ios/App/App.xcworkspace"
echo "========================================="

if command -v xcodebuild &> /dev/null; then
    echo "xcodebuild found, attempting to build..."
    cd ios/App
    xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug build
fi
