#!/bin/bash

# Kill any existing processes on our ports
echo "🔄 Stopping any existing services on ports 3001, 8000, 8001, 8002, 9000..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
lsof -ti:8002 | xargs kill -9 2>/dev/null || true
lsof -ti:9000 | xargs kill -9 2>/dev/null || true

echo "🐳 Starting Docker services..."
docker-compose down 2>/dev/null || true
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 10

echo "🔍 Checking service status..."
docker-compose ps

echo "✅ Development environment ready!"
echo "📱 Frontend: http://localhost:3001"
echo "🔧 Backend API: http://localhost:3001"
echo "📚 API Docs: http://localhost:3001/docs"
echo "🕷️ Crawler: http://localhost:8001"
echo "🤖 AI Pipeline: http://localhost:8002"
echo "📝 MCP Docs: http://localhost:9000"