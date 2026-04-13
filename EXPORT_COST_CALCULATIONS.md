# Export Cost Calculations Feature

## Overview
Added comprehensive cost calculations to all export formats (CSV, Excel, JSON) for all three prediction types:
1. XGBoost Predictions (Normal Export)
2. Previous Years Analysis Export
3. Last N Months Analysis Export

## What's Included in Exports

### For Each Item:
- **Item Name** - Product name
- **Unit Cost (₹)** - Price per unit from database
- **Predicted Demand (Units)** - Number of units predicted
- **Total Cost (₹)** - Unit Cost × Predicted Demand
- **Category** - Grocery or Liquor
- **Current Stock** - Current inventory level
- **Trend** - increasing/decreasing/stable
- **Growth Rate** - Percentage change
- **Recommended Order** - Suggested order quantity
- **Confidence** - Prediction confidence percentage
- **Historical Data** - 2024/2025 totals and last 3 months

### Summary Section (At Bottom):
- **Total Items** - Number of items in export
- **Total Predicted Demand** - Sum of all predicted units
- **Net Total Cost (₹)** - Sum of all (Unit Cost × Predicted Demand)

## Export Formats

### 1. XGBoost Predictions Export
**File**: `client/src/services/predictionService.js`
- Includes: Unit Cost, Predicted Demand, Total Cost
- Summary: Total Demand + Net Total Cost
- Format: CSV with cost calculations

### 2. Previous Years Analysis Export
**File**: `client/src/utils/exportUtils.js`
- Includes: Unit Cost, Predicted Demand, Total Cost
- Breakdown: Yearly data for each item
- Summary: Total Items, Total Demand, Net Total Cost

### 3. Last N Months Analysis Export
**File**: `client/src/utils/exportUtils.js`
- Includes: Unit Cost, Predicted Demand, Total Cost
- Breakdown: Monthly data for each item
- Summary: Total Items, Total Demand, Net Total Cost

## Example Export Structure

```
Item Name,Category,Unit Cost (₹),Current Stock,Predicted Demand (Units),Total Cost (₹),Trend,Growth Rate,Recommended Order,Confidence,2024 Total Sales,2025 Total Sales,Month 1 Name,Month 1 Sales,Month 2 Name,Month 2 Sales,Month 3 Name,Month 3 Sales
"COCA COLA 250ML","Grocery","5.19",100,50,"259.50","stable","2.5%",45,"89.2%",1200,1500,"Apr 2026",50,"Mar 2026",48,"Feb 2026",45
"GILLETTE MACH 3 TURBO 8PACK","Grocery","150.00",20,15,"2250.00","increasing","5.0%",12,"92.1%",300,350,"Apr 2026",15,"Mar 2026",14,"Feb 2026",13
...
"TOTAL","","","",65,"2509.50","","","","","","","","","","","",""
```

## Files Modified

1. **client/src/services/predictionService.js**
   - Updated `exportToCSV()` to include:
     - Unit Cost column
     - Total Cost calculation (Unit Cost × Predicted Demand)
     - Summary row with totals

2. **client/src/utils/exportUtils.js**
   - Updated `generatePredictionReport()` to include:
     - Unit Cost for each item
     - Predicted Demand (rounded)
     - Total Cost calculation
     - Net Total Cost in summary
     - Works for both Previous Years and Last N Months

## How to Use

### XGBoost Export (Normal Predictions)
1. Go to Bulk Predictions page
2. Click "Export Results" button
3. Choose CSV/Excel format
4. File includes: Unit Cost, Predicted Demand, Total Cost, and Net Total

### Previous Years Export
1. Go to Bulk Predictions page
2. Click "Predict Based on Previous Years"
3. Click "Export Results" button
4. File includes: Unit Cost, Predicted Demand, Total Cost, Yearly breakdown, and Net Total

### Last N Months Export
1. Go to Bulk Predictions page
2. Click "Predict Based on Last N Months"
3. Click "Export Results" button
4. File includes: Unit Cost, Predicted Demand, Total Cost, Monthly breakdown, and Net Total

## Cost Calculation Formula

```
Total Cost for Item = Unit Cost (₹) × Predicted Demand (Units)
Net Total Cost = Sum of all (Unit Cost × Predicted Demand)
```

## Example Calculation

```
Item: COCA COLA 250ML
Unit Cost: ₹5.19
Predicted Demand: 50 units
Total Cost: 5.19 × 50 = ₹259.50

Item: GILLETTE MACH 3 TURBO 8PACK
Unit Cost: ₹150.00
Predicted Demand: 15 units
Total Cost: 150.00 × 15 = ₹2,250.00

Net Total Cost: ₹259.50 + ₹2,250.00 = ₹2,509.50
```

## Deployment

```bash
git add .
git commit -m "Feature: Add cost calculations to all exports (Unit Cost, Total Cost, Net Total)"
git push

# On server:
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Testing

1. Go to Bulk Predictions page
2. Generate predictions
3. Export to CSV/Excel
4. Verify columns:
   - ✓ Unit Cost (₹) column present
   - ✓ Predicted Demand (Units) column present
   - ✓ Total Cost (₹) column present
   - ✓ Summary row at bottom with totals
   - ✓ Net Total Cost calculated correctly

5. Test Previous Years export
   - ✓ Unit Cost included
   - ✓ Total Cost calculated
   - ✓ Net Total in summary

6. Test Last N Months export
   - ✓ Unit Cost included
   - ✓ Total Cost calculated
   - ✓ Net Total in summary

## Notes

- All costs are in Indian Rupees (₹)
- Unit Cost comes from the `price` field in database
- Predicted Demand is rounded to nearest integer
- Total Cost is calculated as: Unit Cost × Predicted Demand
- Net Total Cost is sum of all item costs
- Works for all export formats: CSV, Excel, JSON
- Summary row appears at the bottom of export
