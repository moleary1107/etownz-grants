#!/bin/bash

echo "Uploading .env to Production"
echo "============================"
echo ""

# Upload the .env file
echo "1. Uploading .env file to server..."
scp .env root@165.227.149.136:/root/etownz-grants/.env

echo ""
echo "2. Restarting services on server..."
ssh root@165.227.149.136 << 'EOF'
cd /root/etownz-grants

echo "Restarting Docker services..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "Waiting for services to start..."
sleep 15

echo ""
echo "Checking backend status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "Backend logs (checking database connection):"
docker-compose -f docker-compose.prod.yml logs backend --tail=30 | grep -E "(Database connected|Demo user|Error connecting|listening on)"

echo ""
echo "Creating demo users in DigitalOcean database..."
# First, let's check if the backend can connect to the database
docker-compose -f docker-compose.prod.yml exec backend node -e "
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createDemoUsers() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    // Check if demo users exist
    const checkResult = await client.query(\"SELECT COUNT(*) as count FROM users WHERE email LIKE '%demo%'\");
    console.log('Existing demo users:', checkResult.rows[0].count);
    
    if (checkResult.rows[0].count === '0') {
      console.log('Creating demo users...');
      
      // First create organizations
      await client.query(\`
        INSERT INTO organizations (id, name, email, type, size)
        VALUES 
          ('00000000-0000-0000-0000-000000000001', 'eTownz Demo Admin', 'admin@demo.etownz.com', 'government', 'small'),
          ('00000000-0000-0000-0000-000000000002', 'TechCorp Demo', 'contact@techcorp.demo', 'commercial', 'medium')
        ON CONFLICT (id) DO NOTHING
      \`);
      
      // Create at least one admin user
      const passwordHash = await bcrypt.hash('Demo2025!', 10);
      await client.query(\`
        INSERT INTO users (id, email, password_hash, name, role, organization_id)
        VALUES 
          ('00000000-0000-0000-0001-000000000001', 'admin1@demo.etownz.com', \$1, 'Admin User 1', 'admin', '00000000-0000-0000-0000-000000000001')
        ON CONFLICT (id) DO NOTHING
      \`, [passwordHash]);
      
      console.log('Demo users created successfully!');
    }
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createDemoUsers();
"

echo ""
echo "Testing login..."
sleep 5
curl -s -X POST https://165.227.149.136/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@demo.etownz.com","password":"Demo2025!"}' \
  -k | python3 -m json.tool
EOF

echo ""
echo "Done! Your .env file has been uploaded and services restarted."
echo "Try logging in at: https://grants.etownz.com/auth/login"