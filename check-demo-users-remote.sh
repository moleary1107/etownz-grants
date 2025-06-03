#!/bin/bash

echo "Checking Demo Users on Production"
echo "================================="
echo ""

SERVER="root@165.227.149.136"

echo "Connecting to server and checking database..."
echo ""

ssh $SERVER << 'EOF'
cd /root/etownz-grants

echo "1. Checking if demo users exist in database:"
docker-compose -f docker-compose.prod.yml exec db psql -U postgres etownz_grants << 'SQL'
SELECT 
    email, 
    role, 
    CASE WHEN password_hash IS NOT NULL THEN 'Has Password' ELSE 'No Password' END as password_status,
    created_at::date as created_date
FROM users 
WHERE email LIKE '%demo%'
ORDER BY role, email;
SQL

echo ""
echo "2. Total demo users:"
docker-compose -f docker-compose.prod.yml exec db psql -U postgres etownz_grants -t -c "SELECT COUNT(*) FROM users WHERE email LIKE '%demo%';"

echo ""
echo "3. Checking backend logs for demo user attempts:"
docker-compose -f docker-compose.prod.yml logs backend --tail=50 | grep -i "demo\|fallback" || echo "No demo user login attempts found in recent logs"

echo ""
echo "4. Checking current backend environment:"
docker-compose -f docker-compose.prod.yml exec backend printenv | grep -E "NODE_ENV|DATABASE_URL" | sed 's/DATABASE_URL=.*/DATABASE_URL=<hidden>/'
EOF