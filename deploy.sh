#!/bin/bash

# Retail ML System - Docker Deployment Script
# This script builds and deploys the entire system using Docker

set -e

echo "=========================================="
echo "Retail ML System - Docker Deployment"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed"
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Remove old images (optional - uncomment to force rebuild)
# echo "🗑️  Removing old images..."
# docker-compose rm -f
# docker rmi retail-ml-backend retail-ml-frontend 2>/dev/null || true

# Build images
echo ""
echo "🔨 Building Docker images..."
docker-compose build --no-cache

# Start containers
echo ""
echo "🚀 Starting containers..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check backend health
echo ""
echo "🔍 Checking backend health..."
for i in {1..30}; do
    if curl -f http://localhost:8003/health &>/dev/null; then
        echo "✅ Backend is healthy!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend health check failed"
        echo "Check logs with: docker-compose logs backend"
        exit 1
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

# Check frontend
echo ""
echo "🔍 Checking frontend..."
if curl -f http://localhost:3000 &>/dev/null; then
    echo "✅ Frontend is accessible!"
else
    echo "⚠️  Frontend may not be ready yet"
fi

# Show status
echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "📊 Services:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8003"
echo "   API Docs: http://localhost:8003/docs"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop: docker-compose down"
echo "   Restart: docker-compose restart"
echo "   Status: docker-compose ps"
echo ""
echo "🎉 System is ready to use!"
echo ""
