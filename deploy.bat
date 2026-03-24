@echo off
REM Retail ML System - Docker Deployment Script (Windows)
REM This script builds and deploys the entire system using Docker

echo ==========================================
echo Retail ML System - Docker Deployment
echo ==========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed
    echo Please install Docker Desktop from https://docs.docker.com/desktop/install/windows-install/
    exit /b 1
)

REM Stop existing containers
echo Stopping existing containers...
docker-compose down 2>nul

REM Build images
echo.
echo Building Docker images...
docker-compose build --no-cache

REM Start containers
echo.
echo Starting containers...
docker-compose up -d

REM Wait for services
echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check backend health
echo.
echo Checking backend health...
set /a attempts=0
:check_backend
set /a attempts+=1
curl -f http://localhost:8003/health >nul 2>&1
if errorlevel 1 (
    if %attempts% lss 30 (
        echo    Waiting... (%attempts%/30)
        timeout /t 2 /nobreak >nul
        goto check_backend
    ) else (
        echo Backend health check failed
        echo Check logs with: docker-compose logs backend
        exit /b 1
    )
)
echo Backend is healthy!

REM Check frontend
echo.
echo Checking frontend...
curl -f http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo Frontend may not be ready yet
) else (
    echo Frontend is accessible!
)

REM Show status
echo.
echo ==========================================
echo Deployment Complete!
echo ==========================================
echo.
echo Services:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:8003
echo    API Docs: http://localhost:8003/docs
echo.
echo Useful commands:
echo    View logs: docker-compose logs -f
echo    Stop: docker-compose down
echo    Restart: docker-compose restart
echo    Status: docker-compose ps
echo.
echo System is ready to use!
echo.

pause
