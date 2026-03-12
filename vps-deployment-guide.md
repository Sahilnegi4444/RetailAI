# Retail Prediction WebApp - VPS Deployment Guide

## 📋 Application Overview
- **Application Name**: Retail Prediction webApp
- **External Port**: 5015
- **Internal Architecture**: 3-container Docker setup
- **Access URL**: http://your-vps-ip:5015

## 🚀 Quick Start Deployment

### Prerequisites
1. **Windows VPS** with:
   - Docker Desktop installed
   - At least 4GB RAM
   - 20GB free disk space
   - Windows Server 2019/2022 or Windows 10/11

2. **Network Requirements**:
   - Port 5015 open in firewall
   - Outbound internet access for package downloads

### Step-by-Step Deployment

#### Step 1: Prepare Your VPS
```powershell
# 1. Install Docker Desktop (if not already installed)
# Download from: https://www.docker.com/products/docker-desktop/

# 2. Start Docker Desktop
# Launch from Start Menu or run:
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# 3. Verify Docker is running
docker --version
docker-compose --version
```

#### Step 2: Deploy the Application
```powershell
# 1. Copy your project files to VPS
# Use FTP, SCP, or Git to transfer files

# 2. Run the deployment script
.\deploy-vps.bat

# OR manually:
docker-compose down
docker-compose build
docker-compose up -d
```

#### Step 3: Verify Deployment
```powershell
# Check if containers are running
docker-compose ps

# Check if port 5015 is listening
netstat -ano | findstr :5015

# Test the application
curl http://localhost:5015/health
```

## 🏗️ Container Architecture

### 1. Backend API (`retail-prediction-api`)
- **Port**: 8001 (internal only)
- **Function**: Prediction engine with ML models
- **Data**: 22,384 business records, 3,328 unique items
- **Health Check**: http://localhost:5015/api/health

### 2. Frontend Dashboard (`retail-prediction-frontend`)
- **Port**: 5173 (internal only)
- **Function**: React-based dashboard
- **Features**: Real-time predictions, charts, analytics

### 3. Nginx Reverse Proxy (`retail-prediction-webapp`)
- **Port**: 5015 (external access)
- **Function**: Load balancing, SSL termination, security
- **Access Point**: http://your-vps-ip:5015

## 🔧 Configuration Files

### docker-compose.yml
- Defines all 3 services
- Network: `retail-prediction-network`
- Volume mounts for data persistence
- Health checks and restart policies

### nginx.conf
- Reverse proxy configuration
- Rate limiting and security headers
- Gzip compression
- CORS configuration for API
- Custom logging with app name

### Dockerfile.backend
- Python 3.11 base image
- Installs requirements from requirements.txt
- Exposes port 8001
- Health check with curl

### Dockerfile.frontend
- Node.js 18 base image
- Builds React application
- Serves with `serve` on port 5173

## 📊 Monitoring & Management

### View Logs
```powershell
# All containers
docker-compose logs

# Specific container
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx

# Follow logs in real-time
docker-compose logs --follow

# Last 50 lines
docker-compose logs --tail=50
```

### Container Management
```powershell
# Stop all containers
docker-compose down

# Restart all containers
docker-compose restart

# Restart specific container
docker-compose restart backend

# View container status
docker-compose ps

# View resource usage
docker stats

# Enter container shell
docker exec -it retail-prediction-api bash
```

### Update Application
```powershell
# Pull latest changes (if using Git)
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🛡️ Security Configuration

### Firewall Rules (Windows Defender)
```powershell
# Allow port 5015
New-NetFirewallRule -DisplayName "Retail Prediction WebApp" `
    -Direction Inbound -LocalPort 5015 -Protocol TCP -Action Allow

# Verify rule
Get-NetFirewallRule -DisplayName "Retail Prediction WebApp"
```

### Environment Variables
Create `.env` file for sensitive data:
```env
# API Configuration
API_SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:pass@host/db

# Frontend Configuration
VITE_API_URL=http://backend:8001
VITE_APP_NAME="Retail Prediction webApp"
```

