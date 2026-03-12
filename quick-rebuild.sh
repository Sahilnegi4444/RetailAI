#!/bin/bash
echo "=========================================="
echo "Quick Rebuild - Optimized Build Process"
echo "=========================================="
echo ""
echo "Stopping containers..."
docker-compose down
echo ""
echo "Building backend (optimized with cache)..."
echo "This should take 20-40 seconds if only code changed"
echo ""
time docker-compose build backend
echo ""
echo "Starting containers..."
docker-compose up -d
echo ""
echo "Waiting 20 seconds for startup..."
sleep 20
echo ""
echo "Checking logs..."
docker logs retail-api --tail=30
echo ""
echo "Testing health..."
docker exec -it retail-api curl http://localhost:8001/health
echo ""
echo "=========================================="
echo "Done! Check output above for any errors"
echo "=========================================="
