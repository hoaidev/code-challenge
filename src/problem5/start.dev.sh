#!/bin/bash

echo "Starting application"

# Start postgres and redis if not already running
if ! docker compose ps --status running 2>/dev/null | grep -q "problem5"; then
  echo "Starting postgresql and redis services..."
  docker compose up -d
else
  echo "Postgresql and redis services already running."
fi

# Start backend app
bun run start:dev

# If not Bun, must use
# npm start:dev