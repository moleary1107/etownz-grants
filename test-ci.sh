#!/bin/bash

# Simple CI test script that doesn't require running services
echo "=== CI/CD Test Suite ==="
echo ""

# 1. Check file structure
echo "1. Checking project structure..."
for dir in frontend backend infrastructure scripts; do
    if [ -d "$dir" ]; then
        echo "✅ $dir directory exists"
    else
        echo "❌ $dir directory missing"
    fi
done

# 2. Check critical files
echo ""
echo "2. Checking critical files..."
for file in docker-compose.yml docker-compose.prod.yml README.md; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

# 3. Check environment example
echo ""
echo "3. Checking environment setup..."
if [ -f ".env.example" ]; then
    echo "✅ .env.example exists"
else
    echo "⚠️  .env.example missing (not critical for CI)"
fi

echo ""
echo "=== CI Tests Complete ==="
