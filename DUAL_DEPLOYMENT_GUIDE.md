# Dual Deployment Guide - VPS + Local Development

## Setup Overview

You now have two separate deployments:

1. **Production (VPS)**: `http://72.60.204.211:5015` - Port 5015
2. **Development (Local)**: `http://localhost:5016` - Port 5016

Both run independently with separate databases and containers.

---

## Part 1: Fix Current Deployment (Missing Dependencies)

The backend was failing because `joblib` and other ML libraries were missing.

### Fixed Files:
- `requirements.txt` - Added joblib, scikit-learn, xgboost, prophet

### Deploy to VPS:

```bash
# On VPS server (72.60.204.211)
cd ~/Retail-AI-Prediction-v2

# Pull latest changes
git pull

# Rebuild with new dependencies
docker-compose build --no-cache

# Stop old containers
docker-compose down

# Start new containers
docker-compose up -d

# Verify
docker ps
docker-compose logs -f backend
```

---

## Part 2: Local Development Setup (New)

### Files Created:
- `docker-compose.dev.yml` - Development compose file (port 5016)
- `nginx.conf.dev` - Development nginx config (proxies to port 8002)

### Port Configuration:

| Component | Production | Development |
|-----------|-----------|-------------|
| Frontend (Nginx) | 5015 | 5016 |
| Backend API | 8001 | 8002 |
| Network | retail-network | retail-network-dev |
| Container Names | retail-api, retail-web | retail-api-dev, retail-web-dev |

### Run Locally:

```bash
# Terminal 1 - Start development stack
docker-compose -f docker-compose.dev.yml up -d

# Check status
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Access at http://localhost:5016
```

### Stop Development Stack:

```bash
docker-compose -f docker-compose.dev.yml down
```

---

## Part 3: Running Both Simultaneously

### Start Production (VPS):
```bash
# On VPS
docker-compose up -d
```

### Start Development (Local):
```bash
# On local machine
docker-compose -f docker-compose.dev.yml up -d
```

### Both will run independently:
- Production: `http://72.60.204.211:5015`
- Development: `http://localhost:5016`

---

## Troubleshooting

### Backend Health Check Failing

If you see: `dependency failed to start: container retail-api is unhealthy`

**Solution:**
```bash
# Check backend logs
docker-compose logs backend

# Rebuild without cache
docker-compose build --no-cache backend

# Restart
docker-compose down
docker-compose up -d
```

### Port Already in Use

If port 5016 is already in use:

Edit `docker-compose.dev.yml`:
```yaml
nginx-dev:
  ports:
    - "5017:80"  # Change 5016 to 5017
```

Then access at `http://localhost:5017`

### Missing Dependencies

If you see `ModuleNotFoundError`:

```bash
# Rebuild with latest requirements
docker-compose build --no-cache backend
docker-compose down
docker-compose up -d
```

---

## File Structure

```
Retail-AI-Prediction-v2/
├── docker-compose.yml          # Production (VPS)
├── docker-compose.dev.yml      # Development (Local)
├── nginx.conf                  # Production nginx
├── nginx.conf.dev              # Development nginx
├── Dockerfile.backend          # Backend image
├── Dockerfile.frontend         # Frontend image
├── requirements.txt            # Python dependencies (UPDATED)
├── client/                     # React frontend
└── inventory_model_secondary/  # Python backend
```

---

## API Configuration

The frontend automatically detects the environment:

- **Local Dev**: Uses `http://localhost:8002` (direct API calls)
- **Docker**: Uses `/api/` proxy through nginx

No code changes needed - it works in both environments!

---

## Next Steps

1. **Fix VPS**: Push changes and rebuild
   ```bash
   git push
   # On VPS: git pull && docker-compose build --no-cache && docker-compose down && docker-compose up -d
   ```

2. **Test Local**: Run development stack
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Verify Both**: Access both URLs and test functionality

---

## Quick Commands Reference

```bash
# Production (VPS)
docker-compose up -d              # Start
docker-compose down               # Stop
docker-compose logs -f            # View logs
docker-compose ps                 # Status

# Development (Local)
docker-compose -f docker-compose.dev.yml up -d      # Start
docker-compose -f docker-compose.dev.yml down       # Stop
docker-compose -f docker-compose.dev.yml logs -f    # View logs
docker-compose -f docker-compose.dev.yml ps         # Status
```
