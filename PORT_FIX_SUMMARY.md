# Port Configuration Fix - Server Deployment

## Issue
The server at `72.60.204.211:5015` was running with backend port **8001**, but the codebase was configured for port **8003**, causing graphs and API calls to fail.

## Root Cause
- **docker-compose.yml**: Backend port set to 8001 ✓
- **Dockerfile.backend**: Backend port set to 8003 ✗ (MISMATCH)
- **nginx.conf**: Proxying to backend:8003 ✗ (MISMATCH)
- **API Services**: Configured for localhost:8003 ✗ (MISMATCH)

## Changes Made

### 1. Dockerfile.backend
- Changed `PORT=8003` → `PORT=8001`
- Changed `EXPOSE 8003` → `EXPOSE 8001`
- Changed healthcheck from `localhost:8003` → `localhost:8001`
- Changed uvicorn port from `--port 8003` → `--port 8001`

### 2. nginx.conf
- Changed proxy_pass from `http://backend:8003/` → `http://backend:8001/`

### 3. client/src/services/analyticsService.js
- Changed localhost URL from `http://localhost:8003` → `http://localhost:8001`

### 4. client/src/services/predictionService.js
- Changed localhost URL from `http://localhost:8003` → `http://localhost:8001`

### 5. client/src/api.js
- Changed localhost URL from `http://localhost:8003` → `http://localhost:8001`

## Deployment Steps

On server `72.60.204.211`:

```bash
cd ~/Retail-AI-Prediction-v2

# Pull latest changes
git pull

# Rebuild containers with new port configuration
docker-compose build --no-cache

# Stop old containers
docker-compose down

# Start new containers
docker-compose up -d

# Verify containers are running
docker ps

# Check logs
docker-compose logs -f
```

## Verification

After deployment, verify:

1. **Frontend loads**: http://72.60.204.211:5015/
2. **Backend health**: Check container logs for "Application startup complete"
3. **Graphs render**: Dashboard, Analytics, and BulkPrediction pages should show data
4. **API calls work**: Open browser console (F12) and check for successful API requests

## Port Summary

| Component | Port | Location |
|-----------|------|----------|
| Frontend (Nginx) | 5015 | External (0.0.0.0:5015) |
| Backend (FastAPI) | 8001 | Internal (backend:8001) |
| Nginx → Backend | 8001 | Internal proxy |
| Local Dev | 8001 | http://localhost:8001 |

## Notes

- All API calls now use `/api/` proxy through nginx in Docker
- Local development uses `http://localhost:8001` directly
- Smart URL detection in API services handles both environments automatically
- No code changes needed when switching between local and Docker deployment
