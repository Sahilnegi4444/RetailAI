# 🚀 Server Deployment Guide - Port 5015

Complete guide for deploying on your server at `http://72.60.204.211:5015/`

## ✅ Configuration Updated

### Port Mapping
- **Frontend (Nginx)**: Port 5015 (external) → Port 80 (container)
- **Backend (FastAPI)**: Port 8003 (internal, not exposed)
- **API Proxy**: `/api/` routes to backend:8003

### Updated docker-compose.yml
```yaml
frontend:
  ports:
    - "5015:80"  # Changed from 3000:80 to 5015:80
```

## 🎯 How It Works

```
User Browser
    ↓
http://72.60.204.211:5015/
    ↓
Nginx (Port 5015)
    ├─ Serves React build (/)
    └─ Proxies API calls (/api/) → Backend:8003
    ↓
Backend (Port 8003, internal only)
    ├─ Database
    └─ ML Models
```

## 📋 Deployment Steps

### 1. Pull Latest Code
```bash
cd /path/to/retail-ml-forecasting
git pull origin main
```

### 2. Rebuild Docker Images
```bash
docker-compose build --no-cache
```

### 3. Stop Old Containers (if running)
```bash
docker-compose down
```

### 4. Start New Containers
```bash
docker-compose up -d
```

### 5. Verify Deployment
```bash
# Check containers
docker-compose ps

# Check frontend
curl http://localhost:5015

# Check backend health
curl http://localhost:8003/health

# View logs
docker-compose logs -f frontend
docker-compose logs -f backend
```

## 🌐 Access Points

### Frontend
- **Local**: http://localhost:5015
- **Server**: http://72.60.204.211:5015/
- **Nginx serves**: React build from `/usr/share/nginx/html`

### Backend API
- **Internal**: http://backend:8003 (from nginx)
- **Not exposed externally** (secure)
- **Proxied through**: http://72.60.204.211:5015/api/

### API Endpoints
```
Frontend → Nginx → Backend

GET  http://72.60.204.211:5015/api/stats
GET  http://72.60.204.211:5015/api/all_items
POST http://72.60.204.211:5015/api/predict
POST http://72.60.204.211:5015/api/upload-data
POST http://72.60.204.211:5015/api/retrain
```

## 🔧 Configuration Files

### docker-compose.yml
```yaml
frontend:
  ports:
    - "5015:80"  # Port 5015 on server → Port 80 in container
```

### nginx.conf
```nginx
server {
    listen 80;  # Listens on port 80 inside container
    root /usr/share/nginx/html;
    
    location / {
        try_files $uri $uri/ /index.html;  # React routing
    }
    
    location /api/ {
        proxy_pass http://backend:8003/;  # Proxy to backend
    }
}
```

### Dockerfile.frontend
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY client/package*.json ./
RUN npm ci --only=production
COPY client/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📊 Data Flow

### Frontend Request
```
Browser: GET http://72.60.204.211:5015/
    ↓
Nginx: Serves /usr/share/nginx/html/index.html
    ↓
React App Loads
```

### API Request
```
React App: GET /api/stats
    ↓
Nginx: Proxies to http://backend:8003/stats
    ↓
Backend: Returns data
    ↓
Nginx: Returns to React App
```

## ✅ Verification Checklist

- [ ] docker-compose.yml updated (port 5015)
- [ ] Images rebuilt: `docker-compose build --no-cache`
- [ ] Containers running: `docker-compose ps`
- [ ] Frontend accessible: `http://72.60.204.211:5015/`
- [ ] Backend health: `curl http://localhost:8003/health`
- [ ] API working: Check browser console for API calls
- [ ] No errors in logs: `docker-compose logs`

## 🐛 Troubleshooting

### Frontend shows Nginx default page
```bash
# Check if React build exists
docker exec retail-ml-frontend ls -la /usr/share/nginx/html

# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### API calls failing
```bash
# Check backend is running
docker-compose ps backend

# Check backend health
curl http://localhost:8003/health

# Check nginx proxy config
docker exec retail-ml-frontend cat /etc/nginx/nginx.conf
```

### Port already in use
```bash
# Find process using port 5015
lsof -i :5015

# Kill process
kill -9 <PID>

# Or use different port in docker-compose.yml
# Change: "5015:80" to "5016:80"
```

### Containers won't start
```bash
# Check logs
docker-compose logs frontend
docker-compose logs backend

# Remove old containers
docker-compose down -v

# Rebuild and start
docker-compose build --no-cache
docker-compose up -d
```

## 📈 Performance Monitoring

### Check Container Stats
```bash
docker stats
```

### View Logs
```bash
# Frontend logs
docker-compose logs -f frontend

# Backend logs
docker-compose logs -f backend

# All logs
docker-compose logs -f
```

### Check Disk Space
```bash
docker system df
```

## 🔐 Security Notes

- ✅ Backend not exposed externally (only through nginx proxy)
- ✅ API calls go through nginx (can add authentication)
- ✅ Database only accessible from backend
- ✅ CORS configured for all origins (can be restricted)

## 🚀 Production Checklist

- [ ] Port 5015 is open on firewall
- [ ] SSL/TLS certificate configured (if needed)
- [ ] Database backups scheduled
- [ ] Monitoring set up
- [ ] Logs rotated
- [ ] Resource limits configured
- [ ] Health checks enabled
- [ ] Restart policy set to `unless-stopped`

## 📝 Quick Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and restart
docker-compose build --no-cache && docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Restart specific service
docker-compose restart frontend
docker-compose restart backend

# View resource usage
docker stats

# Clean up
docker-compose down -v
docker system prune -a
```

## 🎯 Access URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://72.60.204.211:5015/ | React App |
| Backend Health | http://localhost:8003/health | Health Check |
| Backend Stats | http://localhost:8003/stats | Database Stats |
| API Proxy | http://72.60.204.211:5015/api/ | API Calls |

## 📞 Support

If issues occur:
1. Check logs: `docker-compose logs -f`
2. Verify containers: `docker-compose ps`
3. Test connectivity: `curl http://localhost:5015`
4. Check backend: `curl http://localhost:8003/health`

---

**Status**: ✅ Ready for Deployment
**Port**: 5015
**Server**: 72.60.204.211
**Date**: March 2026