### SSL/TLS Configuration (Recommended for Production)
1. Obtain SSL certificate (Let's Encrypt)
2. Update nginx.conf for HTTPS
3. Redirect HTTP to HTTPS
4. Update docker-compose.yml port mapping

## 🚨 Troubleshooting

### ⚠️ MOST COMMON ISSUE: Backend Container Not Starting

**Symptom**: `docker logs retail-api` shows nothing, or API not responding on port 8001

**Cause**: Old Docker image cached, not using updated Dockerfile with uvicorn

**Quick Fix**: Run the automated fix script:
```bash
# On VPS (Linux)
chmod +x fix-backend.sh
./fix-backend.sh
```

**Manual Fix**:
```bash
# Stop everything
docker-compose down

# Remove old backend image
docker rmi retail-ai-prediction-v2-backend

# Rebuild backend with new Dockerfile (no cache)
docker-compose build --no-cache backend

# Start everything
docker-compose up -d

# Wait 15 seconds for data loading (22,384 records)
sleep 15

# Check logs - should see uvicorn startup
docker logs retail-api

# Test API
docker exec -it retail-api curl http://localhost:8001/health
```

**Expected Output**:
```
INFO:     Started server process
INFO:     Waiting for application startup.
🔧 [CONFIG] Starting API Server
🔄 Loading and analyzing your business data...
✅ Loaded 3328 items from business data
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001
```

**If Still Failing**:
```bash
# Enter container and run manually to see errors
docker exec -it retail-api bash
cd /app
uvicorn inventory_model_secondary.src.api_business_focused:app --host 0.0.0.0 --port 8001
```

### Common Issues

#### 1. Port 5015 Already in Use
```powershell
# Find process using port 5015
netstat -ano | findstr :5015

# Kill the process (replace PID)
taskkill /F /PID [PID]

# Or change port in docker-compose.yml
# Update: "5015:80" to "5016:80"
```

#### 2. Docker Desktop Not Running
- Check Docker Desktop icon in system tray
- Restart Docker Desktop
- Reboot VPS if needed

#### 3. Container Fails to Start
```powershell
# Check specific container logs
docker-compose logs backend --tail=100

# Check if ports are available
netstat -ano | findstr :8001
netstat -ano | findstr :5173

# Rebuild with clean cache
docker-compose build --no-cache
```

#### 4. Application Not Accessible
```powershell
# Check if nginx is running
docker-compose ps nginx

# Check nginx logs
docker-compose logs nginx --tail=50

# Test internal connectivity
curl http://backend:8001/health
curl http://frontend:5173
```

### Performance Issues
```powershell
# Check resource usage
docker stats

# Increase Docker resources (Docker Desktop Settings)
# - Memory: 4GB+ recommended
# - CPUs: 2+ recommended
# - Swap: 1GB

# Monitor nginx performance
docker exec retail-prediction-webapp nginx -t
```

## 📈 Scaling & Production Considerations

### 1. Database Persistence
```yaml
# Add to docker-compose.yml
volumes:
  postgres_data:
    driver: local

services:
  database:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### 2. Backup Strategy
```powershell
# Backup data volumes
docker run --rm -v retail_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/data-$(date +%Y%m%d).tar.gz -C /data .

# Schedule with Windows Task Scheduler
# Create daily backup task
```

### 3. Monitoring Setup
- **Docker**: `docker stats`, `docker events`
- **Nginx**: Access logs in `nginx_logs/` directory
- **Application**: Health check endpoints
- **Windows**: Performance Monitor, Event Viewer

### 4. Load Balancing (Multiple Instances)
```yaml
# Scale backend services
docker-compose up -d --scale backend=3

# Update nginx upstream
upstream backend {
    server backend_1:8001;
    server backend_2:8001;
    server backend_3:8001;
}
```

## 🎯 Quick Reference Commands

### Deployment
```powershell
# First deployment
.\deploy-vps.bat

# Manual deployment
docker-compose down
docker-compose build
docker-compose up -d
```

### Maintenance
```powershell
# Update application
git pull && docker-compose down && docker-compose build && docker-compose up -d

# Backup data
docker run --rm -v retail_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/backup-$(date +%Y%m%d-%H%M).tar.gz -C /data .

# View resource usage
docker system df
docker stats --no-stream
```

### Troubleshooting
```powershell
# Reset everything
docker-compose down -v
docker system prune -a -f
.\deploy-vps.bat

# Check all ports
netstat -ano | findstr :5015
netstat -ano | findstr :8001
netstat -ano | findstr :5173
```

## 📞 Support

### Application URLs
- **Web Interface**: http://localhost:5015
- **API Documentation**: http://localhost:5015/api/docs
- **Health Check**: http://localhost:5015/health
- **Status Page**: http://localhost:5015/status (local only)

### Log Locations
- **Nginx Access Logs**: `nginx_logs/access.log`
- **Nginx Error Logs**: `nginx_logs/error.log`
- **Container Logs**: `docker-compose logs [service]`

### Configuration Files
- **Main Config**: `docker-compose.yml`
- **Nginx Config**: `nginx.conf`
- **Backend Dockerfile**: `Dockerfile.backend`
- **Frontend Dockerfile**: `Dockerfile.frontend`

---

**Deployment Complete!** Your Retail Prediction webApp is now running on port 5015. Access it at `http://your-vps-ip:5015`.