# 🚀 Deployment Guide

Complete guide for deploying the Retail ML Forecasting System using Docker.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum
- 500MB disk space

## Quick Deploy

```bash
# 1. Clone repository
git clone <repo-url>
cd retail-ml-forecasting

# 2. Start services
docker-compose up -d

# 3. Verify deployment
docker-compose ps

# 4. Check health
curl http://localhost:8003/health

# 5. Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8003
```

## Detailed Setup

### 1. Environment Setup

```bash
# Create .env file (optional)
cat > .env << EOF
# Backend
BACKEND_PORT=8003
DATABASE_PATH=/app/converted_dataset/inventory_sales.db

# Frontend
FRONTEND_PORT=3000
VITE_API_URL=http://localhost:8003
EOF
```

### 2. Build Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend
```

### 3. Start Services

```bash
# Start in background
docker-compose up -d

# Start with logs
docker-compose up

# Start specific service
docker-compose up -d backend
```

### 4. Verify Deployment

```bash
# Check running containers
docker-compose ps

# Check backend health
curl http://localhost:8003/health

# Check frontend
curl http://localhost:3000

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Data Upload & Model Training

### First Time Setup

1. **Access Data Upload Page**
   - Go to http://localhost:3000
   - Navigate to "📤 Data Upload & Model Training"

2. **Upload Initial Data**
   - Select year, month, category
   - Upload Excel file with sales data
   - System validates and stores data

3. **Retrain Model**
   - Click "🔄 Retrain Model with Latest Data"
   - Wait 30-60 seconds for processing
   - Model updates with new data

4. **View Predictions**
   - Go to "Bulk Order Predictions"
   - See forecasts for all items

### Monthly Updates

```bash
# 1. Upload new month's data via UI
# 2. Click retrain button
# 3. Predictions update automatically
```

## Production Deployment

### Using Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml retail-ml

# Check services
docker service ls

# View logs
docker service logs retail-ml_backend
```

### Using Kubernetes

```bash
# Create namespace
kubectl create namespace retail-ml

# Deploy backend
kubectl apply -f k8s/backend.yaml -n retail-ml

# Deploy frontend
kubectl apply -f k8s/frontend.yaml -n retail-ml

# Check status
kubectl get pods -n retail-ml
```

### Using Cloud Platforms

#### AWS ECS
```bash
# Push images to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag retail-ml-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/retail-ml-backend:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/retail-ml-backend:latest

# Create ECS task definition and service
# (Use AWS Console or CLI)
```

#### Google Cloud Run
```bash
# Build and push
gcloud builds submit --tag gcr.io/<project>/retail-ml-backend

# Deploy
gcloud run deploy retail-ml-backend \
  --image gcr.io/<project>/retail-ml-backend \
  --platform managed \
  --region us-central1
```

#### Azure Container Instances
```bash
# Build and push
az acr build --registry <registry-name> --image retail-ml-backend:latest .

# Deploy
az container create \
  --resource-group <group> \
  --name retail-ml-backend \
  --image <registry>.azurecr.io/retail-ml-backend:latest
```

## Configuration

### Docker Compose Override

Create `docker-compose.override.yml` for local development:

```yaml
version: "3.9"

services:
  backend:
    environment:
      - DEBUG=true
      - LOG_LEVEL=DEBUG
    volumes:
      - ./inventory_model_secondary:/app/inventory_model_secondary
      - ./converted_dataset:/app/converted_dataset

  frontend:
    environment:
      - VITE_API_URL=http://localhost:8003
    volumes:
      - ./client/src:/app/src
```

### Environment Variables

**Backend** (docker-compose.yml):
```
HOST=0.0.0.0
PORT=8003
DATABASE_PATH=/app/converted_dataset/inventory_sales.db
PYTHONUNBUFFERED=1
```

**Frontend** (.env):
```
VITE_API_URL=http://localhost:8003
VITE_APP_NAME=Retail ML Forecasting
```

## Monitoring & Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend

# Follow with timestamps
docker-compose logs -f --timestamps backend
```

### Health Checks

```bash
# Backend health
curl http://localhost:8003/health

# Backend stats
curl http://localhost:8003/stats

# Model info
curl http://localhost:8003/model-info

# Frontend
curl http://localhost:3000
```

