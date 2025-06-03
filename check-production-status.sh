#!/bin/bash

echo "Production Status Check"
echo "======================"
echo ""
echo "1. Checking if server is accessible..."
if ping -c 1 165.227.149.136 > /dev/null 2>&1; then
    echo "✅ Server is reachable"
else
    echo "❌ Server is not reachable"
fi

echo ""
echo "2. Checking HTTPS endpoint..."
if curl -sk -o /dev/null -w "%{http_code}" https://165.227.149.136/api/health | grep -q "200\|404"; then
    echo "✅ HTTPS is responding (Status: $(curl -sk -o /dev/null -w "%{http_code}" https://165.227.149.136/api/health))"
else
    echo "❌ HTTPS is not responding properly"
fi

echo ""
echo "3. Checking backend health endpoint..."
HEALTH_RESPONSE=$(curl -sk https://165.227.149.136/api/health 2>&1)
echo "Response: $HEALTH_RESPONSE"

echo ""
echo "4. Testing login endpoint..."
LOGIN_RESPONSE=$(curl -sk -X POST https://165.227.149.136/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@demo.etownz.com","password":"Demo2025!"}' 2>&1)
echo "Response: $LOGIN_RESPONSE"

echo ""
echo "5. GitHub Actions deployment status:"
echo "Check: https://github.com/moleary1107/etownz-grants/actions"
echo ""
echo "To manually check the server:"
echo "ssh root@165.227.149.136"
echo "cd /root/etownz-grants"
echo "docker-compose -f docker-compose.prod.yml ps"
echo "docker-compose -f docker-compose.prod.yml logs backend --tail=50"