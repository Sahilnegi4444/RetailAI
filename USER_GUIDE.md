# 📖 User Guide - Retail Inventory Prediction System

## 🎯 What This System Does

This AI-powered system helps you manage your store inventory by:
- **Predicting future demand** based on your actual sales history
- **Recommending order quantities** to avoid stockouts
- **Calculating financial impact** of inventory decisions
- **Tracking sales trends** and seasonal patterns

---

## 🖥️ Understanding the Interface

### 📊 Dashboard

**What you see:**
- **Model Accuracy**: How accurate our predictions are (higher is better)
- **Avg Error**: Average difference between predicted and actual sales (lower is better)
- **Forecast Period**: How many weeks ahead we're predicting
- **Expected Demand**: Total units customers will buy in the forecast period

**What it means for you:**
- Check if predictions are reliable (accuracy > 80% is good)
- Monitor trends to understand your business patterns
- Use forecasts to plan purchases ahead of time

---

### 📋 Bulk Order Predictions

**What you see:**

#### Summary Cards:
1. **Total Products** - How many items we analyzed
2. **Critical Stock** 🚨 - Items that will run out soon → **ORDER IMMEDIATELY**
3. **Low Stock** ⚠️ - Items running low → **Plan to reorder soon**
4. **Total Order Value** 💰 - Money needed to buy all recommended items
5. **Revenue at Risk** ⚡ - Sales you'll lose if you don't restock

#### Product Table Columns:
- **Status**: 
  - 🚨 **CRITICAL** = Order NOW (will run out very soon)
  - ⚠️ **LOW** = Order Soon (running low)
  - ✅ **ADEQUATE** = Sufficient stock
  - 📦 **EXCESS** = Too much stock (reduce orders)

- **Current Stock** = Units you have right now
- **Predicted Demand** = Units customers will buy by selected date
- **Order Quantity** = Units you should order (includes safety stock)
- **Order Value** = Total cost to purchase recommended quantity
- **Confidence** = How accurate this prediction is (based on sales history)

#### Demand Breakdown (Click "Explain"):
- **Daily Average**: How many units sell per day
  - **Low** = Conservative estimate (worst case)
  - **Average** = Most likely scenario
  - **High** = Optimistic estimate (best case)

- **Weekly**: Expected sales for next 7 days
- **Monthly**: Expected sales for next 30 days

#### Financial Impact:
- **Expected Revenue** = Money you'll make from selling this item
- **Revenue at Risk** = Money you'll lose if you run out of stock
- **Unit Price** = Cost per item

#### Last 4 Weeks Performance:
- Shows how accurate our predictions were recently
- **Accuracy %** = How close we were to actual sales

---

## 🎮 How to Use

### Step 1: Select Your Model
1. Go to **Settings** page
2. Choose:
   - **Model 1 (Primary)**: General retail data
   - **Model 2 (Secondary)**: Your actual store data (2024-2025)
3. Click "Save Settings"

### Step 2: Generate Predictions
1. Go to **Bulk Predictions** page
2. Select **Category** (All / Grocery / Liquor)
3. Choose **Prediction Date**:
   - Use shortcuts: +1 Week, +1 Month, +3 Months
   - Or pick any date up to 1 year ahead
4. Click **Generate Predictions**

### Step 3: Review Results
1. Check **Summary Cards** for overview
2. Focus on **Critical Stock** items first (order immediately)
3. Review **Low Stock** items (plan to order soon)
4. Click **Explain** on any item for detailed breakdown

### Step 4: Make Decisions
- **Critical Items**: Order the recommended quantity NOW
- **Low Items**: Add to next week's order
- **Adequate Items**: Monitor, no action needed
- **Excess Items**: Reduce future orders

---

## 💡 Tips for Best Results

### Understanding Predictions:
- **Higher confidence (>80%)** = More reliable prediction
- **Lower confidence (<70%)** = Less sales history, be cautious
- **Seasonal items** = Predictions adjust for festivals/seasons

### When to Order:
- **Critical Status**: Order within 1-2 days
- **Low Status**: Order within 1 week
- **Check weekly**: Run predictions every Monday

### Saving Money:
- Focus on **high revenue items** first (sort by Order Value)
- Avoid **excess stock** (ties up your money)
- Use **Low estimates** for slow-moving items
- Use **High estimates** for fast-moving items

### Improving Accuracy:
- System learns from your actual sales
- More sales history = better predictions
- Update regularly for best results

---

## 📈 Reading the Charts

### Historical Performance Chart:
- **Blue line** = Actual sales
- **Orange line** = Our predictions
- **Closer lines** = Better accuracy

### Demand Forecast Chart:
- Shows expected sales for coming weeks
- Use to plan purchases ahead of time
- Higher bars = more demand expected

---

## ⚠️ Common Questions

**Q: Why are some predictions low confidence?**
A: Not enough sales history for that item. Be cautious with these predictions.

**Q: What if I disagree with a recommendation?**
A: Use your business judgment! The system provides guidance, you make final decisions.

**Q: How often should I check predictions?**
A: Weekly is recommended. Daily for fast-moving items.

**Q: What's the difference between the two models?**
- **Model 1**: General retail patterns (good for new items)
- **Model 2**: Your actual store data (more accurate for your business)

**Q: Why does Order Quantity differ from Predicted Demand?**
A: Order Quantity includes safety stock to prevent stockouts and account for uncertainties.

---

## 🎯 Quick Decision Guide

| Status | What It Means | Action | Urgency |
|--------|---------------|--------|---------|
| 🚨 CRITICAL | Will run out in <7 days | Order NOW | Immediate |
| ⚠️ LOW | Will run out in 7-30 days | Plan to order | This week |
| ✅ ADEQUATE | Sufficient for 30+ days | Monitor | No action |
| 📦 EXCESS | Too much stock | Reduce orders | Next cycle |

---

## 📞 Need Help?

- Check tooltips (ℹ️ icons) throughout the interface
- Hover over any metric for explanation
- Review this guide regularly

---

**Remember**: This system is a tool to help you make better decisions. Always use your business knowledge and judgment when making final inventory decisions!
