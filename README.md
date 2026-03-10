# 🛒 Retail AI Prediction System

**Advanced Inventory Management & Demand Forecasting System**

A comprehensive AI-powered solution for retail inventory management that analyzes your actual sales data to provide accurate stock predictions, purchase recommendations, and business insights.

## 🚀 Quick Start (One-Click Launch)

### **Step 1: Run the System**
```bash
# Double-click this file or run in command prompt:
start_system.bat
```

### **Step 2: Access the Dashboard**
- Open your browser to: **http://localhost:5173**
- Select **"Model 2"** from the sidebar (recommended)
- Navigate to **"Bulk Prediction"** page

### **Step 3: Generate Predictions**
1. Select category: **Grocery** or **Liquor** (or All)
2. Choose prediction date using calendar or shortcuts
3. Click **"Generate Predictions"**
4. Click **"Explain"** on any item for detailed analysis

---

## 📊 System Overview

### **What This System Does**
- **Analyzes Real Sales Data**: Processes your Excel sales files (2024-2025)
- **Predicts Future Demand**: Uses AI to forecast stock needs for any future date
- **Recommends Purchase Orders**: Tells you exactly what to buy and when
- **Provides Business Insights**: Shows sales trends, seasonal patterns, and financial impact

### **Key Features**
- ✅ **Accurate Predictions**: Based on actual consumption patterns from Net_Qty data
- ✅ **Calendar-Based Forecasting**: Select any future date up to 1 year ahead
- ✅ **Year-wise Analysis**: View monthly sales patterns for 2024 and 2025
- ✅ **Category Filtering**: Separate analysis for Grocery and Liquor items
- ✅ **Business Intelligence**: Stock velocity, sales trends, and financial metrics
- ✅ **Visual Charts**: Monthly sales graphs and historical performance
- ✅ **Export Ready**: Purchase recommendations ready for procurement

---

## 🏗️ System Architecture

### **Backend (Python)**
- **Port 8001**: Secondary Model API (Business-Focused)
- **Data Processing**: Reads Excel files from `inventory_model/data/`
- **AI Engine**: Enhanced prediction algorithms with seasonality
- **Business Logic**: Stock velocity, reorder points, safety stock calculations

### **Frontend (React)**
- **Port 5173**: Modern web dashboard
- **Real-time Updates**: Live data from backend API
- **Interactive Charts**: Year selector and monthly sales visualization
- **Responsive Design**: Works on desktop, tablet, and mobile

### **Data Sources**
```
inventory_model/data/Datatype_02_secondary/CSD SALE/
├── 2024/
│   ├── Grocery 2024/ (Excel files for each month)
│   └── Liquor 2024/  (Excel files for each month)
└── 2025/
    ├── Grocery 2025/ (Excel files for each month)
    └── Liquor 2025/  (Excel files for each month)
```

---

## 📈 How Predictions Work

