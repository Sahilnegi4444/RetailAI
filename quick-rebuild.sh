#!/bin/bash
echo "Quick rebuild - fixing module import issue..."
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d
echo "Waiting 20 seconds..."
sleep 20
echo ""
echo "Checking logs..."
docker logs retail-api
echo ""
echo "Testing health..."
docker exec -it retail-api curl http://localhost:8001/health
