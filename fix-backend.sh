#!/bin/bash

echo "========================================"
echo "Backend Container Fix Script"
echo "========================================"
echo ""

echo "Step 1: Stopping containers..."
docker-compose down

echo ""
echo "Step 2: Removing old backend image..."
docker rmi retail-ai-prediction-v2-backend 2>/dev/null || true

echo ""
echo "Step 3: Rebuilding backend with new Dockerfile..."
docker-compose build --no-cache backend

echo ""
echo "Step 4: Starting all containers..."
docker-compose up -d

echo ""
echo "Step 5: Waiting 15 seconds for startup..."
sleep 15

echo ""
echo "Step 6: Checking backend logs..."
docker logs retail-api

echo ""
echo "Step 7: Testing backend health..."
sleep 5
docker exec -it retail-api curl http://localhost:8001/health

echo ""
echo "========================================"
echo "Fix Complete!"
echo "========================================"
echo ""
echo "If you see \"status\": \"ready\" above, backend is working!"
echo "If not, run: docker logs retail-api"
echo ""
