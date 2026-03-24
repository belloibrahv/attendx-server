#!/bin/bash

echo "AttendX Database Setup"
echo "======================="
echo ""

DB_NAME="${DB_NAME:-attendx}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"

echo "Creating database '$DB_NAME'..."
createdb -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "Database '$DB_NAME' created successfully!"
else
    echo "Database already exists or creation failed (check PostgreSQL is running)"
fi

echo ""
echo "Running migrations..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f src/migrations/001_initial.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "Setup complete! You can now start the server with: npm run dev"
else
    echo ""
    echo "Migration failed. Please check your database configuration."
fi
