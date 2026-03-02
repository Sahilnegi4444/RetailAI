# 🏪 AI-Powered Retail Inventory Management System

A comprehensive dual-model inventory prediction system built with XGBoost, FastAPI, and React. Designed for retail stores to optimize inventory management through intelligent demand forecasting.

## 🎯 Overview

This system provides two specialized prediction models:
- **Primary Model**: General retail inventory forecasting (87.12% accuracy)
- **Business Intelligence Model**: Real inventory management based on your actual sales data (2,694 items analyzed)

## 🚀 Features

- **Real Business Intelligence**: Analyzes your actual 2024-2025 sales data
- **Smart Item Grouping**: Intelligently groups items by name for accurate predictions
- **Consumption-Based Predictions**: Uses real Net_Qty (units sold) data
- **Revenue-Focused Recommendations**: Prioritizes high-value items
- **Stock Status Analysis**: Critical/Low/Adequate/Excess categorization
- **Purchase Optimization**: Smart reorder quantities based on consumption patterns
- **Interactive Dashboard**: Modern React frontend with model switching
- **Historical Analysis**: Track actual vs predicted performance

## 📁 Project Structure

```
├── client/                     # React Frontend (Port 5174)
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Main application pages
│   │   └── api.js             # API client with model switching
│   └── package.json
│
├── inventory_model/            # Primary Model (Port 8000)
│   ├── data/                  # General retail training data
│   ├── models/                # Trained model files (.pkl)
│   └── src/                   # FastAPI application
│       ├── api.py             # Main API endpoints
│       ├── train.py           # Model training script
│       └── predict.py         # Prediction logic
│
├── inventory_model_secondary/  # Secondary Model (Port 8001)
│   ├── data/                  # Liquor & Grocery Excel data (2024-2025)
│   ├── models/                # Name-based trained models
│   └── src/                   # Specialized FastAPI application
│       ├── api_secondary.py   # Category-aware API
│       └── data_preparation.py # Excel data processing
│
├── start_*.bat               # Quick start scripts
├── test_system.py            # System health check
├── requirements.txt          # Python dependencies
├── .gitignore               # Git ignore rules
└── README.md                # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### 1. Clone Repository
```bash
git clone <repository-url>
cd retail-ai-inventory-system
```

### 2. Backend Setup

#### Primary Model
```bash
cd inventory_model
pip install -r requirements.txt
```

#### Secondary Model  
```bash
cd inventory_model_secondary
pip install -r ../inventory_model/requirements.txt
```

**Note**: The Business Intelligence Model automatically analyzes your Excel data on startup.

### 3. Frontend Setup
```bash
cd client
npm install
```

## 🚀 Quick Start

### Option 1: Using Batch Files (Windows)
```bash
# Start Primary Model (Port 8000)
start_primary_model.bat

# Start Secondary Model (Port 8001) 
start_secondary_model.bat

# Start Frontend (Port 5174)
start_frontend.bat
```

### Option 2: Manual Start

#### Start Primary Model
```bash
cd inventory_model/src
python -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

#### Start Secondary Model
```bash
cd inventory_model_secondary/src  
python -m uvicorn api_secondary:app --host 0.0.0.0 --port 8001 --reload
```

#### Start Frontend
```bash
cd client
npm run dev
```

## 🎮 Usage

### 1. Access the Application
- **Frontend**: http://localhost:5174
- **Primary API**: http://localhost:8000
- **Secondary API**: http://localhost:8001

### 2. Model Selection
1. Go to **Settings** page
2. Choose between Primary or Secondary model
3. System automatically switches API endpoints

### 3. Generate Predictions
1. Navigate to **Bulk Prediction** page
2. Select prediction date
3. Click "Generate Predictions"
4. Review categorized results with recommendations

### 4. Dashboard Analytics
- View inventory summaries
- Track prediction accuracy
- Monitor stock levels by category

## 📊 API Endpoints

### Primary Model (Port 8000)
- `GET /` - Model status and info
- `GET /stores` - Available stores
- `GET /products/{store_id}` - Products by store
- `POST /bulk_predict` - Bulk inventory predictions

### Secondary Model (Port 8001)
- `GET /` - Model status with category counts
- `GET /items` - Categorized items (Grocery + Liquor)
- `GET /items/{category}` - Items by category
- `POST /bulk_predict` - Category-aware predictions

## 🎯 Model Performance

| Model | Accuracy (WAPE) | Data Source | Items |
|-------|----------------|-------------|-------|
| Primary | 87.12% | General Retail | Multi-category |
| Secondary | 85.29% | Excel Files (2024-2025) | 2,553 items |

### Secondary Model Breakdown
- **Grocery Items**: 2,460 (from 2024-2025 data)
- **Liquor Items**: 93 (from 2024-2025 data)

## 🧪 Testing

### System Health Check
Run the automated test suite to verify all components:

```bash
python test_system.py
```

This will test:
- ✅ Primary Model API endpoints
- ✅ Secondary Model API endpoints  
- ✅ Frontend accessibility
- ✅ Bulk prediction functionality
- ✅ Data categorization

### Manual Testing
1. **API Testing**: Visit http://localhost:8000 and http://localhost:8001
2. **Frontend Testing**: Visit http://localhost:5174
3. **Model Switching**: Test in Settings page
4. **Predictions**: Generate bulk predictions for both models

## 🔧 Configuration

### Model Switching
The system automatically detects and switches between models based on user selection in the Settings page. Configuration is stored in browser localStorage.

### Data Sources
- **Primary**: CSV format retail data
- **Secondary**: Excel files (tab-delimited) organized by year and category

## 📈 Features in Detail

### Bulk Predictions
- **Status Levels**: CRITICAL, LOW, ADEQUATE, EXCESS
- **Confidence Intervals**: Low, Average, High estimates
- **Financial Impact**: Revenue projections and risk analysis
- **Historical Context**: 4-week performance tracking

### Smart Recommendations
- Priority-based ordering suggestions
- Stock level optimization
- Category-specific pricing analysis
- Seasonal demand adjustments

## 🛡️ Error Handling

The system includes comprehensive error handling:
- Model fallbacks for unseen products
- CORS configuration for development
- Graceful degradation for missing data
- User-friendly error messages

## 🔄 Development

### Adding New Models
1. Create new directory under project root
2. Implement FastAPI application
3. Update frontend API client
4. Add model selection in Settings

### Data Updates
- **Primary**: Update CSV files in `inventory_model/data/`
- **Secondary**: Add Excel files to respective year/category folders

## 📝 License

This project is proprietary software developed for retail inventory management.

## 🤝 Support

For technical support or questions:
1. Check API status endpoints
2. Review browser console for frontend errors
3. Verify all services are running on correct ports

---

**Built with ❤️ for intelligent retail management**