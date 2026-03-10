# 🚀 Easy Deployment Guide - Inventory Prediction System

## 📋 Quick Overview
Your system has 2 parts:
- **Backend API** (Python FastAPI) - Port 8001
- **Frontend Web App** (React/Vite) - Port 5174

## 🎯 Deployment Options (Easy to Advanced)

### Option 1: 🏠 **Local Network Deployment** (Easiest - 5 minutes)
**Perfect for**: Small business, office network, testing

#### Step 1: Make it accessible on your network
```batch
# Create network_deploy.bat
@echo off
echo Starting Inventory Prediction System for Network Access...

# Start Backend API on all network interfaces
cd inventory_model_secondary\src
start "Backend API" python api_business_focused.py --host 0.0.0.0 --port 8001

# Wait for backend to start
timeout /t 5

# Start Frontend for network access
cd ..\..\client
start "Frontend" npm run dev -- --host 0.0.0.0 --port 5174

echo System started!
echo Backend API: http://YOUR_COMPUTER_IP:8001
echo Frontend: http://YOUR_COMPUTER_IP:5174
echo.
echo To find your IP address, run: ipconfig
pause
```

#### Step 2: Find your computer's IP address
```batch
ipconfig
# Look for "IPv4 Address" (usually 192.168.x.x)
```

#### Step 3: Access from any device on your network
- **Frontend**: `http://192.168.1.100:5174` (replace with your IP)
- **API**: `http://192.168.1.100:8001` (replace with your IP)

---

### Option 2: ☁️ **Cloud Deployment** (Medium - 15 minutes)
**Perfect for**: Remote access, multiple users, professional use

#### A) **Railway.app** (Recommended - Free tier available)

1. **Prepare for deployment**:
```batch
# Create railway_setup.bat
@echo off
echo Preparing for Railway deployment...

# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

echo Setup complete! Now follow the deployment steps.
pause
```

2. **Create deployment files**:

**Create `railway.json`:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "python inventory_model_secondary/src/api_business_focused.py",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Create `requirements.txt` (root level):**
```txt
fastapi==0.104.1
uvicorn==0.24.0
pandas==2.1.3
numpy==1.25.2
python-multipart==0.0.6
openpyxl==3.1.2
xlrd==2.0.1
pathlib
datetime
```

**Create `Procfile`:**
```
web: uvicorn inventory_model_secondary.src.api_business_focused:app --host 0.0.0.0 --port $PORT
```

3. **Deploy Backend**:
```batch
# In your project root
railway init
railway up
```

4. **Deploy Frontend** (separate Railway project):
```batch
cd client
railway init
railway up
```

#### B) **Heroku** (Alternative)

**Create `heroku_deploy.bat`:**
```batch
@echo off
echo Deploying to Heroku...

# Install Heroku CLI first from https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Create backend app
heroku create your-inventory-api

# Create frontend app  
heroku create your-inventory-frontend

# Deploy backend
git subtree push --prefix=inventory_model_secondary heroku main

echo Deployment initiated! Check Heroku dashboard.
pause
```

---

### Option 3: 🐳 **Docker Deployment** (Advanced - 20 minutes)
**Perfect for**: Scalable deployment, consistent environments

#### Create Docker files:

**`Dockerfile.backend`:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY inventory_model_secondary/ ./inventory_model_secondary/
COPY inventory_model/ ./inventory_model/

# Expose port
EXPOSE 8001

# Start the application
CMD ["python", "inventory_model_secondary/src/api_business_focused.py"]
```

**`Dockerfile.frontend`:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY client/package*.json ./
RUN npm install

# Copy source code
COPY client/ .

# Build the app
RUN npm run build

# Install serve to run the built app
RUN npm install -g serve

# Expose port
EXPOSE 5174

# Start the application
CMD ["serve", "-s", "dist", "-l", "5174"]
```

**`docker-compose.yml`:**
```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8001:8001"
    volumes:
      - ./inventory_model/data:/app/inventory_model/data
    environment:
      - PYTHONPATH=/app
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "5174:5174"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://localhost:8001
    restart: unless-stopped

volumes:
  data:
```

**Deploy with Docker:**
```batch
# Create docker_deploy.bat
@echo off
echo Building and starting with Docker...

# Build and start services
docker-compose up --build -d

echo System deployed!
echo Frontend: http://localhost:5174
echo Backend: http://localhost:8001
echo.
echo To stop: docker-compose down
pause
```

---

### Option 4: 🌐 **VPS/Server Deployment** (Professional)
**Perfect for**: Production use, custom domain, full control

