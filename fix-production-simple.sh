#!/bin/bash

echo "Simple Production Fix"
echo "===================="
echo ""

ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "1. Checking current directory..."
pwd
ls -la docker-compose.prod.yml

echo ""
echo "2. Backing up current docker-compose.prod.yml..."
cp docker-compose.prod.yml docker-compose.prod.yml.backup

echo ""
echo "3. Updating docker-compose.prod.yml to not expose Redis port..."
# Remove the Redis port mapping to avoid conflicts
sed -i '/"6379:6379"/d' docker-compose.prod.yml
sed -i '/- "6379:6379"/d' docker-compose.prod.yml
sed -i '/6379:6379/d' docker-compose.prod.yml

echo ""
echo "4. Stopping everything..."
docker-compose -f docker-compose.prod.yml down -v
docker system prune -f

echo ""
echo "5. Starting fresh..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "6. Waiting for services..."
sleep 15

echo ""
echo "7. Service status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "8. Backend health check:"
curl -s https://localhost/api/health -k | python3 -m json.tool || echo "Health check failed"

echo ""
echo "9. Creating demo user using backend API..."
# Try to create user through the backend directly
docker-compose -f docker-compose.prod.yml exec backend node -e "
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function createDemoUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Create org
    await client.query(
      \"INSERT INTO organizations (id, name, email, type, size) VALUES (\$1, \$2, \$3, \$4, \$5) ON CONFLICT (id) DO NOTHING\",
      ['00000000-0000-0000-0000-000000000001', 'eTownz Demo', 'admin@demo.etownz.com', 'government', 'small']
    );
    
    // Create user
    const hash = await bcrypt.hash('Demo2025!', 10);
    await client.query(
      \"INSERT INTO users (id, email, password_hash, name, role, organization_id) VALUES (\$1, \$2, \$3, \$4, \$5, \$6) ON CONFLICT (id) DO UPDATE SET password_hash = \$3\",
      ['00000000-0000-0000-0001-000000000001', 'admin1@demo.etownz.com', hash, 'Admin User 1', 'admin', '00000000-0000-0000-0000-000000000001']
    );
    
    console.log('Demo user created successfully');
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

createDemoUser();
"

echo ""
echo "10. Final login test..."
sleep 5
curl -s -X POST https://165.227.149.136/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@demo.etownz.com","password":"Demo2025!"}' \
  -k | python3 -m json.tool
EOF

echo ""
echo "Done! Check https://grants.etownz.com/auth/login"