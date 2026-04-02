# 🚀 Deployment Guide

## 📋 Prerequisites

- Docker & Docker Compose installed
- Git installed
- Port 80 available (or modify nginx.conf)

---

## 🔧 Quick Deploy

### 1. Clone/Pull Repository
```bash
git clone <your-repo-url>
cd <repo-name>

# Or if already cloned
git pull origin main
```

### 2. Build and Start
```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Access Application
- **URL**: http://localhost (or your server IP)
- **Backend API**: http://localhost/api
- **Health Check**: http://localhost/api/health

---

## 📦 What Gets Deployed

### Services
1. **Backend** (Python/FastAPI)
   - Port: 8001 (internal)
   - Exposed via: /api (nginx proxy)
   - ML models loaded on startup

2. **Frontend** (React/Vite)
   - Port: 5173 (internal)
   - Exposed via: / (nginx proxy)
   - Production build

3. **Nginx** (Reverse Proxy)
   - Port: 80 (external)
   - Routes:
     - `/` → Frontend
     - `/api` → Backend

### Data
- Database: `converted_dataset/inventory_sales.db`
- ML Models: `inventory_model_secondary/models/`
- Raw Data: `Raw_data_to_convert_format/` (optional)

---

## 🧪 Testing After Deployment

### 1. Health Check
```bash
curl http://localhost/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "database_connected": true
}
```

### 2. Test Predictions
```bash
curl -X POST http://localhost/api/predict-paginated?page=1&page_size=5 \
  -H "Content-Type: application/json" \
  -d '{"prediction_date": "2026-04-02"}'
```

### 3. Test Frontend
Open browser: http://localhost
- Should see dashboard
- Click "📈 Predictions"
- Should load data

---

## 🔍 Prediction Accuracy Test

### Automated Test Script
```bash
python test_predictions.py
```

This will:
1. Load test data
2. Run predictions
3. Compare with actual sales
4. Generate accuracy report

### Manual Accuracy Check
1. Open: http://localhost
2. Go to "📈 Predictions"
3. Click "📅 Predict Previous Years"
4. Select date: 2026-04-01
5. Click "View" on any product
6. Check:
   - Confidence score (should be >80% for most items)
   - Statistics match historical data
   - Trend analysis makes sense

---

## 🛠️ Troubleshooting

### Backend Not Starting
```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Models not found: Check inventory_model_secondary/models/
# - Database not found: Check converted_dataset/inventory_sales.db
# - Port conflict: Change port in docker-compose.yml
```

### Frontend Not Loading
```bash
# Check logs
docker-compose logs frontend

# Common issues:
# - Build failed: Check client/package.json
# - API connection: Check client/src/api.js (should use /api)
```

### Nginx Issues
```bash
# Check logs
docker-compose logs nginx

# Common issues:
# - Port 80 in use: Change in docker-compose.yml
# - Proxy not working: Check nginx.conf
```

---

## 🔄 Update Deployment

### Update Code
```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Update Models
```bash
# Retrain with new data
python retrain_with_new_data.py

# Restart backend
docker-compose restart backend
```

### Update Database
```bash
# Upload new data via UI
# Or replace database file
cp new_inventory_sales.db converted_dataset/inventory_sales.db
docker-compose restart backend
```

---

## 📊 Model Performance

### Current Metrics
- **Overall Accuracy**: 89.2%
- **High Confidence Items**: ~800 (80%)
- **Medium Confidence**: ~150 (15%)
- **Low Confidence**: ~50 (5%)

### Confidence Levels
- **>80%**: Reliable predictions (consistent sales)
- **60-80%**: Use with caution (moderate variation)
- **<60%**: Investigate further (high variation)

### Why Low Confidence?
1. High sales variation (seasonal, promotions)
2. New products (limited history)
3. Irregular demand (sporadic purchases)
4. Outliers (one-time events)

See **MODEL_EVALUATION_REPORT.md** for detailed analysis.

---

## 🔐 Production Considerations

### Security
- [ ] Change default ports if needed
- [ ] Add SSL/TLS (use nginx with certbot)
- [ ] Set up firewall rules
- [ ] Use environment variables for secrets
- [ ] Enable CORS properly

### Performance
- [ ] Monitor resource usage
- [ ] Set up logging (ELK stack)
- [ ] Configure auto-restart policies
- [ ] Set up health checks
- [ ] Use CDN for static assets

### Backup
- [ ] Backup database regularly
- [ ] Backup ML models
- [ ] Version control data uploads
- [ ] Set up automated backups

---

## 📝 Environment Variables

Create `.env` file (optional):
```env
# Backend
BACKEND_PORT=8001
DATABASE_PATH=converted_dataset/inventory_sales.db
MODEL_PATH=inventory_model_secondary/models

# Frontend
VITE_API_URL=/api

# Nginx
NGINX_PORT=80
```

---

## ✅ Deployment Checklist

- [ ] Git repository up to date
- [ ] Docker & Docker Compose installed
- [ ] Port 80 available
- [ ] Database file present
- [ ] ML models present
- [ ] Build successful: `docker-compose build`
- [ ] Services running: `docker-compose up -d`
- [ ] Health check passes
- [ ] Frontend loads
- [ ] Predictions work
- [ ] Accuracy tested

---

## 🎉 Success!

Your application is now deployed and ready to use!

**Access**: http://localhost (or your server IP)

**Features**:
- Dashboard with analytics
- Bulk predictions with pagination
- Previous years analysis
- Last N months analysis
- Expandable details with charts
- Confidence analysis
- Export to CSV

**Support**: See README.md for detailed documentation
