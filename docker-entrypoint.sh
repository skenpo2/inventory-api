#!/bin/sh
# Runs before the API starts. Migrations belong here, not in the Dockerfile:
# the database only exists at run time.
set -e

echo "[entrypoint] applying migrations..."
npx prisma migrate deploy

if [ "$RUN_SEED" = "true" ]; then
  echo "[entrypoint] seeding..."
  node dist/prisma/seed.js
fi

echo "[entrypoint] starting API on port ${PORT:-5000}"
exec "$@"
