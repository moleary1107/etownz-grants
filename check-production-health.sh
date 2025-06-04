#!/bin/bash

echo "Production Health Check"
echo "====================="
echo ""

# Use production URLs with timeout
echo "1. Testing authentication endpoint..."
if curl -s -m 5 -X POST https://grants.etownz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etownz.com","password":"admin123"}' | grep -q "token"; then
    echo "✅ Authentication working"
else
    echo "❌ Authentication failed"
fi

echo ""
echo "2. Testing health endpoint..."
if curl -s -m 5 https://grants.etownz.com/api/health | grep -q "ok"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
fi

echo ""
echo "3. Testing grants API..."
if curl -s -m 5 https://grants.etownz.com/api/grants | grep -q "grants"; then
    echo "✅ Grants API working"
else
    echo "❌ Grants API failed"
fi

echo ""
echo "4. Testing frontend..."
if curl -s -m 5 -I https://grants.etownz.com | grep -q "200"; then
    echo "✅ Frontend responding"
else
    echo "❌ Frontend not responding"
fi

echo ""
echo "5. Testing login redirect..."
if curl -s -m 5 -I https://grants.etownz.com/login | grep -i "location.*auth/login"; then
    echo "✅ Login redirect working"
else
    echo "❌ Login redirect not working"
fi
