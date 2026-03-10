@echo off
echo ========================================
echo   INVENTORY PREDICTION SYSTEM
echo   Network Deployment (Easy Setup)
echo ========================================
echo.

echo Step 1: Finding your computer's IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP: =%
echo Your IP address: %IP%
echo.

echo Step 2: Starting Backend API...
cd inventory_model_secondary\src
start "Inventory API" cmd /k "python api_business_focused.py"
echo Backend starting on port 8001...
echo.

echo Waiting for backend to initialize...
timeout /t 8 /nobreak > nul

echo Step 3: Starting Frontend Web App...
cd ..\..\client
start "Inventory Frontend" cmd /k "npm run dev -- --host 0.0.0.0 --port 5174"
echo Frontend starting on port 5174...
echo.

echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Access your system from any device on your network:
echo.
echo 🌐 Web Interface: http://%IP%:5174
echo 🔧 API Endpoint:  http://%IP%:8001
echo.
echo From this computer:
echo 🌐 Web Interface: http://localhost:5174
echo 🔧 API Endpoint:  http://localhost:8001
echo.
echo ========================================
echo   INSTRUCTIONS FOR OTHER DEVICES
echo ========================================
echo.
echo 1. Connect device to same WiFi network
echo 2. Open web browser
echo 3. Go to: http://%IP%:5174
echo 4. Start using the inventory system!
echo.
echo To stop the system: Close both command windows
echo.
pause