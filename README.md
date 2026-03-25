# Retail AI Prediction - Demand Forecasting System

Production-ready ML system for inventory demand forecasting using Hybrid Prophet + XGBoost.

## Quick Start

```bash
docker-compose build --no-cache
docker-compose up -d
```

Access at: `http://localhost:5016`

## Stack

- **Frontend**: React + Vite + Recharts
- **Backend**: FastAPI + Python 3.11
- **ML**: Prophet + XGBoost
- **Database**: SQLite
- **Proxy**: Nginx

## Ports

- Frontend: 5016
- Backend API: 8001
- Nginx: 80 (internal)

## API Endpoints

- `GET /health` - Health check
- `GET /stats` - Database statistics
- `GET /all_items` - All items with stats
- `POST /predict` - Get predictions
- `POST /upload-data` - Upload sales data
- `POST /retrain` - Retrain models

## Features

- Real-time demand forecasting
- Bulk predictions for all items
- Historical analysis
- Year-wise and month-wise trends
- Category-wise distribution
- Top items by sales/revenue
- Data upload and model retraining
