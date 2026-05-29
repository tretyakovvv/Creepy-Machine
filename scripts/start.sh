#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Copy .env.example to .env and fill in your keys."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting Creepy Machine at http://localhost:${PORT:-3000}"
npm start
