@echo off
color 0A
echo.
echo ████████████████████████████████████████████████████████████████
echo █                                                              █
echo █    INVENTORY PREDICTION SYSTEM - EASY DEPLOYMENT            █
echo █                                                              █
echo ████████████████████████████████████████████████████████████████
echo.
echo Choose your deployment option:
echo.
echo 1. 🏠 LOCAL NETWORK    - Access from phones/tablets on WiFi (EASIEST)
echo 2. ☁️  CLOUD DEPLOY     - Access from anywhere on internet
echo 3. 🐳 DOCKER DEPLOY    - Professional containerized deployment  
echo 4. 📖 VIEW FULL GUIDE  - Complete deployment documentation
echo 5. ❌ EXIT
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto local
if "%choice%"=="2" goto cloud
if "%choice%"=="3" goto docker
if "%choice%"=="4" goto guide
if "%choice%"=="5" goto exit
goto invalid

:local
echo.
echo ========================================
echo   STARTING LOCAL NETWORK DEPLOYMENT
echo ========================================
echo.
echo This will make your system accessible from:
echo - Your computer (localhost)
echo - Any phone/tablet on same WiFi
echo - Other computers on your network
echo.
pause
call network_deploy.bat
goto end

:cloud
echo.
echo ========================================
echo   CLOUD DEPLOYMENT OPTIONS
echo ========================================
echo.
echo Choose cloud provider:
echo 1. Railway.app (Recommended - Free tier)
echo 2. Heroku (Alternative)
echo 3. Back to main menu
echo.
set /p cloudchoice="Enter choice (1-3): "

if "%cloudchoice%"=="1" goto railway
if "%cloudchoice%"=="2" goto heroku
if "%cloudchoice%"=="3" goto start
goto invalid

:railway
echo.
echo Setting up Railway deployment...
echo.
echo Step 1: Install Railway CLI
npm install -g @railway/cli
echo.
echo Step 2: Login to Railway (browser will open)
railway login
echo.
echo Step 3: Initialize and deploy
railway init
railway up
echo.
echo Your app will be available at the URL shown above!
goto end

:heroku
echo.
echo Setting up Heroku deployment...
echo.
echo Please install Heroku CLI first:
echo https://devcenter.heroku.com/articles/heroku-cli
echo.
echo Then run these commands:
echo 1. heroku login
echo 2. heroku create your-inventory-app
echo 3. git push heroku main
echo.
goto end

:docker
echo.
echo ========================================
echo   DOCKER DEPLOYMENT
echo ========================================
echo.
echo Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker not found! Please install Docker Desktop first:
    echo https://www.docker.com/products/docker-desktop
    pause
    goto start
)

echo Docker found! Starting deployment...
echo.
echo Building and starting containers...
docker-compose up --build -d

echo.
echo ========================================
echo   DOCKER DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your system is now running in Docker containers:
echo 🌐 Frontend: http://localhost:5174
echo 🔧 Backend:  http://localhost:8001
echo.
echo To stop: docker-compose down
echo To view logs: docker-compose logs
echo.
goto end

:guide
echo.
echo Opening complete deployment guide...
start DEPLOYMENT_GUIDE.md
goto end

:invalid
echo.
echo Invalid choice! Please enter 1-5.
echo.
pause
goto start

:exit
echo.
echo Goodbye!
goto end

:end
echo.
echo ========================================
echo   DEPLOYMENT SCRIPT COMPLETE
echo ========================================
echo.
pause