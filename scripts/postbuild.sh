#!/usr/bin/env bash
set -euo pipefail

# Build React frontend and copy to backend client folder.
FRONT_DIR="clothing-inspection-frontend"
BACK_CLIENT_DIR="clothing-inspection-backend/client"

echo "[postbuild] Installing frontend dependencies..."
pushd "$FRONT_DIR" >/dev/null
npm install --omit=dev
echo "[postbuild] Running React build..."
npm run build
popd >/dev/null

echo "[postbuild] Copying build to backend..."
rm -rf "$BACK_CLIENT_DIR/build"
mkdir -p "$BACK_CLIENT_DIR"
cp -r "$FRONT_DIR/build" "$BACK_CLIENT_DIR/"

echo "[postbuild] Done. Build located at $BACK_CLIENT_DIR/build" 