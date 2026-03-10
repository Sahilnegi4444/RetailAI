@echo off
echo ========================================
echo    🚀 ENHANCED PREDICTION SYSTEM
echo    Individual Item Pattern Analysis
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo [OK] Python and Node.js detected
echo.

REM Check if Python dependencies are installed (quick check)
echo [CHECK] Checking Python dependencies...
python -c "import pandas" >nul 2>&1
if errorlevel 1 (
    echo [INSTALL] Installing Python dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install Python dependencies
        pause
        exit /b 1
    )
) else (
    echo [SKIP] Python dependencies already installed
)

REM Check if Node.js dependencies are installed
echo [CHECK] Checking Node.js dependencies...
if not exist "client\node_modules" (
    echo [INSTALL] Installing Node.js dependencies...
    cd client
    npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install Node.js dependencies
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [SKIP] Node.js dependencies already installed
)

echo.
echo ========================================
echo    [STARTING] Launching Services...
echo ========================================
echo.

REM Kill any existing processes on these ports
echo [CLEANUP] Stopping any existing services...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /F /PID %%a >nul 2>&1

REM Start Enhanced Prediction API (Port 8001) - Keep terminal open
echo [API] Starting Enhanced Prediction API on port 8001...
start "🚀 Enhanced Prediction API - Port 8001" cmd /k "title 🚀 Enhanced Prediction API - Port 8001 && echo ======================================== && echo    ENHANCED PREDICTION API STARTING... && echo    Port: 8001 && echo    Loading 22,384 business records... && echo    Enhanced individual item analysis... && echo ======================================== && cd /d "%~dp0inventory_model_secondary\src" && python api_business_focused.py || (echo [ERROR] Failed to start Enhanced API && pause)"

REM Wait for Enhanced API to start with progress indicator
echo [WAIT] Enhanced API is loading 22,384 records with individual item analysis...
echo [INFO] Watch the API window for progress messages
echo [INFO] Look for: "✅ Created profiles for 3,328 unique items"
echo [INFO] Then: "✅ Enhanced predictor initialized with 3328 profiles"
echo [INFO] Finally: "INFO: Uvicorn running on http://0.0.0.0:8001"

REM Wait with progress updates
for /L %%i in (1,1,8) do (
    echo [WAIT] Loading progress... %%i0 seconds elapsed
    timeout /t 10 /nobreak >nul
    
    REM Check if port is active
    netstat -ano | findstr :8001 >nul
    if not errorlevel 1 (
        echo [OK] ✅ API port 8001 is active
        goto api_ready
    )
)

echo [INFO] Enhanced API is still starting - check the API window for "Enhanced predictor initialized" message

:api_ready

REM Start Frontend (Port 5173) - Keep terminal open
echo [WEB] Starting Frontend on port 5173...
start "🌐 Frontend Dashboard - Port 5173" cmd /k "title 🌐 Frontend Dashboard - Port 5173 && echo ======================================== && echo    FRONTEND DASHBOARD STARTING... && echo    Port: 5173 && echo    React + Vite Development Server && echo ======================================== && cd /d "%~dp0client" && npm run dev || (echo [ERROR] Failed to start frontend && pause)"

REM Wait for frontend to start
echo [WAIT] Waiting for frontend to start...
timeout /t 8 /nobreak >nul

echo.
echo ========================================
echo    ✅ SYSTEM STATUS
echo ========================================
echo.

REM Check API status
netstat -ano | findstr :8001 >nul
if errorlevel 1 (
    echo [API] Status: ❌ FAILED - Port 8001 not responding
    echo [FIX] Check the API window for error messages
) else (
    echo [API] Status: ✅ RUNNING - http://localhost:8001
)

REM Check Frontend status
netstat -ano | findstr :5173 >nul
if errorlevel 1 (
    echo [WEB] Status: ❌ FAILED - Port 5173 not responding
    echo [FIX] Check the Frontend window for error messages
) else (
    echo [WEB] Status: ✅ RUNNING - http://localhost:5173
)

echo.
echo ========================================
echo    📋 USAGE INSTRUCTIONS
echo ========================================
echo.
echo [BROWSER] Open: http://localhost:5174 (or check frontend window for actual port)
echo [MODEL] Enhanced Prediction System is now active (Model 2)
echo [FEATURES] Individual item patterns for all 3,328 items
echo [ANALYSIS] Seasonal trends, prediction explanations, demand breakdown
echo [WINDOWS] Two service windows are now open with live logs
echo [LOGS] Watch the service windows for real-time status
echo.
echo ========================================
echo    🔧 ENHANCED SYSTEM FEATURES
echo ========================================
echo.
echo [ANALYSIS] Individual patterns for all 3,328 items
echo [PREDICTIONS] Seasonal trends and growth factors
echo [EXPLANATIONS] Detailed prediction breakdowns
echo [ACCURACY] 90.5%% average prediction accuracy
echo [DATA] Real business data from 22,384 transactions
echo [CATEGORIES] Grocery (3,214 items) + Liquor (114 items)
echo.
echo [MONITOR] System monitoring (updates every 30 seconds)
echo [STOP] Press Ctrl+C to stop monitoring (services will continue)
echo [CLOSE] Close service windows to stop individual services
echo.

:monitor
REM Check services every 30 seconds
timeout /t 30 /nobreak >nul

REM Quick status check with emojis
set api_status=❌ STOPPED
set web_status=❌ STOPPED

netstat -ano | findstr :8001 >nul
if not errorlevel 1 set api_status=✅ RUNNING

netstat -ano | findstr :5173 >nul
if not errorlevel 1 set web_status=✅ RUNNING

echo [%time%] API: %api_status% ^| Frontend: %web_status%

goto monitor