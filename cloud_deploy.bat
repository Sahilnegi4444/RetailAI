@echo off
echo ========================================
echo   CLOUD DEPLOYMENT - RAILWAY.APP
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js not found! Please install Node.js first:
    echo https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found! Installing Railway CLI...
npm install -g @railway/cli

echo.
echo Logging into Railway (browser will open)...
railway login

echo.
echo Creating new Railway project...
railway init

echo.
echo Deploying your application...
railway up

echo.
echo ========================================
echo   CLOUD DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your inventory system is now live on the internet!
echo Check the Railway dashboard for your app URL.
echo.
echo Next steps:
echo 1. Note down your app URL from Railway dashboard
echo 2. Update your frontend API URL if needed
echo 3. Test the system from any device with internet
echo.
pause