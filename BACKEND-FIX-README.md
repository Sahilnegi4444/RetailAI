# Backend Container Fix Guide

## Problem
Your backend container (`retail-api`) is not starting properly on the VPS. The logs show nothing and the API doesn't respond on port 8001.

## Root Cause
The Docker image is cached from an older build that used `python` command instead of `uvicorn` command. The updated Dockerfile uses uvicorn directly for better reliability, but your VPS is still running the old image.

## Solution

### Option 1: Automated Fix (Recommended)

**On VPS (Linux):**
```bash
chmod +x fix-backend.sh
./fix-backend.sh
```

**On Windows:**
```cmd
fix-backend.bat
```

### Option 2: Manual Fix

```bash
# 1. Stop all containers
docker-compose down

# 2. Remove old backend image (forces rebuild)
docker rmi retail-ai-prediction-v2-backend

# 3. Rebuild backend with new Dockerfile (no cache)
docker-compose build --no-cache backend

# 4. Start all containers
docker-compose up -d

# 5. Wait 15-20 seconds for data loading
sleep 15

# 6. Check logs (should see uvicorn startup)
docker logs retail-api

# 7. Test API health
docker exec -it retail-api curl http://localhost:8001/health
```

## Expected Output

After the fix, `docker logs retail-api` should show:

```
INFO:     Started server process [1]
INFO:     Waiting for application startup.
🔧 [CONFIG] Starting API Server
🔧 [CONFIG] Host: 0.0.0.0
🔧 [CONFIG] Port: 8001
🔄 Loading and analyzing your business data...
✅ Loaded 3328 items from business data
✅ Enhanced predictor initialized with 3328 profiles
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
```

And the health check should return:
```json
{"status":"ready","message":"API ready for predictions"}
```

## Verification Steps

1. **Check container is running:**
   ```bash
   docker ps | grep retail-api
   ```
   Should show: `Up X seconds (healthy)`

2. **Check logs:**
   ```bash
   docker logs retail-api
   ```
   Should show uvicorn startup messages

3. **Test API internally:**
   ```bash
   docker exec -it retail-api curl http://localhost:8001/health
   ```
   Should return: `{"status":"ready",...}`

4. **Test API through nginx:**
   ```bash
   curl http://localhost:5015/api/health
   ```
   Should return same response

5. **Test frontend:**
   Open browser: `http://your-vps-ip:5015`
   Should load dashboard with data

## Still Not Working?

### Debug Inside Container

```bash
# Enter the container
docker exec -it retail-api bash

# Check if files exist
ls -la inventory_model_secondary/src/

# Try running uvicorn manually to see errors
uvicorn inventory_model_secondary.src.api_business_focused:app --host 0.0.0.0 --port 8001
```

### Check for Common Issues

1. **Missing dependencies:**
   ```bash
   docker exec -it retail-api pip list | grep -E "fastapi|uvicorn|pandas"
   ```

2. **Port already in use:**
   ```bash
   docker exec -it retail-api netstat -tuln | grep 8001
   ```

3. **Data files missing:**
   ```bash
   docker exec -it retail-api ls -la inventory_model_secondary/data/
   ```

4. **Python path issues:**
   ```bash
   docker exec -it retail-api env | grep PYTHON
   ```

## What Changed in Dockerfile

**Old (not working):**
```dockerfile
CMD ["python", "inventory_model_secondary/src/api_business_focused.py"]
```

**New (working):**
```dockerfile
ENV PYTHONUNBUFFERED=1
CMD ["uvicorn", "inventory_model_secondary.src.api_business_focused:app", "--host", "0.0.0.0", "--port", "8001"]
```

**Why this matters:**
- `uvicorn` command is more reliable for production
- Ensures FastAPI app always starts properly
- Better error messages and logging
- `PYTHONUNBUFFERED=1` shows logs immediately

## Timeline

- **Startup**: 0-5 seconds (container starts)
- **Data Loading**: 5-20 seconds (loads 22,384 records)
- **Ready**: 20-30 seconds (API ready for requests)

Total time from `docker-compose up -d` to fully operational: ~30 seconds

## Need More Help?

1. Share the output of:
   ```bash
   docker logs retail-api
   docker ps
   docker exec -it retail-api curl http://localhost:8001/health
   ```

2. Check if the Dockerfile.backend has the correct CMD:
   ```bash
   cat Dockerfile.backend | grep CMD
   ```
   Should show: `CMD ["uvicorn", "inventory_model_secondary.src.api_business_focused:app", "--host", "0.0.0.0", "--port", "8001"]`
