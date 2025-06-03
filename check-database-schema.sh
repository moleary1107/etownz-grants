#!/bin/bash

echo "Checking Database Schema"
echo "========================"
echo ""

if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
    
    echo "1. Checking users table structure..."
    psql "$DATABASE_URL" << 'SQL'
\d users
SQL

    echo ""
    echo "2. Checking organizations table structure..."
    psql "$DATABASE_URL" << 'SQL'
\d organizations
SQL

    echo ""
    echo "3. Listing all tables..."
    psql "$DATABASE_URL" << 'SQL'
\dt
SQL

    echo ""
    echo "4. Checking if we're connected to the right database..."
    psql "$DATABASE_URL" << 'SQL'
SELECT current_database(), current_user, version();
SQL

    echo ""
    echo "5. Let's check what columns the users table actually has..."
    psql "$DATABASE_URL" << 'SQL'
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
SQL

else
    echo "ERROR: .env file not found!"
fi