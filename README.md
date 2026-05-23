# CSD Retail AI Prediction System

**XGBoost-powered demand forecasting for CSD (Canteen Stores Department) inventory management.**

---

## Quick Start

```bash
# Backend (Terminal 1)
python -m uvicorn inventory_model_secondary.src.api_production:app --host 0.0.0.0 --port 8002

# Frontend (Terminal 2)
cd client
npm run dev
```

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8002/docs
- **API Health**: http://localhost:8002/health

---

## System Overview

This system forecasts monthly demand for **3,200+ grocery and liquor products** stocked at CSD stores.  
It is trained on **2 years of real POS sales data (2024–2025)** covering approximately **22,773 records**.

### Key Numbers
| Metric | Value |
|--------|-------|
| Products tracked | 3,200+ |
| Categories | Grocery, Liquor |
| Data period | April 2024 – December 2025 |
| 2024 Revenue | ₹3.68 Crore |
| 2025 Revenue | ₹4.16 Crore |
| YoY Growth | ~13% |
| Model | XGBoost Recursive Forecaster |
| Model features | 18 (lag, rolling avg, margins, seasonality) |

---

## Features

### 📊 Dashboard
- **Historical Performance**: Monthly sales comparison across 2024–2025 with toggle between Units and Revenue (₹)
- **Year-wise Analysis**: Per-year breakdown with monthly drill-down
- **Real revenue totals** computed from actual POS data (Net_Qty × R_Rate)

### 📈 Bulk Predictions
- Demand forecast for all ~3,200 products for any future month
- Recursive XGBoost model using lag features and seasonality
- Current stock levels displayed alongside predicted demand
- Recommended order quantity = Predicted Demand − Current Stock
- Export to CSV for procurement planning

### 📅 3-Month Bulk Forecast
- Aggregate demand for the next 1–6 months per product
- Useful for quarterly purchase order planning

### 📉 Product Analytics
- Deep dive into individual product sales history
- Year-over-year trends, seasonality factors, peak months
- Volatility scores and growth rates

### 💰 Budget Planner (Group Allocation)
- Allocate a procurement budget across product groups (I–VI)
- Shows estimated demand cost per group based on W_Rate (wholesale price)
- Group-wise recommended spend and coverage analysis

### 📤 Data Upload & Retraining
- Upload raw monthly Excel/CSV files from CSD POS
- Duplicate detection per (year, month, category)
- Full pipeline retraining on demand: Clean → Feature Engineering → XGBoost → Hot-reload
- Progress bar shows real-time training status

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Recharts |
| Backend | FastAPI + Python 3.11 |
| ML Model | XGBoost (recursive monthly forecaster) |
| Database | SQLite (`converted_dataset/inventory_sales.db`) |

---

## Project Structure

```
Retail-AI-Prediction-v2/
├── client/                              # React Frontend
│   └── src/
│       ├── pages/
│       │   ├── Dashboard/               # Sales dashboard (historical + year-wise)
│       │   ├── BulkPrediction/          # Main predictions page
│       │   ├── Analytics.jsx            # Product analytics
│       │   ├── BudgetAllocator.jsx      # Budget planning
│       │   └── DataUpload.jsx           # Upload & retrain
│       ├── components/
│       │   ├── Sidebar.jsx              # Navigation
│       │   └── LoadingSpinner.jsx
│       └── services/
│           └── analyticsService.js      # API calls
│
├── inventory_model_secondary/           # Python Backend
│   └── src/
│       ├── api_production.py            # FastAPI app + all endpoints
│       ├── forecaster.py                # XGBoost recursive forecaster
│       └── data_manager.py              # Stats + analytics helpers
│
├── model/
│   └── xgboost_demand_model.json        # Trained XGBoost model
│
├── converted_dataset/
│   └── inventory_sales.db               # SQLite: raw + training data
│
├── scripts/
│   └── clean_and_group.py               # Raw file cleaning
│
└── requirements.txt
```

---

## API Endpoints

### Core
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/stats` | Model stats (items, accuracy, avg error) |
| GET | `/` | Root info |

### Predictions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/predict` | All-item predictions for a date |
| POST | `/predict-paginated` | Paginated predictions (used by frontend) |
| POST | `/predict-future-aggregate` | N-month aggregate forecast |
| POST | `/predict-previous-years` | Same month, year-over-year |
| POST | `/predict-last-n-months` | Last N months actual data |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/dashboard/historical` | Monthly sales by year (units + revenue ₹) |
| GET | `/analytics/dashboard/yearwise` | Year summary + monthly series |
| GET | `/analytics/dashboard/product-analysis` | Deep product analytics |
| GET | `/analytics/item-lookup?q=` | Item history |

### Data Management
| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload-data` | Upload monthly Excel/CSV |
| POST | `/retrain` | Trigger full retraining pipeline |
| GET | `/training-status` | Poll training progress |
| POST | `/reload-forecaster` | Hot-reload model without retraining |

### Budget
| Method | Path | Description |
|--------|------|-------------|
| POST | `/budget/allocate` | Group-wise budget allocation |
| POST | `/budget-predict` | Budget-filtered predictions |

---

## Data Format

The system expects CSD POS monthly export files (Excel `.xls`/`.xlsx` or `.csv`).

### Required Columns
| Column | Description |
|--------|-------------|
| `GP_Index_No` | Product group index (e.g., `II/001009S`) |
| `pluno` | PLU number (product ID) |
| `Item_Name` | Product name |
| `Qty` | Gross quantity sold |
| `Refund_Qty` | Returned quantity |
| `Net_Qty` | Net sold = Qty − Refund_Qty |
| `W_Rate` | Wholesale/purchase price |
| `R_Rate` | Retail price |
| `O_B` | Opening balance (stock at month start) |
| `Closing_Stock` | Stock at month end |

### Upload Workflow
1. Select **Year**, **Month**, and **Category** (Grocery or Liquor)
2. Upload the raw POS file
3. Repeat for all months you have
4. Click **"Retrain Model"** to rebuild predictions

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Predictions show stock = 0 | Click "Refresh Stock Data" in Upload page |
| Old data appearing | Check if a duplicate server is running on port 8002 |
| Training hangs | Check `GET /training-status` for error message |
| Frontend blank | Ensure backend is running on port 8002 |

---

**Version**: 3.0.0  
**Last Updated**: May 2026  
**Model**: XGBoost Recursive (18 features)  
**Data**: CSD Store POS — Grocery + Liquor (2024–2025)  
**Status**: Production Ready ✅
