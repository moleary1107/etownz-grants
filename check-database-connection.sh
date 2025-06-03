#!/bin/bash

echo "Checking Database Configuration"
echo "==============================="
echo ""

# Check local .env
echo "1. Local .env DATABASE_URL:"
grep DATABASE_URL .env | sed 's/PASSWORD=[^@]*/PASSWORD=***/'

echo ""
echo "2. Checking what database the backend is actually using on production..."
ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "Production .env DATABASE_URL:"
grep DATABASE_URL .env | sed 's/PASSWORD=[^@]*/PASSWORD=***/' || echo "No DATABASE_URL in .env"

echo ""
echo "Backend environment DATABASE_URL:"
docker exec root-backend-1 printenv DATABASE_URL | sed 's/AVNS_[^@]*/AVNS_***/' || echo "Not set"

echo ""
echo "Let's check if there's a different database we should be using:"
docker exec root-backend-1 printenv | grep -E "DB_|DATABASE" | sed 's/PASSWORD=[^@]*/PASSWORD=***/'
EOF

echo ""
echo "3. It looks like we might be connected to the wrong database."
echo "   The schema doesn't match what the code expects."
echo ""
echo "Options:"
echo "a) This might be a shared/demo database that uses OAuth only"
echo "b) We need to create the proper schema with password_hash column"
echo "c) The backend code needs to be updated to work with this schema"