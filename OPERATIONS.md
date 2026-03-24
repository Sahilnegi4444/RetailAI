# 🔧 Operations Guide

Quick reference for common operational tasks.

## Daily Operations

### Start Services
```bash
docker-compose up -d
```

### Check Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 50 lines
docker-compose logs --tail=50 backend
```

### Health Check
```bash
# Backend
curl http://localhost:8003/health

# Frontend
curl http://localhost:3000

# Database stats
curl http://localhost:8003/stats
```

## Data Management

### Upload Data
1. Go to http://localhost:3000
2. Navigate to "📤 Data Upload & Model Training"
3. Select year, month, category
4. Upload Excel file
5. Click "Upload Data"

### Retrain Model
1. After uploading data
2. Click "🔄 Retrain Model with Latest Data"
3. Wait 30-60 seconds
4. Verify success message

### Backup Database
```bash
# Create backup
docker cp retail-ml-backend:/app/converted_dataset/inventory_sales.db ./backup_$(date +%Y%m%d_%H%M%S).db

# List backups
ls -lh backup_*.db
```

### Restore Database
```bash
# Stop backend
docker-compose stop backend

# Restore backup
docker cp ./backup_20260324_120000.db retail-ml-backend:/app/converted_dataset/inventory_sales.db

# Start backend
docker-compose start backend
```

## Troubleshooting

### Backend Not Responding

```bash
# Check logs
docker-compose logs backend

# Check if running
docker-compose ps backend

# Restart
docker-compose restart backend

# Check health
curl http://localhost:8003/health
```

### Frontend Can't Connect

```bash
# Check backend is running
docker-compose ps backend

# Test connectivity
docker-compose exec frontend curl http://backend:8003/health

# Check nginx config
docker-compose exec frontend cat /etc/nginx/nginx.conf

# Restart frontend
docker-compose restart frontend
```

### High Memory Usage

```bash
# Check memory
docker stats

# Identify container
docker stats --no-stream

# Restart service
docker-compose restart backend
```

### Database Locked

```bash
# Check connections
docker-compose exec backend lsof /app/converted_dataset/inventory_sales.db

# Restart backend
docker-compose restart backend
```

### Predictions are NaN

```bash
# Check data uploaded
curl http://localhost:8003/data-preview?limit=5

# Check model info
curl http://localhost:8003/model-info

# Retrain model
# (Use UI or API)
```

## Maintenance

### Weekly Tasks

```bash
# Check disk space
docker exec retail-ml-backend df -h

# Verify backups
ls -lh backup_*.db

# Check logs for errors
docker-compose logs backend | grep ERROR
```

### Monthly Tasks

```bash
# Update images
docker-compose pull

# Rebuild if needed
docker-compose build --no-cache

# Restart services
docker-compose up -d

# Verify
docker-compose ps
```

### Quarterly Tasks

```bash
# Clean up old backups
find . -name "backup_*.db" -mtime +90 -delete

# Optimize database
docker-compose exec backend sqlite3 /app/converted_dataset/inventory_sales.db "VACUUM;"

# Check model performance
curl http://localhost:8003/model-info
```

## Performance Tuning

### Increase Backend Resources

Edit `docker-compose.yml`:
```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '4'
        memory: 4G
```

Then restart:
```bash
docker-compose up -d
```

### Enable Caching

Add to backend environment:
```yaml
backend:
  environment:
    - CACHE_ENABLED=true
    - CACHE_TTL=3600
```

### Database Optimization

```bash
# Create indexes
docker-compose exec backend sqlite3 /app/converted_dataset/inventory_sales.db << EOF
CREATE INDEX IF NOT EXISTS idx_item_name ON inventory_sales(item_name);
CREATE INDEX IF NOT EXISTS idx_date ON inventory_sales(date);
CREATE INDEX IF NOT EXISTS idx_category ON inventory_sales(category);
EOF
```

## Monitoring

### Real-time Monitoring

```bash
# Watch container stats
watch -n 1 'docker stats --no-stream'

# Watch logs
docker-compose logs -f --timestamps
```

### Log Analysis

```bash
# Count errors
docker-compose logs backend | grep ERROR | wc -l

# Find slow requests
docker-compose logs backend | grep "duration"

# Check upload activity
docker-compose logs backend | grep UPLOAD
```

## Scaling

### Horizontal Scaling (Docker Swarm)

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml retail-ml

# Scale backend
docker service scale retail-ml_backend=3

# Check services
docker service ls
```

### Vertical Scaling

Increase resources in `docker-compose.yml`:
```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '4'
        memory: 4G
```

## Disaster Recovery

### Complete Restore

```bash
# 1. Stop services
docker-compose down

# 2. Remove volumes
docker volume rm retail-ml-forecasting_backend_data

# 3. Restore database
docker cp ./backup.db retail-ml-backend:/app/converted_dataset/inventory_sales.db

# 4. Start services
docker-compose up -d

# 5. Verify
docker-compose ps
curl http://localhost:8003/health
```

### Partial Restore (Database Only)

```bash
# 1. Stop backend
docker-compose stop backend

# 2. Restore database
docker cp ./backup.db retail-ml-backend:/app/converted_dataset/inventory_sales.db

# 3. Start backend
docker-compose start backend

# 4. Verify
curl http://localhost:8003/health
```

## API Testing

### Test Upload Endpoint

```bash
curl -X POST http://localhost:8003/upload-data \
  -F "file=@sales_data.xlsx"
```

### Test Predict Endpoint

```bash
curl -X POST http://localhost:8003/predict \
  -H "Content-Type: application/json" \
  -d '{"prediction_date": "2026-03-24"}'
```

### Test Retrain Endpoint

```bash
curl -X POST http://localhost:8003/retrain
```

### Test Analytics Endpoint

```bash
curl http://localhost:8003/analytics/item/BISC.PARLE%20G%20100GMS
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Backend won't start | Check logs: `docker-compose logs backend` |
| Frontend blank page | Check browser console, verify API URL |
| Predictions are NaN | Upload data and retrain model |
| High memory usage | Restart backend: `docker-compose restart backend` |
| Database locked | Restart backend: `docker-compose restart backend` |
| Slow predictions | Check database indexes, optimize queries |
| Upload fails | Verify Excel format, check file size |
| Model won't retrain | Check data quality, verify database connection |

## Emergency Procedures

### Emergency Stop

```bash
docker-compose down
```

### Emergency Restart

```bash
docker-compose restart
```

### Emergency Rollback

```bash
# Stop current version
docker-compose down

# Restore backup
docker cp ./backup.db retail-ml-backend:/app/converted_dataset/inventory_sales.db

# Start previous version
git checkout <previous-tag>
docker-compose up -d
```

## Contact & Support

- **Backend Issues**: Check logs, verify database
- **Frontend Issues**: Check browser console, verify API connection
- **Data Issues**: Verify Excel format, check data quality
- **Performance Issues**: Check resources, optimize queries

---

**Last Updated**: March 2026