#### A) **DigitalOcean/AWS/Linode Setup:**

**Create `server_setup.sh`:**
```bash
#!/bin/bash
echo "Setting up Inventory Prediction System on Ubuntu Server..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and Node.js
sudo apt install python3 python3-pip nodejs npm nginx -y

# Install PM2 for process management
sudo npm install -g pm2

# Clone your repository
git clone https://github.com/yourusername/inventory-prediction.git
cd inventory-prediction

# Setup Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd client
npm install
npm run build
cd ..

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'inventory-api',
      script: 'inventory_model_secondary/src/api_business_focused.py',
      interpreter: 'python3',
      env: {
        PORT: 8001,
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save

echo "Backend started on port 8001"
echo "Configure Nginx for frontend..."
```

**Nginx configuration (`/etc/nginx/sites-available/inventory`):**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/your/project/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🔧 **Quick Setup Scripts**

### Create `easy_deploy.bat` (Windows):
```batch
@echo off
echo ========================================
echo   INVENTORY PREDICTION SYSTEM DEPLOY
echo ========================================
echo.
echo Choose deployment option:
echo 1. Local Network (Easiest)
echo 2. Railway Cloud (Recommended)
echo 3. Docker (Advanced)
echo 4. Manual Setup
echo.
set /p choice="Enter choice (1-4): "

if "%choice%"=="1" goto local
if "%choice%"=="2" goto railway
if "%choice%"=="3" goto docker
if "%choice%"=="4" goto manual

:local
echo Starting local network deployment...
# Add local deployment commands
goto end

:railway
echo Starting Railway deployment...
# Add Railway deployment commands
goto end

:docker
echo Starting Docker deployment...
# Add Docker deployment commands
goto end

:manual
echo Opening manual setup guide...
start DEPLOYMENT_GUIDE.md
goto end

:end
echo Deployment complete!
pause
```

---

## 📱 **Mobile Access Setup**

### Make it mobile-friendly:

**Update `client/src/index.css`:**
```css
/* Add mobile responsiveness */
@media (max-width: 768px) {
  .bulk-prediction-page {
    padding: 10px;
  }
  
  .form-row {
    flex-direction: column;
  }
  
  .products-table {
    font-size: 12px;
  }
  
  .summary-grid {
    grid-template-columns: 1fr 1fr;
  }
}
```

---

## 🔒 **Security & Production Setup**

### Environment Variables:
**Create `.env`:**
```env
# Production settings
NODE_ENV=production
API_URL=https://your-api-domain.com
DATABASE_URL=your-database-url
SECRET_KEY=your-secret-key

# Optional: Authentication
JWT_SECRET=your-jwt-secret
ADMIN_PASSWORD=your-admin-password
```

### Basic Authentication (Optional):
**Add to `api_business_focused.py`:**
```python
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets

security = HTTPBasic()

def authenticate(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, "admin")
    correct_password = secrets.compare_digest(credentials.password, "your-password")
    if not (correct_username and correct_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return credentials.username

# Add to your endpoints:
@app.post("/bulk_predict")
def bulk_predict(data: dict, user: str = Depends(authenticate)):
    # Your existing code
```

---

## 🎯 **Recommended Deployment Path**

### For Small Business (Start Here):
1. **Week 1**: Use Option 1 (Local Network) - Test with your team
2. **Week 2**: Move to Option 2A (Railway) - Get cloud access
3. **Month 2**: Consider Option 4 (VPS) if you need custom domain

### For Enterprise:
1. Start with Option 3 (Docker) for development
2. Move to Option 4 (VPS/Cloud) for production
3. Add monitoring, backups, and security

---

## 📞 **Support & Troubleshooting**

### Common Issues:
1. **Port conflicts**: Change ports in config files
2. **CORS errors**: Update CORS settings in FastAPI
3. **Data not loading**: Check file paths in deployment
4. **Memory issues**: Increase server resources

### Quick Fixes:
```batch
# Restart services
pm2 restart all

# Check logs
pm2 logs

# Update code
git pull
pm2 restart all
```

---

## 🚀 **Next Steps After Deployment**

1. **Set up monitoring** (PM2 monitoring, error tracking)
2. **Configure backups** (database, Excel files)
3. **Add SSL certificate** (Let's Encrypt for HTTPS)
4. **Set up domain name** (professional URL)
5. **Add user authentication** (if multiple users)
6. **Configure email alerts** (for critical stock levels)

Choose the option that fits your needs and technical comfort level!