# 🚀 Quick Start Guide

## 📖 Documentation Files
- **USER_GUIDE.md** - Complete guide on using the system (READ THIS FIRST!)
- **README.md** - Technical setup and installation
- **QUICK_START.md** - This file (fastest way to get started)

## ⚡ Start the System (3 Steps)

### Step 1: Start Backend Models
```bash
# Open 2 terminals:

# Terminal 1 - Primary Model (Port 8000)
start_primary_model.bat

# Terminal 2 - Secondary Model (Port 8001)  
start_secondary_model.bat
```

### Step 2: Start Frontend
```bash
# Terminal 3 - Frontend (Port 5173)
start_frontend.bat
```

### Step 3: Open Browser
Go to: **http://localhost:5173**

---

## 🎯 First Time Usage

1. **Go to Settings** → Select "Model 2 (Secondary)" → Save
2. **Go to Bulk Predictions**
3. Select **Category** (Grocery or Liquor)
4. Click **+1 Month** button
5. Click **Generate Predictions**
6. Review results!

---

## 💡 Understanding the Results

### Status Colors:
- 🚨 **RED (CRITICAL)** = Order TODAY
- ⚠️ **ORANGE (LOW)** = Order this week
- ✅ **GREEN (ADEQUATE)** = You're good
- 📦 **BLUE (EXCESS)** = Too much stock

### Key Numbers:
- **Current Stock** = What you have now
- **Predicted Demand** = What customers will buy
- **Order Quantity** = What you should order
- **Confidence** = How sure we are (higher is better)

### Click "Explain" on any item to see:
- Daily/Weekly/Monthly demand breakdown
- Financial impact (revenue, costs)
- Recent prediction accuracy

---

## 🎓 Learn More

Read **USER_GUIDE.md** for:
- Detailed explanations of every feature
- Tips for making better decisions
- Understanding all the metrics
- Common questions answered

---

## ⚠️ Troubleshooting

**Problem**: Can't access http://localhost:5173
- **Solution**: Make sure all 3 terminals are running

**Problem**: No predictions showing
- **Solution**: Check Settings → Make sure Model 2 is selected

**Problem**: "API Error" message
- **Solution**: Restart the backend models (start_*.bat files)

---

**Need Help?** Check USER_GUIDE.md or hover over ℹ️ icons in the interface!
