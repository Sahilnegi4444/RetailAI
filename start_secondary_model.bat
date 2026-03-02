@echo off
echo ========================================
echo Starting Business-Focused Model API (Port 8001)
echo ========================================
echo.
echo This model uses your actual sales data for accurate predictions
echo Data: 2,694 items from 2024-2025 (Grocery + Liquor)
echo Business Intelligence: Enabled
echo.

cd inventory_model_secondary\src
python api_business_focused.py

pause
