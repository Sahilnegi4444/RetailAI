@echo off
echo ========================================
echo Starting Primary Model API (Port 8000)
echo ========================================
echo.

cd inventory_model\src
python -m uvicorn api:app --host 127.0.0.1 --port 8000 --reload

pause
