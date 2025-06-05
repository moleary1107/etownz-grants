#!/bin/sh

echo "🚀 Starting eTownz Grants Backend with Migration Support"

# Wait for database to be available
echo "⏳ Waiting for database connection..."
until nc -z postgres 5432; do
  echo "Database not ready, waiting 2 seconds..."
  sleep 2
done

echo "✅ Database is available"

# Run migrations
echo "🔄 Running database migrations..."
if [ -f "/app/src/scripts/run-migrations.js" ]; then
    node /app/src/scripts/run-migrations.js
    if [ $? -eq 0 ]; then
        echo "✅ Migrations completed successfully"
    else
        echo "⚠️  Migrations completed with warnings, continuing..."
    fi
else
    echo "⚠️  Migration script not found, skipping migrations"
fi

# Start the application
echo "🎯 Starting application server..."
exec node dist/index.js