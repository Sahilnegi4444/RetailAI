# VPS Deployment Checklist

Use this checklist to deploy and verify your Retail Prediction WebApp on VPS.

## Pre-Deployment

- [ ] VPS has Docker and Docker Compose installed
- [ ] Port 5015 is available (not used by other services)
- [ ] Git is installed on VPS
- [ ] You have SSH access to VPS

## Deployment Steps

### 1. Clone Repository
```bash
cd ~
git clone https://github.com/your-username/Retail-AI-Prediction-v2.git
cd Retail-AI-Prediction-v2
```
- [ ] Repository cloned successfully
- [ ] Changed to project directory

### 2. Verify Files
```bash
ls -la
```
Check for these files:
- [ ] `docker-compose.yml`
- [ ] `Dockerfile.backend`
- [ ] `Dockerfile.frontend`
- [ ] `nginx.conf`
- [ ] `requirements.txt`

### 3. Build and Start (First Time)
```bash
docker-compose build
docker-compose up -d
```
- [ ] Build completed without errors
- [ ] All 3 containers started

### 4. Wait for Startup
```bash
sleep 30
```
- [ ] Waited 30 seconds for data loading

### 5. Check Container Status
```bash
docker ps
```
Expected output:
```
CONTAINER ID   IMAGE                              STATUS
xxxxx          retail-ai-prediction-v2-nginx      Up X seconds (healthy)
xxxxx          retail-ai-prediction-v2-frontend   Up X seconds
xxxxx          retail-ai-prediction-v2-backend    Up X seconds (healthy)
```
- [ ] All 3 containers are "Up"
- [ ] Backend shows "(healthy)" status

### 6. Check Backend Logs
```bash
docker logs retail-api
```
Expected to see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8001
🔧 [CONFIG] Starting API Server
✅ Loaded 3328 items from business data
```
- [ ] Logs show uvicorn started
- [ ] Data loaded successfully
- [ ] No error messages

### 7. Test Backend Health
```bash
docker exec -it retail-api curl http://localhost:8001/health
```
Expected: `{"status":"ready","message":"API ready for predictions"}`
- [ ] Health check returns "ready"

### 8. Test API Through Nginx
```bash
curl http://localhost:5015/api/health
```
Expected: Same as above
- [ ] Nginx proxy working

### 9. Test Frontend
```bash
curl -I http://localhost:5015/
```
Expected: `HTTP/1.1 200 OK`
- [ ] Frontend accessible

### 10. Open in Browser
Open: `http://your-vps-ip:5015`
- [ ] Dashboard loads
- [ ] No blank white page
- [ ] Can see sidebar with navigation
- [ ] Can navigate to Bulk Prediction page

### 11. Test Predictions
1. Go to Bulk Prediction page
2. Select category (Grocery/Liquor)
3. Choose date
4. Click "Generate Predictions"
- [ ] Predictions load successfully
- [ ] Can see items with status
- [ ] Can click "Explain" for details

## Troubleshooting (If Any Step Fails)

### Backend Not Starting
If step 6 shows empty logs or step 7 fails:

```bash
# Run the fix
chmod +x fix-backend.sh
./fix-backend.sh
```
- [ ] Fix script completed
- [ ] Repeat steps 5-11

### Frontend Blank Page
If step 10 shows blank page:

```bash
# Check frontend logs
docker logs retail-web

# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up -d
```
- [ ] Frontend rebuilt
- [ ] Repeat steps 9-11

### Nginx Not Responding
If step 8 or 9 fails:

```bash
# Check nginx logs
docker logs retail-nginx

# Restart nginx
docker-compose restart nginx
```
- [ ] Nginx restarted
- [ ] Repeat steps 8-11

## Post-Deployment

### Security
- [ ] Configure firewall to allow port 5015
- [ ] Set up SSL certificate (optional but recommended)
- [ ] Change default passwords (if any)

### Monitoring
- [ ] Set up log rotation for nginx logs
- [ ] Configure health check monitoring
- [ ] Set up backup schedule

### Documentation
- [ ] Note down VPS IP address: `___________________`
- [ ] Note down access URL: `http://___________________:5015`
- [ ] Save admin credentials securely

## Maintenance Commands

### View Logs
```bash
docker logs retail-api          # Backend logs
docker logs retail-web          # Frontend logs
docker logs retail-nginx        # Nginx logs
docker-compose logs -f          # All logs (follow mode)
```

### Restart Services
```bash
docker-compose restart          # Restart all
docker-compose restart backend  # Restart backend only
```

### Update Application
```bash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Stop Application
```bash
docker-compose down
```

### Start Application
```bash
docker-compose up -d
```

## Success Criteria

All these should be ✅:
- [ ] All 3 containers running and healthy
- [ ] Backend API responding on port 8001
- [ ] Frontend accessible on port 5015
- [ ] Dashboard loads with data
- [ ] Predictions work correctly
- [ ] No errors in logs
- [ ] Application accessible from external IP

## Support Files

If you encounter issues, refer to:
- **VPS-BACKEND-FIX-SUMMARY.md** - Backend troubleshooting
- **BACKEND-FIX-README.md** - Detailed backend guide
- **QUICK-FIX.txt** - One-liner fix commands
- **vps-deployment-guide.md** - Complete deployment guide
- **diagnose.sh** - Diagnostic script

## Quick Reference

**Application URL**: `http://your-vps-ip:5015`
**API Health**: `http://your-vps-ip:5015/api/health`
**API Docs**: `http://your-vps-ip:5015/api/docs`

**Container Names**:
- Backend: `retail-api`
- Frontend: `retail-web`
- Nginx: `retail-nginx`

**Ports**:
- External: 5015 (nginx)
- Internal: 8001 (backend), 5173 (frontend)

---

**Deployment Date**: ___________________
**Deployed By**: ___________________
**VPS IP**: ___________________
**Status**: ___________________