### **Data Processing**
1. **Reads Excel Files**: Processes all monthly sales data (2024-2025)
2. **Cleans Data**: Removes formatting issues (#, ', commas) from Net_Qty column
3. **Groups Items**: Smart grouping by item names (e.g., DETTOL variants together)
4. **Calculates Metrics**: Monthly averages, trends, stock velocity

### **Prediction Algorithm**
1. **Base Demand**: Uses historical monthly averages
2. **Seasonality**: Applies seasonal factors (festivals, summer, etc.)
3. **Growth Trends**: Accounts for business growth patterns
4. **Safety Stock**: Adds buffer for demand variations
5. **Stock Status**: Categorizes as CRITICAL, LOW, ADEQUATE, or EXCESS

### **Example: KINGFISHER BEER**
- **Historical Data**: 4,268 total units sold (includes 363 from June 2025)
- **Monthly Average**: 355.67 units
- **Daily Consumption**: 13.11 units
- **Current Stock**: 124 units
- **Prediction**: Will run out in ~9 days → Status: CRITICAL

---

## 🎯 Using the System

### **Dashboard Navigation**
1. **Sidebar**: Switch between Model 1 (Generic) and Model 2 (Business-Focused)
2. **Dashboard**: Overview of critical items and business metrics
3. **Bulk Prediction**: Main prediction interface
4. **Data Upload**: Add new sales data (if needed)

### **Bulk Prediction Page**
1. **Category Filter**: Choose Grocery, Liquor, or All items
2. **Date Picker**: Select prediction date with shortcuts
3. **Generate Button**: Run predictions for selected criteria
4. **Results Table**: View all items with status, demand, and recommendations

### **Detailed Analysis (Click "Explain")**
- **Quick Summary**: Situation, action required, financial impact
- **Demand Projections**: Daily, weekly, monthly, quarterly breakdowns
- **Year-wise Charts**: Monthly sales patterns with year selector
- **Business Metrics**: Stock velocity, sales trends, historical performance
- **Key Insights**: Seasonal patterns and stock planning recommendations

---

## 🔧 Technical Requirements

### **Prerequisites**
- **Python 3.8+** (with pip)
- **Node.js 16+** (with npm)
- **Windows OS** (for .bat scripts)

### **Dependencies**
- **Python**: pandas, numpy, fastapi, uvicorn, pathlib
- **Node.js**: React, Vite, CSS modules

### **Installation (Automatic)**
The `start_system.bat` script automatically installs all dependencies.

---

## 📁 Project Structure

```
retail-ai-prediction/
├── start_system.bat           # 🚀 ONE-CLICK START SCRIPT
├── README.md                  # 📖 This file
├── requirements.txt           # 🐍 Python dependencies
├── test_system.py            # 🧪 System verification
├── .gitignore                # 📝 Git ignore rules
│
├── inventory_model_secondary/ # 🧠 AI Backend (Port 8001)
│   ├── src/
│   │   ├── api_business_focused.py      # Main API server
│   │   ├── business_intelligence.py     # Data analysis engine
│   │   ├── enhanced_predictions.py      # Advanced prediction algorithms
│   │   └── ...
│   ├── models/               # 🤖 Trained AI models
│   └── data/                 # 📊 Processed datasets
│
├── client/                   # 🌐 Frontend Dashboard (Port 5173)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── BulkPrediction.jsx      # Main prediction interface
│   │   │   ├── Dashboard.jsx           # Business overview
│   │   │   └── ...
│   │   ├── components/       # 🧩 Reusable UI components
│   │   └── api.js           # 🔌 Backend communication
│   ├── package.json         # 📦 Node.js dependencies
│   └── vite.config.js       # ⚡ Build configuration
│
└── inventory_model/          # 📊 Raw Data Storage
    └── data/
        └── Datatype_02_secondary/
            └── CSD SALE/     # 📈 Excel sales files (2024-2025)
```

---

## 🚨 Troubleshooting

### **Common Issues**

**1. Port Already in Use**
```bash
# Kill processes on ports 8001 or 5173
netstat -ano | findstr :8001
taskkill /F /PID [PID_NUMBER]
```

**2. Python Dependencies Error**
```bash
# Install manually
pip install -r requirements.txt
```

**3. Node.js Dependencies Error**
```bash
# Install manually
cd client
npm install
```

**4. Data Not Loading**
- Ensure Excel files are in `inventory_model/data/Datatype_02_secondary/CSD SALE/`
- Check file format: Tab-delimited with Net_Qty column
- Verify file permissions

### **System Verification**
```bash
# Test the system
python test_system.py
```

---

## 📊 Business Metrics Explained

### **Stock Status Categories**
- 🚨 **CRITICAL**: Less than 7 days of stock → Order immediately
- ⚠️ **LOW**: 7-30 days of stock → Plan to reorder soon
- ✅ **ADEQUATE**: 30+ days of stock → Sufficient inventory
- 📦 **EXCESS**: Too much stock → Reduce future orders

### **Key Metrics**
- **Stock Velocity**: How many months current stock will last
- **Sales Trend**: Increasing, stable, or decreasing pattern
- **Seasonal Factor**: Adjustment for festivals, summer, etc.
- **Revenue at Risk**: Money lost if items go out of stock

### **Prediction Confidence**
- **95%+**: Very reliable (12+ months of data)
- **85-94%**: Reliable (6-12 months of data)
- **70-84%**: Use caution (3-6 months of data)
- **<70%**: Limited data available

---

## 🎯 Best Practices

### **For Accurate Predictions**
1. **Regular Data Updates**: Add new monthly sales files
2. **Category Selection**: Use specific categories for focused analysis
3. **Seasonal Planning**: Order extra stock before festival seasons
4. **Monitor Trends**: Check sales trends monthly

### **For Business Decisions**
1. **Focus on Critical Items**: Address CRITICAL status items first
2. **Plan Ahead**: Use 3-month predictions for procurement planning
3. **Review Excess Stock**: Reduce orders for EXCESS items
4. **Track Performance**: Monitor prediction accuracy over time

---

## 🔄 Data Updates

### **Adding New Sales Data**
1. Place new Excel files in appropriate folders:
   - `inventory_model/data/Datatype_02_secondary/CSD SALE/YYYY/Category YYYY/`
2. Restart the system: `start_system.bat`
3. System automatically processes new data

### **File Format Requirements**
- **Format**: Tab-delimited (.xls or .xlsx)
- **Required Columns**: Item_Name, Net_Qty, R_Rate, Closing_Stock
- **Naming**: Follow existing pattern (e.g., "06 JUN.xls")

---

## 🚀 Deployment Guide

### **Local Deployment**
1. Copy entire project folder to target machine
2. Ensure Python 3.8+ and Node.js 16+ are installed
3. Run `start_system.bat`
4. Access via http://localhost:5173

### **Server Deployment**
1. **Backend**: Deploy `inventory_model_secondary/src/api_business_focused.py` on port 8001
2. **Frontend**: Build with `npm run build` and serve static files
3. **Data**: Ensure Excel files are accessible to backend
4. **Environment**: Set production environment variables

### **Cloud Deployment**
- **Backend**: Deploy to Heroku, AWS, or similar Python hosting
- **Frontend**: Deploy to Netlify, Vercel, or similar static hosting
- **Database**: Consider migrating Excel data to PostgreSQL/MySQL for production

---

## 📞 Support & Maintenance

### **System Monitoring**
- Check API health: http://localhost:8001/
- Monitor prediction accuracy through dashboard
- Review error logs in command windows

### **Performance Optimization**
- **Data**: Archive old sales data (keep last 2 years)
- **Cache**: System caches processed data for faster responses
- **Updates**: Restart system weekly for optimal performance

### **Backup Strategy**
- **Data**: Backup `inventory_model/data/` folder regularly
- **Models**: Backup `inventory_model_secondary/models/` folder
- **Configuration**: Backup entire project folder

---

## 📈 Future Enhancements

### **Planned Features**
- 📧 **Email Alerts**: Automatic notifications for critical stock
- 📱 **Mobile App**: Native mobile application
- 🔄 **Auto-sync**: Direct integration with POS systems
- 📊 **Advanced Analytics**: Profit optimization and supplier analysis
- 🤖 **ML Improvements**: Deep learning models for better accuracy

### **Integration Possibilities**
- **ERP Systems**: SAP, Oracle, Microsoft Dynamics
- **E-commerce**: Shopify, WooCommerce, Magento
- **Accounting**: QuickBooks, Tally, Zoho Books
- **Suppliers**: Direct purchase order generation

---

## 📄 License & Credits

**Developed for Retail Inventory Management**
- **Version**: 2.0 (Enhanced Business Intelligence)
- **Last Updated**: March 2026
- **Technology Stack**: Python (FastAPI), React (Vite), AI/ML Algorithms

**Data Processing**: Handles real business data with proper cleaning and validation
**Prediction Engine**: Custom algorithms optimized for retail consumption patterns
**User Interface**: Modern, responsive design for business users

---

## 🎉 Success Metrics

### **System Performance**
- ✅ **13,835 records** processed successfully
- ✅ **2,694 unique items** analyzed
- ✅ **95% prediction confidence** for items with sufficient data
- ✅ **Real-time processing** of bulk predictions

### **Business Impact**
- 🎯 **Accurate demand forecasting** based on actual consumption
- 💰 **Optimized inventory investment** through smart recommendations
- ⚡ **Reduced stockouts** with proactive alerts
- 📊 **Data-driven decisions** with comprehensive analytics

**Ready to transform your inventory management? Run `start_system.bat` and get started!** 🚀