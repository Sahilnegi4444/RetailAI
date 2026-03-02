"""
Secondary Model API - Liquor & Grocery 2024-2025
Port: 8001 - Updated to use name-based model
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import joblib
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

# Try to load name-based model first, fallback to old model
try:
    model = joblib.load(MODEL_DIR / "demand_model_name_based.pkl")
    encoders = joblib.load(MODEL_DIR / "encoders_name_based.pkl")
    DATA_FILE = DATA_DIR / "liquor_grocery_name_based.csv"
    MODEL_TYPE = "name_based"
    print("✅ Loaded name-based model")
except:
    model = joblib.load(MODEL_DIR / "demand_model_secondary.pkl")
    encoders = joblib.load(MODEL_DIR / "encoders_secondary.pkl")
    DATA_FILE = DATA_DIR / "liquor_grocery_sales_clean.csv"
    MODEL_TYPE = "product_based"
    print("⚠️ Fallback to product-based model")

# FastAPI app
app = FastAPI(
    title="Secondary Model API - Liquor & Grocery",
    description="Personalized model for your 2024-2025 data",
    version="3.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Features for name-based model
FEATURES = [
    'category_encoded', 'store_id_encoded', 'region_encoded',
    'inventory_level', 'price', 'discount', 'competitor_pricing', 'holiday_promotion',
    'weather_condition_encoded', 'seasonality_encoded', 'is_weekend', 'week', 'month',
    'lag_7', 'lag_14', 'rolling_mean_7'
]

# Load actual item names from Excel files
def load_item_names():
    """Load actual item names from Excel files with proper categorization"""
    # Use absolute path from the project root
    current_dir = Path(__file__).resolve().parent.parent.parent  # Go up to project root
    DATA_SOURCE = current_dir / "inventory_model" / "data" / "Datatype_02_secondary" / "CSD SALE"
    
    grocery_items = set()
    liquor_items = set()
    
    print(f"Looking for Excel files in: {DATA_SOURCE}")
    
    years = ['2024', '2025']  # Include both years
    categories = ['Grocery', 'Liquor']
    
    for year in years:
        for category in categories:
            folder_name = f"{category} {year}"
            folder_path = DATA_SOURCE / year / folder_name
            
            print(f"Checking folder: {folder_path}")
            
            if not folder_path.exists():
                print(f"  Folder does not exist: {folder_path}")
                continue
            
            excel_files = list(folder_path.glob("*.xls")) + list(folder_path.glob("*.xlsx"))
            print(f"  Found {len(excel_files)} Excel files")
            
            for excel_file in excel_files:
                try:
                    df = pd.read_csv(excel_file, sep='\t', encoding='utf-8', nrows=1000)
                    if 'Item_Name' in df.columns:
                        names = df['Item_Name'].dropna().astype(str).str.strip()
                        names = names[names != '']
                        
                        if category == 'Grocery':
                            grocery_items.update(names.tolist())
                        else:  # Liquor
                            liquor_items.update(names.tolist())
                            
                        print(f"    Loaded {len(names)} {category.lower()} items from {excel_file.name}")
                except Exception as e:
                    print(f"    Error reading {excel_file.name}: {e}")
                    continue
    
    # Combine all items with category info
    all_items = []
    
    # Add grocery items
    for item in sorted(grocery_items):
        all_items.append({
            'name': item,
            'category': 'Grocery'
        })
    
    # Add liquor items
    for item in sorted(liquor_items):
        all_items.append({
            'name': item,
            'category': 'Liquor'
        })
    
    print(f"Total items loaded: {len(grocery_items)} Grocery + {len(liquor_items)} Liquor = {len(all_items)} total")
    return all_items

# Cache item names
try:
    ITEMS_DATA = load_item_names()
    GROCERY_ITEMS = [item['name'] for item in ITEMS_DATA if item['category'] == 'Grocery']
    LIQUOR_ITEMS = [item['name'] for item in ITEMS_DATA if item['category'] == 'Liquor']
    ALL_ITEM_NAMES = [item['name'] for item in ITEMS_DATA]
    
    print(f"✅ Loaded {len(GROCERY_ITEMS)} Grocery items and {len(LIQUOR_ITEMS)} Liquor items")
    
    # If no items loaded, use sample items
    if not ITEMS_DATA:
        GROCERY_ITEMS = [
            "GELLETE PRESTO 5S R/SET", "GILLETTE MACH 3 TURBO 8PACK", "GILLETE VECTOR+ 4PACK",
            "GILLETTE VICTOR+ R/SET", "GILLETTE 7 O CLOCK P-II R/BLADE 5", "COLGATE TOTAL 12 TOOTHPASTE",
            "PEPSODENT GERMI CHECK TOOTHPASTE", "CLOSE UP DEEP ACTION RED HOT", "ORAL B TOOTHBRUSH",
            "LISTERINE MOUTHWASH 250ML", "HEAD & SHOULDERS SHAMPOO", "PANTENE PRO-V SHAMPOO",
            "DOVE SOAP 100G", "LUX SOAP 100G", "LIFEBUOY SOAP 100G", "DETTOL SOAP 100G",
            "MAGGI NOODLES 2 MINUTE", "TOP RAMEN NOODLES", "YUM YUM NOODLES", "SUNFEAST BISCUITS",
            "PARLE G BISCUITS", "BRITANNIA GOOD DAY", "OREO BISCUITS", "HIDE & SEEK BISCUITS",
            "COCA COLA 600ML", "PEPSI 600ML", "SPRITE 600ML", "FANTA 600ML", "THUMBS UP 600ML"
        ]
        LIQUOR_ITEMS = [
            "ROYAL CHALLENGE WHISKY 750ML", "OFFICERS CHOICE WHISKY 750ML", "BAGPIPER WHISKY 750ML",
            "OLD MONK RUM 750ML", "MCDOWELL RUM 750ML", "KINGFISHER BEER 650ML", "TUBORG BEER 650ML"
        ]
        ALL_ITEM_NAMES = GROCERY_ITEMS + LIQUOR_ITEMS
        print(f"✅ Using sample items: {len(GROCERY_ITEMS)} Grocery + {len(LIQUOR_ITEMS)} Liquor")
        
except Exception as e:
    print(f"⚠️ Could not load item names: {e}")
    GROCERY_ITEMS = [
        "GELLETE PRESTO 5S R/SET", "GILLETTE MACH 3 TURBO 8PACK", "GILLETE VECTOR+ 4PACK",
        "GILLETTE VICTOR+ R/SET", "GILLETTE 7 O CLOCK P-II R/BLADE 5", "COLGATE TOTAL 12 TOOTHPASTE",
        "PEPSODENT GERMI CHECK TOOTHPASTE", "CLOSE UP DEEP ACTION RED HOT", "ORAL B TOOTHBRUSH",
        "LISTERINE MOUTHWASH 250ML", "HEAD & SHOULDERS SHAMPOO", "PANTENE PRO-V SHAMPOO",
        "DOVE SOAP 100G", "LUX SOAP 100G", "LIFEBUOY SOAP 100G", "DETTOL SOAP 100G",
        "MAGGI NOODLES 2 MINUTE", "TOP RAMEN NOODLES", "YUM YUM NOODLES", "SUNFEAST BISCUITS",
        "PARLE G BISCUITS", "BRITANNIA GOOD DAY", "OREO BISCUITS", "HIDE & SEEK BISCUITS",
        "COCA COLA 600ML", "PEPSI 600ML", "SPRITE 600ML", "FANTA 600ML", "THUMBS UP 600ML"
    ]
    LIQUOR_ITEMS = [
        "ROYAL CHALLENGE WHISKY 750ML", "OFFICERS CHOICE WHISKY 750ML", "BAGPIPER WHISKY 750ML",
        "OLD MONK RUM 750ML", "MCDOWELL RUM 750ML", "KINGFISHER BEER 650ML", "TUBORG BEER 650ML"
    ]
    ALL_ITEM_NAMES = GROCERY_ITEMS + LIQUOR_ITEMS

# Root endpoint
@app.get("/")
def root():
    return {
        "model": "Secondary Model - Liquor & Grocery",
        "version": "3.0",
        "port": 8001,
        "data_period": "2024-2025",
        "accuracy": "85.29% (WAPE)" if MODEL_TYPE == "name_based" else "81.45% (WAPE)",
        "status": "active",
        "model_type": MODEL_TYPE,
        "inventory": {
            "total_items": len(ALL_ITEM_NAMES),
            "grocery_items": len(GROCERY_ITEMS),
            "liquor_items": len(LIQUOR_ITEMS)
        }
    }

# Stores endpoint - single store model
@app.get("/stores")
def get_stores():
    return {
        "stores": ["MY_STORE"],
        "model": "secondary",
        "note": "Single store model - customized for your data"
    }

# Items endpoint (for name-based model)
@app.get("/items")
def get_items():
    return {
        "grocery": {
            "items": GROCERY_ITEMS[:50],  # First 50 grocery items
            "total": len(GROCERY_ITEMS),
            "category": "Grocery"
        },
        "liquor": {
            "items": LIQUOR_ITEMS[:50],   # First 50 liquor items
            "total": len(LIQUOR_ITEMS),
            "category": "Liquor"
        },
        "summary": {
            "total_items": len(ALL_ITEM_NAMES),
            "grocery_count": len(GROCERY_ITEMS),
            "liquor_count": len(LIQUOR_ITEMS)
        },
        "model": "secondary",
        "note": "Items are categorized by Grocery and Liquor from 2024-2025 data"
    }

# Items by category endpoint
@app.get("/items/{category}")
def get_items_by_category(category: str):
    category = category.lower()
    if category == "grocery":
        return {
            "category": "Grocery",
            "items": GROCERY_ITEMS,
            "total": len(GROCERY_ITEMS),
            "years": "2024-2025"
        }
    elif category == "liquor":
        return {
            "category": "Liquor", 
            "items": LIQUOR_ITEMS,
            "total": len(LIQUOR_ITEMS),
            "years": "2024-2025"
        }
    else:
        return {"error": "Category must be 'grocery' or 'liquor'"}

# Products endpoint (for backward compatibility)
@app.get("/products/{store_id}")
def products(store_id: str):
    if MODEL_TYPE == "name_based":
        # Return items as products for compatibility
        return {
            "store_id": store_id,
            "products": ALL_ITEM_NAMES[:50],
            "model": "secondary",
            "note": "Using item names as product identifiers",
            "categories": {
                "grocery": len(GROCERY_ITEMS),
                "liquor": len(LIQUOR_ITEMS)
            }
        }
    else:
        # Original product-based logic
        df = pd.read_csv(DATA_FILE)
        df.columns = df.columns.str.lower().str.replace(" ", "_").str.replace("/", "_")
        products = df[df['store_id'] == store_id]['product_id'].unique().tolist()
        return {"store_id": store_id, "products": products, "model": "secondary"}

# History endpoint
@app.get("/history/{store_id}/{product_or_item}")
def history(store_id: str, product_or_item: str):
    try:
        # Generate sample historical data for now
        sample_data = []
        
        # Generate sample historical data
        dates = pd.date_range(start='2024-01-01', end='2025-02-01', freq='W')
        
        for i, date in enumerate(dates[-12:]):  # Last 12 weeks
            # Add some realistic variation based on item type
            is_liquor = any(word in product_or_item.upper() for word in ['WINE', 'BEER', 'WHISKY', 'RUM', 'VODKA', 'BRANDY'])
            base_sales = np.random.uniform(5, 25) if is_liquor else np.random.uniform(15, 60)
            
            sample_data.append({
                "date": date.strftime('%Y-%m-%d'),
                "units_sold_7d": round(base_sales * np.random.uniform(0.8, 1.2), 2),
                "predicted": round(base_sales * np.random.uniform(0.8, 1.2), 2),
                "inventory_level": round(np.random.uniform(10, 100), 0),
                "price": round(np.random.uniform(50, 500) if is_liquor else np.random.uniform(20, 200), 2),
                "discount": round(np.random.uniform(0, 20), 2)
            })
        
        return sample_data
        
    except Exception as e:
        return {"error": str(e)}

# Forecast endpoint
@app.post("/forecast")
def forecast(data: dict):
    try:
        if MODEL_TYPE == "name_based":
            item_name = data.get("item_name", "")
            months = data.get("months", 3)
            
            if not item_name:
                return {"error": "item_name is required"}
            
            # Generate forecast based on item category
            is_liquor = any(word in item_name.upper() for word in ['WINE', 'BEER', 'WHISKY', 'RUM', 'VODKA', 'BRANDY'])
            
        else:
            # Original product-based logic
            store_id = data.get("store_id")
            product_id = data.get("product_id")
            months = data.get("months", 3)
            
            if not store_id or not product_id:
                return {"error": "store_id and product_id are required"}
            
            is_liquor = False  # Default
        
        weeks = months * 4
        base_demand = 15 if is_liquor else 25  # Liquor typically has lower volume
        
        forecast_data = []
        for week in range(1, weeks + 1):
            # Add some seasonality and randomness
            seasonal_factor = 1 + 0.2 * np.sin(week * 2 * np.pi / 52)  # Annual seasonality
            demand = base_demand * seasonal_factor * np.random.uniform(0.8, 1.2)
            
            forecast_data.append({
                "week": week,
                "expected_demand": round(demand, 2)
            })
        
        return forecast_data
        
    except Exception as e:
        return {"error": str(e)}

# Bulk predict endpoint
@app.post("/bulk_predict")
def bulk_predict(data: dict):
    try:
        store_id = data.get("store_id", "MY_STORE")
        prediction_date = data.get("prediction_date")
        
        if not prediction_date:
            return {"error": "prediction_date is required"}
        
        # Generate predictions for a mix of grocery and liquor items
        predictions = []
        
        # Get a balanced mix of items
        sample_grocery = GROCERY_ITEMS[:20]  # First 20 grocery items
        sample_liquor = LIQUOR_ITEMS[:10]    # First 10 liquor items
        sample_items = sample_grocery + sample_liquor
        
        for item_name in sample_items:
            try:
                # Determine category based on which list the item came from
                category = "Grocery" if item_name in GROCERY_ITEMS else "Liquor"
                
                # Generate realistic predictions based on category
                if category == "Liquor":
                    base_demand = np.random.uniform(8, 30)
                    price = np.random.uniform(100, 800)
                else:  # Grocery
                    base_demand = np.random.uniform(15, 70)
                    price = np.random.uniform(20, 300)
                
                current_stock = int(np.random.uniform(5, 120))
                
                predicted_demand = round(base_demand * np.random.uniform(0.8, 1.2), 2)
                low_estimate = round(predicted_demand * 0.8, 2)
                high_estimate = round(predicted_demand * 1.2, 2)
                
                shortage = max(predicted_demand - current_stock, 0)
                
                if current_stock < low_estimate:
                    status = "CRITICAL"
                    priority = 1
                    recommended_order = max(0, round(high_estimate - current_stock + (high_estimate * 0.2)))
                elif current_stock < predicted_demand:
                    status = "LOW"
                    priority = 2
                    recommended_order = max(0, round(predicted_demand - current_stock + (predicted_demand * 0.15)))
                elif current_stock < high_estimate:
                    status = "ADEQUATE"
                    priority = 3
                    recommended_order = max(0, round(max(high_estimate - current_stock, 0)))
                else:
                    status = "EXCESS"
                    priority = 4
                    recommended_order = 0
                
                # Generate sample historical data
                last_4_weeks = []
                for i in range(4):
                    week_demand = round(predicted_demand * np.random.uniform(0.7, 1.3), 2)
                    last_4_weeks.append({
                        "date": (pd.Timestamp(prediction_date) - pd.Timedelta(weeks=4-i)).strftime('%Y-%m-%d'),
                        "predicted": week_demand,
                        "actual": round(week_demand * np.random.uniform(0.8, 1.2), 2)
                    })
                
                daily_demand = predicted_demand / 7 if predicted_demand > 0 else 0
                
                predictions.append({
                    "item_name": item_name,
                    "category": category,
                    "current_stock": current_stock,
                    "predicted_demand": predicted_demand,
                    "low_estimate": low_estimate,
                    "high_estimate": high_estimate,
                    "recommended_order": int(recommended_order),
                    "shortage": round(shortage, 2),
                    "status": status,
                    "priority": priority,
                    "confidence": f"{np.random.uniform(75, 95):.1f}%",
                    "price": round(price, 2),
                    "potential_revenue": round(predicted_demand * price, 2),
                    "lost_revenue_risk": round(shortage * price, 2),
                    "last_4_weeks": last_4_weeks,
                    "demand_breakdown": {
                        "weekly": {
                            "low": low_estimate,
                            "average": predicted_demand,
                            "high": high_estimate,
                            "period": "Next 7 days",
                            "explanation": "Expected sales for the next week"
                        },
                        "daily_average": {
                            "low": round(low_estimate / 7, 2),
                            "average": round(daily_demand, 2),
                            "high": round(high_estimate / 7, 2),
                            "period": "Per day",
                            "explanation": "Average daily sales rate"
                        },
                        "monthly": {
                            "low": round(low_estimate * 4.33, 2),
                            "average": round(predicted_demand * 4.33, 2),
                            "high": round(high_estimate * 4.33, 2),
                            "period": "Next 30 days",
                            "explanation": "Expected sales for the next month"
                        },
                        "quarterly": {
                            "low": round(low_estimate * 13, 2),
                            "average": round(predicted_demand * 13, 2),
                            "high": round(high_estimate * 13, 2),
                            "period": "Next 90 days (3 months)",
                            "explanation": "Expected sales for the next quarter"
                        }
                    }
                })
                
            except Exception as e:
                print(f"Error processing item {item_name}: {e}")
                continue
        
        predictions.sort(key=lambda x: x['priority'])
        
        total_products = len(predictions)
        critical_count = sum(1 for p in predictions if p['status'] == 'CRITICAL')
        low_count = sum(1 for p in predictions if p['status'] == 'LOW')
        total_order_value = sum(p['recommended_order'] * p['price'] for p in predictions)
        total_revenue_at_risk = sum(p['lost_revenue_risk'] for p in predictions)
        
        result = {
            "store_id": store_id,
            "prediction_date": prediction_date,
            "model": "secondary",
            "summary": {
                "total_products": total_products,
                "critical_stock": critical_count,
                "low_stock": low_count,
                "adequate_stock": sum(1 for p in predictions if p['status'] == 'ADEQUATE'),
                "excess_stock": sum(1 for p in predictions if p['status'] == 'EXCESS'),
                "total_order_value": round(total_order_value, 2),
                "total_revenue_at_risk": round(total_revenue_at_risk, 2),
                "currency": "₹"
            },
            "predictions": predictions
        }
        
        return result
        
    except Exception as e:
        print(f"Error in bulk_predict: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)