#!/bin/sh
set -e

# Jalankan migrasi jika diaktifkan (default true pada container production)
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "Running database migrations..."
    uv run alembic upgrade head
    echo "Migrations complete."
fi

exec "$@"
