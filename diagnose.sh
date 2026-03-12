#!/bin/bash

echo "========================================"
echo "Retail Prediction WebApp - Diagnostics"
echo "========================================"
echo ""

echo "1. Checking Docker installation..."
docker --version
docker-compose --version
echo ""

echo "2. Checking running containers..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "3. Checking container health..."
docker inspect retail-api --format='{{.State.Health.Status}}' 2>/dev/null || echo "Container not running or no health check"
echo ""

echo "4. Checking backend logs (last 20 lines)..."
echo "---"
docker logs retail-api --tail=20 2>&1
echo "---"
echo ""

echo "5. Checking if backend is listening on port 8001..."
docker exec retail-api netstat -tuln 2>/dev/null | grep 8001 || echo "Port 8001 not listening or netstat not available"
echo ""

echo "6. Testing backend health endpoint..."
docker exec retail-api curl -s http://localhost:8001/health 2>&1 || echo "Health check failed"
echo ""

echo "7. Checking nginx logs (last 10 lines)..."
echo "---"
docker logs retail-nginx --tail=10 2>&1
echo "---"
echo ""

echo "8. Testing API through nginx..."
curl -s http://localhost:5015/api/health 2>&1 || echo "Nginx proxy failed"
echo ""

echo "9. Checking Dockerfile CMD..."
echo "Current CMD in Dockerfile.backend:"
grep "^CMD" Dockerfile.backend
echo ""

echo "10. Checking running processes in backend container..."
docker exec retail-api ps aux 2>&1 | head -10 || echo "ps command not available"
echo ""

echo "========================================"
echo "Diagnostic Summary"
echo "========================================"
echo ""

# Check if backend is healthy
if docker exec retail-api curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ Backend is HEALTHY and responding"
else
    echo "❌ Backend is NOT responding"
    echo ""
    echo "Recommended fix:"
    echo "  1. Run: ./fix-backend.sh"
    echo "  2. Or manually: docker-compose down && docker-compose build --no-cache backend && docker-compose up -d"
fi

echo ""
echo "For detailed troubleshooting, see: BACKEND-FIX-README.md"
echo ""
