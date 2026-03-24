# ✅ Deployment Checklist

Complete checklist for deploying Retail ML Forecasting System.

## Pre-Deployment

- [ ] Code reviewed and tested locally
- [ ] All dependencies in requirements.txt
- [ ] Environment variables documented
- [ ] Database backup created
- [ ] Models trained and saved
- [ ] Frontend build tested
- [ ] API endpoints verified

## Docker Setup

- [ ] Docker installed (version 20.10+)
- [ ] Docker Compose installed (version 2.0+)
- [ ] .dockerignore file present
- [ ] Dockerfile.backend reviewed
- [ ] Dockerfile.frontend reviewed
- [ ] docker-compose.yml configured
- [ ] Resource limits set appropriately

## Build & Test

- [ ] Backend image builds successfully
  ```bash
  docker-compose build backend
  ```
- [ ] Frontend image builds successfully
  ```bash
  docker-compose build frontend
  ```
- [ ] Images tagged correctly
- [ ] Image sizes reasonable (< 500MB each)
- [ ] No build warnings or errors

## Deployment

- [ ] Services start without errors
  ```bash
  docker-compose up -d
  ```
- [ ] All containers running
  ```bash
  docker-compose ps
  ```
- [ ] Backend health check passes
  ```bash
  curl http://localhost:8003/health
  ```
- [ ] Frontend accessible
  ```bash
  curl http://localhost:3000
  ```
- [ ] Network connectivity verified
- [ ] Volume mounts working correctly

## Data & Models

- [ ] Database file exists
  ```bash
  docker-compose exec backend ls -la /app/converted_dataset/
  ```
- [ ] Models loaded successfully
  ```bash
  docker-compose exec backend ls -la /app/inventory_model_secondary/models/
  ```
- [ ] Sample data uploaded
- [ ] Model retraining works
- [ ] Predictions generating correctly

## Functionality Testing

### Data Upload
- [ ] Upload page loads
- [ ] File selection works
- [ ] Year/month/category selection works
- [ ] Upload button functional
- [ ] Success message appears
- [ ] Data stored in database

### Model Retraining
- [ ] Retrain button visible
- [ ] Retraining starts
- [ ] Progress indicator shows
- [ ] Retraining completes (30-60s)
- [ ] Success message appears
- [ ] Predictions update

### Predictions
- [ ] Bulk Predictions page loads
- [ ] All items display
- [ ] Predictions show values (not NaN)
- [ ] Filters work (category, search)
- [ ] Sorting works
- [ ] Expanded details show

### Dashboard
- [ ] Dashboard loads
- [ ] Summary cards display
- [ ] Year-wise chart shows
- [ ] Category chart shows
- [ ] Top items chart shows
- [ ] All data is dynamic

### Analytics
- [ ] Analytics page loads
- [ ] Item selector works
- [ ] Yearly trend chart shows
- [ ] Monthly pattern chart shows
- [ ] Seasonal factors chart shows
- [ ] Insights display correctly

### Database
- [ ] Database page loads
- [ ] All items listed
- [ ] Statistics display
- [ ] Search works
- [ ] Pagination works

## Performance

- [ ] Backend response time < 2s
- [ ] Frontend load time < 3s
- [ ] Charts render smoothly
- [ ] No memory leaks
- [ ] CPU usage reasonable
- [ ] Database queries optimized

## Monitoring & Logs

- [ ] Logs accessible
  ```bash
  docker-compose logs -f
  ```
- [ ] No error messages
- [ ] No warning messages
- [ ] Health checks passing
- [ ] Metrics available

## Security

- [ ] CORS configured correctly
- [ ] No sensitive data in logs
- [ ] Database access restricted
- [ ] API authentication ready (if needed)
- [ ] HTTPS configured (if production)
- [ ] Secrets not in code

## Backup & Recovery

- [ ] Database backup created
  ```bash
  docker cp retail-ml-backend:/app/converted_dataset/inventory_sales.db ./backup.db
  ```
- [ ] Models backup created
- [ ] Backup location documented
- [ ] Restore procedure tested
- [ ] Recovery time acceptable

## Documentation

- [ ] README.md complete
- [ ] DEPLOYMENT.md complete
- [ ] API documentation updated
- [ ] Configuration documented
- [ ] Troubleshooting guide created
- [ ] Team trained on deployment

## Post-Deployment

- [ ] Monitor for 24 hours
- [ ] Check logs regularly
- [ ] Verify data integrity
- [ ] Test all features
- [ ] Get user feedback
- [ ] Document any issues
- [ ] Create runbook for operations

## Rollback Plan

- [ ] Previous version tagged
- [ ] Rollback procedure documented
- [ ] Rollback tested
- [ ] Team knows rollback steps
- [ ] Communication plan ready

## Sign-Off

- [ ] Development Lead: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______
- [ ] DevOps Lead: _________________ Date: _______
- [ ] Product Owner: _________________ Date: _______

## Notes

```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Environment**: _______________