### Performance Monitoring

```bash
# Container stats
docker stats

# Specific container
docker stats retail-ml-backend

# Memory usage
docker ps --format "table {{.Names}}\t{{.MemUsage}}"
```

## Backup & Restore

### Backup Database

```bash
# Backup SQLite database
docker-compose exec backend cp /app/converted_dataset/inventory_sales.db /app/backup.db

# Copy to host
docker cp retail-ml-backend:/app/backup.db ./backup.db
```

### Restore Database

```bash
# Copy backup to container
docker cp ./backup.db retail-ml-backend:/app/converted_dataset/inventory_sales.db

# Restart backend
docker-compose restart backend
```

### Backup Models

```bash
# Backup trained models
docker cp retail-ml-backend:/app/inventory_model_secondary/models ./models_backup

# Restore models
docker cp ./models_backup retail-ml-backend:/app/inventory_model_secondary/models
```

## Scaling

### Horizontal Scaling

```bash
# Scale backend service (Docker Swarm)
docker service scale retail-ml_backend=3

# Scale frontend service
docker service scale retail-ml_frontend=2
```

### Resource Limits

Update `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  frontend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Troubleshooting

### Backend not starting

```bash
# Check logs
docker-compose logs backend

# Verify database exists
docker-compose exec backend ls -la /app/converted_dataset/

# Check port availability
lsof -i :8003
```

### Frontend can't connect to backend

```bash
# Check network
docker network ls
docker network inspect retail-network

# Test connectivity
docker-compose exec frontend curl http://backend:8003/health

# Check nginx config
docker-compose exec frontend cat /etc/nginx/nginx.conf
```

### High memory usage

```bash
# Check container memory
docker stats

# Reduce model cache
docker-compose exec backend python -c "import gc; gc.collect()"

# Restart service
docker-compose restart backend
```

### Database locked error

```bash
# Check database connections
docker-compose exec backend lsof /app/converted_dataset/inventory_sales.db

# Restart backend
docker-compose restart backend
```

## Maintenance

### Regular Tasks

```bash
# Daily: Check health
docker-compose exec backend curl http://localhost:8003/health

# Weekly: Backup database
docker cp retail-ml-backend:/app/converted_dataset/inventory_sales.db ./backups/db_$(date +%Y%m%d).db

# Monthly: Clean logs
docker-compose logs --tail=0 -f > /dev/null

# Quarterly: Update images
docker-compose pull
docker-compose up -d
```

### Update Deployment

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose build --no-cache

# Restart services
docker-compose up -d

# Verify
docker-compose ps
```

## Security

### Best Practices

1. **Use environment variables** for sensitive data
2. **Enable HTTPS** in production (use reverse proxy)
3. **Restrict database access** to backend only
4. **Use secrets management** (Docker Secrets, Vault)
5. **Regular backups** of database and models
6. **Monitor logs** for errors and anomalies

### SSL/TLS Setup

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

# Update nginx.conf to use HTTPS
# (See nginx.conf for example)

# Restart frontend
docker-compose restart frontend
```

## Performance Tuning

### Backend Optimization

```python
# In api_production.py
# Increase worker count
# uvicorn --workers 4 --worker-class uvicorn.workers.UvicornWorker

# Enable caching
# from functools import lru_cache
```

### Database Optimization

```sql
-- Create indexes for faster queries
CREATE INDEX idx_item_name ON inventory_sales(item_name);
CREATE INDEX idx_date ON inventory_sales(date);
CREATE INDEX idx_category ON inventory_sales(category);
```

### Frontend Optimization

```bash
# Enable gzip compression in nginx
# Add to nginx.conf:
# gzip on;
# gzip_types text/plain text/css application/json;
```

## Rollback

```bash
# Rollback to previous version
git revert HEAD

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d

# Verify
docker-compose ps
```

## Support

For deployment issues:

1. Check logs: `docker-compose logs -f`
2. Verify health: `curl http://localhost:8003/health`
3. Check resources: `docker stats`
4. Review configuration: `docker-compose config`

---

**Last Updated**: March 2026
