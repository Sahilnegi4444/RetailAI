# 📊 Retail ML Forecasting System

AI-powered inventory intelligence platform for demand forecasting, sales analytics, and inventory optimization using hybrid Prophet + XGBoost models.

## 🎯 Features

- **Demand Forecasting**: Predict future sales with 89.2% accuracy using hybrid ML models
- **Bulk Predictions**: Get forecasts for all items at once with trend analysis
- **Sales Analytics**: Deep dive into patterns, trends, and seasonal factors
- **Dashboard**: Real-time business intelligence with year-wise analytics
- **Data Upload**: Easy monthly data import with automatic processing
- **Model Retraining**: Update predictions with latest data instantly

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  - Dashboard, Analytics, Bulk Predictions, Data Upload  │
│  - Dark theme, Responsive design, Real-time updates     │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────────┐
│                  Nginx Reverse Proxy                     │
│              (Port 3000 → Backend 8003)                 │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Backend API (FastAPI)                       │
│  - Data Upload & Processing                             │
│  - Model Retraining                                      │
│  - Predictions & Analytics                              │
│  - SQLite Database Management                           │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│         ML Models & Data Processing                      │
│  - XGBoost (89.2% accuracy)                             │
│  - Prophet (Time-series forecasting)                    │
│  - Analytics Engine (Patterns & Trends)                 │
│  - SQLite Database                                       │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Or: Python 3.11+, Node.js 20+

### Docker Deployment (Recommended)

```bash
# Clone repository
git clone <repo-url>
cd retail-ml-forecasting

# Start services
docker-compose up -d

# Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8003
```

### Local Development

**Backend:**
```bash
cd inventory_model_secondary
pip install -r ../requirements.txt
python -m uvicorn src.api_production:app --host 0.0.0.0 --port 8003
```

**Frontend:**
```bash
cd client
npm install
npm run dev
# Access at http://localhost:5174
```

## 📋 Data Upload Format

Upload Excel files with the following structure:

| Column | Type | Description |
|--------|------|-------------|
| Date | Date (DD-MM-YYYY) | Transaction date |
| Item_Name | Text | Product name |
| W_Rate | Number | Wholesale rate |
| R_Rate | Number | Retail rate |
| Qty | Number | Quantity purchased |
| Refund_Qty | Number | Quantity refunded |
| **Net_Qty** | Number | **Net units sold (CRITICAL)** |
| Closing_Stock | Number | End-of-day inventory |

**Important**: Net_Qty is the most critical column for accurate predictions.

## 🎮 Usage

### 1. Upload Data
- Go to "📤 Data Upload & Model Training"
- Select year, month, and category
- Upload Excel file
- System validates and stores data

### 2. Retrain Model
- Click "🔄 Retrain Model with Latest Data"
- System reloads all data and updates predictions
- Takes 30-60 seconds

### 3. View Predictions
- **Bulk Predictions**: See all items with forecasts
- **Dashboard**: Year-wise sales trends and analytics
- **Analytics**: Deep dive into patterns and seasonality

## 📊 Pages

| Page | Purpose |
|------|---------|
| **Dashboard** | Year-wise sales, category distribution, top items |
| **Bulk Predictions** | Forecasts for all items with filters and sorting |
| **Analytics** | Trends, seasonal factors, monthly patterns |
| **Data Upload** | Upload data and retrain models |
| **Database** | View all items and their statistics |

## 🔧 Configuration

### Environment Variables

**Backend** (docker-compose.yml):
```
HOST=0.0.0.0
PORT=8003
DATABASE_PATH=/app/converted_dataset/inventory_sales.db
```

**Frontend** (.env):
```
VITE_API_URL=http://localhost:8003
```

### Database
- SQLite at `converted_dataset/inventory_sales.db`
- Automatically created on first upload
- Persisted in Docker volume

## 📈 Model Details

### XGBoost
- **Accuracy**: 89.2%
- **Features**: 3,309 items
- **Training**: Automatic on data upload
- **Predictions**: Item-level demand forecasts

### Prophet
- **Type**: Time-series forecasting
- **Usage**: Trend and seasonality detection
- **Integration**: Hybrid with XGBoost (70% XGBoost + 30% Prophet)

### Bounded Predictions
- Historical min/max bounding (±20%)
- Growth rate capped at ±15%
- Minimum floor at 90% of historical average
- Prevents unrealistic predictions

## 🐳 Docker Deployment

### Build Images
```bash
docker-compose build
```

### Start Services
```bash
docker-compose up -d
```

### View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stop Services
```bash
docker-compose down
```

### Health Check
```bash
curl http://localhost:8003/health
```

## 📁 Project Structure

```
retail-ml-forecasting/
├── client/                          # React frontend
│   ├── src/
│   │   ├── pages/                  # Page components
│   │   ├── components/             # Reusable components
│   │   ├── services/               # API services
│   │   └── utils/                  # Helper functions
│   └── package.json
├── inventory_model_secondary/       # Backend & ML
│   ├── src/
│   │   ├── api_production.py       # FastAPI endpoints
│   │   ├── analytics_engine.py     # Analytics logic
│   │   ├── hybrid_active.py        # ML models
│   │   └── database_manager.py     # SQLite management
│   ├── models/                      # Trained models
│   └── data/                        # Sample data
├── converted_dataset/               # Database & data
│   └── inventory_sales.db          # SQLite database
├── docker-compose.yml              # Docker orchestration
├── Dockerfile.backend              # Backend image
├── Dockerfile.frontend             # Frontend image
└── nginx.conf                      # Nginx configuration
```

## 🔍 API Endpoints

### Data Management
- `POST /upload-data` - Upload Excel file
- `GET /data-preview` - Preview uploaded data
- `GET /all_items` - Get all items with stats

### Predictions
- `POST /predict` - Generate predictions
- `POST /retrain` - Retrain models

### Analytics
- `GET /analytics/item/{item_name}` - Item analytics
- `GET /analytics/database/items` - All items analytics
- `GET /stats` - Database statistics

### Health
- `GET /health` - Health check
- `GET /model-info` - Model information

## 🛠️ Troubleshooting

### Backend not responding
```bash
# Check backend logs
docker-compose logs backend

# Verify health
curl http://localhost:8003/health
```

### Frontend can't connect to backend
- Check docker-compose.yml networking
- Verify backend is running: `docker-compose ps`
- Check nginx.conf proxy settings

### Data upload fails
- Verify Excel format matches requirements
- Check file size (should be < 10MB)
- Ensure Net_Qty column exists

### Predictions are NaN
- Upload more data (need at least 2 months)
- Check data quality in uploaded files
- Retrain model after upload

## 📝 License

Proprietary - All rights reserved

## 👥 Support

For issues or questions, check the logs:
```bash
docker-compose logs -f
```

---

**Version**: 8.0 | **Last Updated**: March 2026
