#!/bin/bash

echo "Fixing Production Environment Variables"
echo "======================================"
echo ""

SERVER="root@165.227.149.136"

echo "1. Checking current .env file on server..."
ssh $SERVER << 'EOF'
cd /root/etownz-grants
echo "Current directory: $(pwd)"
echo ""
echo "Checking for .env file:"
if [ -f .env ]; then
    echo "✅ .env file exists"
    echo "File size: $(wc -c < .env) bytes"
else
    echo "❌ .env file NOT FOUND"
fi

echo ""
echo "Checking for .env.production:"
if [ -f .env.production ]; then
    echo "✅ .env.production file exists"
    echo "File size: $(wc -c < .env.production) bytes"
else
    echo "❌ .env.production file NOT FOUND"
fi

echo ""
echo "Current docker-compose command in deploy.sh:"
grep "docker-compose" deploy.sh | head -5
EOF

echo ""
echo "2. Would you like to:"
echo "   a) Upload your local .env file to production"
echo "   b) Check why the existing .env isn't being used"
echo "   c) Exit"
echo ""
read -p "Enter your choice (a/b/c): " choice

case $choice in
    a)
        echo ""
        echo "Uploading local .env file to production..."
        if [ -f .env ]; then
            scp .env $SERVER:/root/etownz-grants/.env
            echo "✅ .env file uploaded"
            
            echo ""
            echo "Restarting services with environment variables..."
            ssh $SERVER << 'EOF'
cd /root/etownz-grants
# Make sure deploy.sh uses the .env file
if ! grep -q "env_file:" docker-compose.prod.yml; then
    echo "Note: docker-compose.prod.yml may need to be updated to use .env file"
fi

# Restart services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "Waiting for services to start..."
sleep 10

echo ""
echo "Checking if backend can connect to database:"
docker-compose -f docker-compose.prod.yml logs backend --tail=20 | grep -E "(Database|Connected|Error|error)"
EOF
        else
            echo "❌ No .env file found locally!"
            echo "Please create a .env file first"
        fi
        ;;
    b)
        echo ""
        echo "Checking Docker Compose configuration..."
        ssh $SERVER << 'EOF'
cd /root/etownz-grants
echo "Docker Compose version:"
docker-compose version

echo ""
echo "Checking if docker-compose.prod.yml references .env:"
grep -n "env_file\|\.env" docker-compose.prod.yml || echo "No .env references found"

echo ""
echo "Checking current backend environment:"
docker-compose -f docker-compose.prod.yml exec backend printenv | grep -E "DATABASE_URL|NODE_ENV|JWT_SECRET" | head -5
EOF
        ;;
    c)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "3. Testing the fix..."
echo ""
ssh $SERVER << 'EOF'
cd /root/etownz-grants

# Check if demo users exist in the DigitalOcean managed database
echo "Attempting to connect to DigitalOcean database directly..."
if [ -f .env ]; then
    source .env
    if [ ! -z "$DATABASE_URL" ]; then
        echo "DATABASE_URL is set"
        # Try to connect and check users
        docker-compose -f docker-compose.prod.yml exec backend node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query('SELECT COUNT(*) as count FROM users WHERE email LIKE $1', ['%demo%']))
  .then(result => {
    console.log('Demo users in database:', result.rows[0].count);
    return client.end();
  })
  .catch(err => {
    console.error('Database error:', err.message);
    client.end();
  });
" 2>/dev/null || echo "Could not check database"
    else
        echo "DATABASE_URL is not set in .env"
    fi
else
    echo ".env file not found"
fi

echo ""
echo "Testing login endpoint:"
curl -s -X POST https://165.227.149.136/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@demo.etownz.com","password":"Demo2025!"}' \
  -k | python3 -m json.tool || echo "Login test failed"
EOF