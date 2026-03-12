@echo off
echo ========================================
echo    🚀 RETAIL PREDICTION WEBAPP DEPLOYMENT
echo    VPS Deployment Script
echo ========================================
echo.

REM Check if Docker is installed
echo [CHECK] Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH
    echo [INFO] Please install Docker Desktop for Windows
    echo [INFO] Download from: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
echo [CHECK] Checking Docker Compose...
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed
    echo [INFO] Docker Compose should be included with Docker Desktop
    echo [INFO] Make sure Docker Desktop is running
    pause
    exit /b 1
)

echo [OK] Docker and Docker Compose detected
echo.

REM Check if Docker Desktop is running
echo [CHECK] Checking if Docker Desktop is running...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop is not running
    echo [INFO] Please start Docker Desktop and try again
    pause
    exit /b 1
)

echo [OK] Docker Desktop is running
echo.

REM Create necessary directories
echo [SETUP] Creating required directories...
if not exist "nginx_logs" mkdir nginx_logs
if not exist "data_backups" mkdir data_backups

echo [INFO] Directory structure created
echo.

REM Stop any existing containers
echo [CLEANUP] Stopping any existing Retail Prediction containers...
docker-compose down >nul 2>&1
if errorlevel 1 (
    echo [WARN] No existing containers found or error stopping
)

REM Remove old containers and networks
echo [CLEANUP] Removing old containers and networks...
docker-compose rm -f >nul 2>&1
docker network prune -f >nul 2>&1

echo [OK] Cleanup completed
echo.

REM Build and start the application
echo [BUILD] Building Retail Prediction WebApp containers...
echo [INFO] This may take several minutes on first run...
echo.

docker-compose build
if errorlevel 1 (
    echo [ERROR] Failed to build Docker containers
    echo [INFO] Check Docker Desktop logs and try again
    pause
    exit /b 1
)

echo [OK] Build completed successfully
echo.

REM Start the application
echo [START] Starting Retail Prediction WebApp...
echo [INFO] Application will be available at: http://localhost:5015
echo [INFO] Application Name: Retail Prediction webApp
echo.

docker-compose up -d
if errorlevel 1 (
    echo [ERROR] Failed to start containers
    echo [INFO] Check Docker Desktop logs
    pause
    exit /b 1
)

echo [OK] Containers started successfully
echo.

REM Wait for services to initialize
echo [WAIT] Waiting for services to initialize (30 seconds)...
echo [INFO] Backend API loading 22,384 business records...
echo [INFO] Frontend building React application...
echo.

REM Progress indicator
for /L %%i in (1,1,6) do (
    echo [WAIT] Initializing... %%i0 seconds elapsed
    timeout /t 5 /nobreak >nul
)

echo [OK] Services should be initializing
echo.

REM Check container status
echo [STATUS] Checking container status...
echo.

docker-compose ps
echo.

REM Check if nginx is running on port 5015
echo [CHECK] Verifying nginx on port 5015...
netstat -ano | findstr :5015 >nul
if errorlevel 1 (
    echo [WARN] Port 5015 not yet active, waiting a bit more...
    timeout /t 10 /nobreak >nul
    netstat -ano | findstr :5015 >nul
    if errorlevel 1 (
        echo [WARN] Port 5015 still not active, checking containers...
    ) else (
        echo [OK] ✅ Port 5015 is now active
    )
) else (
    echo [OK] ✅ Port 5015 is active
)

echo.

REM Display deployment information
echo ========================================
echo    ✅ DEPLOYMENT COMPLETE
echo ========================================
echo.
echo [APP NAME] Retail Prediction webApp
echo [ACCESS URL] http://localhost:5015
echo [API URL] http://localhost:5015/api/
echo [HEALTH CHECK] http://localhost:5015/health
echo.
echo [CONTAINERS]
echo   - retail-prediction-api (Port: 8001 internal)
echo   - retail-prediction-frontend (Port: 5173 internal) 
echo   - retail-prediction-webapp (Port: 5015 external)
echo.
echo [NETWORK] retail-prediction-network
echo [LOGS] nginx_logs/ directory for access logs
echo.
echo ========================================
echo    📋 MANAGEMENT COMMANDS
echo ========================================
echo.
echo [VIEW LOGS] docker-compose logs
echo [VIEW SPECIFIC] docker-compose logs backend
echo [RESTART] docker-compose restart
echo [STOP] docker-compose down
echo [UPDATE] docker-compose pull && docker-compose up -d
echo [STATUS] docker-compose ps
echo.
echo ========================================
echo    🔧 TROUBLESHOOTING
echo ========================================
echo.
echo [PORT IN USE] If port 5015 is in use, check: netstat -ano | findstr :5015
echo [DOCKER DOWN] If Docker stops: restart Docker Desktop
echo [LOGS] Check logs: docker-compose logs --tail=50
echo [REBUILD] Force rebuild: docker-compose build --no-cache
echo.
echo ========================================
echo    🚀 NEXT STEPS
echo ========================================
echo.
echo 1. Open browser to: http://localhost:5015
echo 2. Test the application
echo 3. Check logs if any issues: docker-compose logs
echo 4. For production, configure firewall rules
echo 5. Consider setting up SSL/TLS certificates
echo.
echo [MONITOR] Press any key to view live logs (Ctrl+C to exit)...
pause >nul

REM Show live logs
echo.
echo ========================================
echo    📊 LIVE CONTAINER LOGS
echo ========================================
echo [INFO] Press Ctrl+C to stop viewing logs
echo.
docker-compose logs --follow