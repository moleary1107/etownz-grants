#!/bin/bash

echo "Manual Production Deployment Script"
echo "==================================="
echo ""
echo "This script will help you manually deploy to production"
echo ""

# Server details
SERVER_IP="165.227.149.136"
SERVER_USER="root"

echo "1. Testing SSH connection to $SERVER_IP..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes $SERVER_USER@$SERVER_IP "echo 'SSH connection successful'" 2>/dev/null; then
    echo "✅ SSH connection successful"
else
    echo "❌ SSH connection failed"
    echo ""
    echo "To fix SSH access:"
    echo "1. Make sure you can SSH manually: ssh $SERVER_USER@$SERVER_IP"
    echo "2. If that works, your local SSH key is set up correctly"
    exit 1
fi

echo ""
echo "2. Deploying to production..."
echo ""

# Run deployment commands
ssh $SERVER_USER@$SERVER_IP << 'EOF'
echo "Connected to server. Starting deployment..."
cd /root/etownz-grants

echo ""
echo "Pulling latest code..."
git pull origin main

echo ""
echo "Current commit:"
git log --oneline -1

echo ""
echo "Making deploy script executable..."
chmod +x deploy.sh

echo ""
echo "Running deployment..."
./deploy.sh

echo ""
echo "Deployment complete! Checking status..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "Checking if demo users exist..."
docker-compose -f docker-compose.prod.yml exec db psql -U postgres etownz_grants -c "SELECT COUNT(*) as demo_user_count FROM users WHERE email LIKE '%demo%';" 2>/dev/null || echo "Could not check demo users"

echo ""
echo "Backend logs (last 20 lines):"
docker-compose -f docker-compose.prod.yml logs backend --tail=20
EOF

echo ""
echo "3. Testing login functionality..."
echo ""

# Test a demo user login
curl -s -X POST https://$SERVER_IP/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@demo.etownz.com","password":"Demo2025!"}' \
  -k | python3 -m json.tool 2>/dev/null || echo "Login test failed"

echo ""
echo "Deployment process complete!"
echo ""
echo "To check the application:"
echo "- Visit: https://grants.etownz.com/auth/login"
echo "- Use demo credentials:"
echo "  Email: admin1@demo.etownz.com"
echo "  Password: Demo2025!"