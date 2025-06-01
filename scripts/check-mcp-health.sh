#!/bin/bash

# MCP Servers Health Check Script
echo "🏥 eTownz Grants MCP Health Check"
echo "================================="

# Function to check service health
check_service() {
    local name=$1
    local port=$2
    local container=$3
    
    printf "%-20s" "$name:"
    
    # Check if container is running
    if docker ps --format "{{.Names}}" | grep -q "$container"; then
        # Check if port is responding
        if curl -s --connect-timeout 2 "http://localhost:$port" > /dev/null 2>&1; then
            echo "✅ Running & Responding"
        else
            echo "⚠️  Container up, port not responding"
        fi
    else
        echo "❌ Container not running"
    fi
}

# Check each MCP server
check_service "Documentation" "9000" "etownz_grants-mcp-docs-1"
check_service "Fetch Server" "9001" "etownz_grants-mcp-fetch-1" 
check_service "Filesystem" "9002" "etownz_grants-mcp-filesystem-1"
check_service "Doc Processor" "9003" "etownz_grants-mcp-document-processor-1"

echo ""
echo "📊 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep mcp || echo "No MCP containers running"

echo ""
echo "💡 To start all MCP servers: ./scripts/start-mcp-servers.sh"
echo "💡 To view logs: docker compose logs -f [service-name]"