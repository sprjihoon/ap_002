#!/usr/bin/env bash
# Build React frontend and copy build to backend client directory.
set -euo pipefail

FRONT_DIR="clothing-inspection-frontend"
BACK_CLIENT_DIR="clothing-inspection-backend/client"

# 1. Install deps and build React app
pushd "$FRONT_DIR" >/dev/null
npm install
npm run build
popd >/dev/null

# 2. Copy build output
rm -rf "$BACK_CLIENT_DIR/build"
mkdir -p "$BACK_CLIENT_DIR"
cp -r "$FRONT_DIR/build" "$BACK_CLIENT_DIR/"

echo "✅ React build copied to $BACK_CLIENT_DIR/build" 