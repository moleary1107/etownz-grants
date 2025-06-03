#!/bin/bash

echo "Fixing Production Port Conflicts"
echo "================================"
echo ""

ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "1. Checking what's using port 6379 (Redis)..."
sudo lsof -i :6379 || sudo netstat -tulpn | grep 6379 || echo "No port info available"

echo ""
echo "2. Stopping all Docker containers..."
docker-compose -f docker-compose.prod.yml down
docker ps -a | grep -E "redis|6379" | awk '{print $1}' | xargs -r docker stop
docker ps -a | grep -E "redis|6379" | awk '{print $1}' | xargs -r docker rm

echo ""
echo "3. Killing any process using port 6379..."
sudo fuser -k 6379/tcp 2>/dev/null || echo "No process killed"

echo ""
echo "4. Checking docker-compose.prod.yml Redis configuration..."
grep -A5 -B5 "redis:" docker-compose.prod.yml

echo ""
echo "5. Starting services with modified Redis config..."
# Start without Redis first to see if that's the only issue
docker-compose -f docker-compose.prod.yml up -d postgres frontend backend

echo ""
echo "6. Waiting for services to stabilize..."
sleep 10

echo ""
echo "7. Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "8. Checking backend logs..."
docker-compose -f docker-compose.prod.yml logs backend --tail=20

echo ""
echo "9. Creating demo users directly in DigitalOcean database..."
# Get DATABASE_URL from .env
if [ -f .env ]; then
    export $(cat .env | grep DATABASE_URL | xargs)
    
    # Use psql directly to create demo user
    docker run --rm -e PGPASSWORD=$POSTGRES_PASSWORD postgres:15 psql "$DATABASE_URL" << 'SQL'
-- Create organization first
INSERT INTO organizations (id, name, email, type, size)
VALUES ('00000000-0000-0000-0000-000000000001', 'eTownz Demo Admin', 'admin@demo.etownz.com', 'government', 'small')
ON CONFLICT (id) DO NOTHING;

-- Create admin user with bcrypt hash for 'Demo2025!'
INSERT INTO users (id, email, password_hash, name, role, organization_id)
VALUES (
    '00000000-0000-0000-0001-000000000001', 
    'admin1@demo.etownz.com', 
    '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6', 
    'Admin User 1', 
    'admin', 
    '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO UPDATE SET 
    password_hash = '$2b$10$8KJZKbrRrtW1YQwYBnV5M.iY9L4Ct2qRCCBpILtJdCGXdhMEOpSG6',
    name = 'Admin User 1',
    role = 'admin';

-- Verify user was created
SELECT email, role, name FROM users WHERE email = 'admin1@demo.etownz.com';
SQL
fi

echo ""
echo "10. Testing login..."
curl -s -X POST https://165.227.149.136/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@demo.etownz.com","password":"Demo2025!"}' \
  -k | python3 -m json.tool
EOF