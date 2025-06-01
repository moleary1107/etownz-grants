#!/bin/bash

# MCP Servers Startup Script for eTownz Grants
set -e

echo "🚀 Starting eTownz Grants MCP Servers..."

# Change to project directory
cd "$(dirname "$0")/.."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start core infrastructure first
echo "🔧 Starting core infrastructure..."
docker compose up -d postgres redis

# Wait for core services to be ready
echo "⏳ Waiting for core services to be ready..."
sleep 5

# Build and start MCP servers
echo "🏗️ Building MCP servers..."

# Build only the working ones for now
echo "📦 Building MCP Documentation server..."
cd mcp-servers/documentation
npm install --silent
cd ../..

echo "📦 Building MCP Fetch server..."
cd mcp-servers/fetch
npm install --silent && npm run build --silent
cd ../..

echo "📦 Building MCP Filesystem server..."
cd mcp-servers/filesystem
npm install --silent && npm run build --silent
cd ../..

echo "📦 Building MCP Document Processor..."
cd mcp-servers/document-processor
npm install --silent && npm run build --silent
cd ../..

# Start MCP servers
echo "🚀 Starting MCP servers..."
docker compose up -d mcp-docs mcp-fetch mcp-filesystem mcp-document-processor

# Check status
echo "📊 MCP Server Status:"
sleep 3
docker compose ps mcp-docs mcp-fetch mcp-filesystem mcp-document-processor

# Display service URLs
echo ""
echo "🌐 MCP Service URLs:"
echo "  📚 Documentation: http://localhost:9000"
echo "  🔍 Fetch Server:  http://localhost:9001" 
echo "  📁 Filesystem:    http://localhost:9002"
echo "  📄 Doc Processor: http://localhost:9003"

echo ""
echo "✅ MCP servers startup complete!"
echo "💡 To check logs: docker compose logs -f mcp-docs"
echo "💡 To restart: docker compose restart mcp-docs"