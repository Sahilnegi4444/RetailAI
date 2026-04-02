"""
Production API - Full Pipeline Integration
Upload → Process → Store → Predict → Retrain → Display
"""

import os
import io
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

from inventory_model_secondary.src.hybrid_active import HybridActiveSystem, normalize_name
from inventory_model_secondary.src.database_manager import DatabaseManager
from inventory_model_secondary.src.data_cleaning_pipeline import DataCleaner
from inventory_model_secondary.src.ml_training_from_db import MLTrainerFromDB
from inventory_model_secondary.src.analytics_engine import AnalyticsEngine
from inventory_model_secondary.src.advanced_predictions import AdvancedPredictions

# Pydantic models
class PredictRequest(BaseModel):
    prediction_date: str = None
    
    class Config:
        extra = "allow"  # Allow extra fields

class PredictPreviousYearsRequest(BaseModel):
    items: list
    target_date: str

class PredictLastNMonthsRequest(BaseModel):
    items: list
    n_months: int = 4

# Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8001))

print(f"[CONFIG] Starting Production API")
print(f"[CONFIG] Host: {HOST}, Port: {PORT}")

# Initialize systems
try:
    hybrid = HybridActiveSystem()
    print("[INIT] Hybrid system loaded")
except FileNotFoundError as e:
    print(f"[WARN] Model files not found: {e}")
    print("[INIT] Training models from database...")
    try:
        trainer = MLTrainerFromDB()
        success = trainer.train()
        if success:
            print("[INIT] Models trained successfully, loading hybrid system...")
            hybrid = HybridActiveSystem()
            print("[INIT] Hybrid system loaded")
        else:
            print("[ERROR] Model training failed")
            hybrid = None
    except Exception as train_err:
        print(f"[ERROR] Failed to train models: {train_err}")
        import traceback
        traceback.print_exc()
        hybrid = None
except Exception as e:
    print(f"[ERROR] Failed to load hybrid system: {e}")
    import traceback
    traceback.print_exc()
    hybrid = None

db = DatabaseManager()
analytics = AnalyticsEngine(db)
advanced_pred = AdvancedPredictions()

# FastAPI app
app = FastAPI(
    title="Production ML Demand Forecasting API",
    description="Full pipeline: Upload → Process → Store → Predict → Retrain",
    version="8.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# PART 1: DATA UPLOAD & PROCESSING
# ============================================================================

@app.post("/test-upload")
async def test_upload(request: Request):
    """Test endpoint to debug form data issues"""
    try:
        print(f"\n[TEST] === TEST UPLOAD REQUEST ===")
        print(f"[TEST] Method: {request.method}")
        print(f"[TEST] URL: {request.url}")
        print(f"[TEST] Headers: {dict(request.headers)}")
        
        # Try to parse form data
        try:
            form = await request.form()
            print(f"[TEST] Form keys: {list(form.keys())}")
            
            for key, value in form.items():
                if hasattr(value, 'filename'):
                    print(f"[TEST] File field '{key}': {value.filename} ({value.content_type})")
                else:
                    print(f"[TEST] Text field '{key}': {value}")
            
            return {"status": "success", "form_keys": list(form.keys())}
            
        except Exception as e:
            print(f"[TEST] Form parsing failed: {e}")
            
            # Try raw body
            body = await request.body()
            print(f"[TEST] Raw body length: {len(body)}")
            print(f"[TEST] Raw body preview: {body[:500]}")
            
            return {"status": "error", "error": str(e), "body_length": len(body)}
            
    except Exception as e:
        print(f"[TEST] Request failed: {e}")
        return {"status": "error", "error": str(e)}

@app.post("/upload-data")
async def upload_data(request: Request):
    """Upload Excel/CSV file and process it - flexible parameter handling"""
    try:
        print(f"\n[UPLOAD] === NEW UPLOAD REQUEST ===")
        print(f"[UPLOAD] Request method: {request.method}")
        print(f"[UPLOAD] Request URL: {request.url}")
        print(f"[UPLOAD] Content-Type: {request.headers.get('content-type', 'Not set')}")
        print(f"[UPLOAD] Request headers: {dict(request.headers)}")
        
        # Check content type
        content_type = request.headers.get('content-type', '')
        print(f"[UPLOAD] Content-Type header: {content_type}")
        
        if not content_type.startswith('multipart/form-data'):
            print(f"[UPLOAD] WARNING: Unexpected content type: {content_type}")
        
        # Parse form data manually with error handling
        try:
            form = await request.form()
            print(f"[UPLOAD] Form data keys: {list(form.keys())}")
        except Exception as form_error:
            print(f"[UPLOAD] ERROR: Failed to parse form data: {form_error}")
            # Try to read raw body
            try:
                body = await request.body()
                print(f"[UPLOAD] Raw body size: {len(body)} bytes")
                print(f"[UPLOAD] Raw body preview: {body[:200]}")
            except Exception as body_error:
                print(f"[UPLOAD] ERROR: Failed to read body: {body_error}")
            
            return JSONResponse(
                status_code=400,
                content={"error": "Failed to parse form data. Please check file upload format.", "success": False}
            )
        
        # Extract file and parameters
        file = None
        year = None
        month = None
        category = None
        
        for key, value in form.items():
            print(f"[UPLOAD] Form field: {key} = {value} (type: {type(value)})")
            if key == 'file':
                file = value
            elif key == 'year':
                year = str(value)
            elif key == 'month':
                month = str(value)
            elif key == 'category':
                category = str(value)
        
        if not file:
            print("[UPLOAD] ERROR: No file in form data")
            print(f"[UPLOAD] Available form keys: {list(form.keys())}")
            return JSONResponse(
                status_code=400,
                content={"error": "No file provided in form data", "success": False}
            )
        
        print(f"[UPLOAD] File: {file.filename}, size: {file.size if hasattr(file, 'size') else 'unknown'}")
        print(f"[UPLOAD] Raw parameters: year={year}, month={month}, category={category}")
        
        # Convert parameters to proper types
        try:
            year_int = int(year) if year else datetime.now().year
            month_int = int(month) if month else datetime.now().month
            category_str = category if category else "Grocery"
        except (ValueError, TypeError) as e:
            print(f"[UPLOAD] ERROR: Invalid parameter types: {e}")
            return JSONResponse(
                status_code=400,
                content={"error": f"Invalid parameter format: {e}", "success": False}
            )
        
        print(f"[UPLOAD] Converted parameters: year={year_int}, month={month_int}, category={category_str}")
        
        # Validate file
        if not file.filename:
            print("[UPLOAD] ERROR: No filename provided")
            return JSONResponse(
                status_code=400,
                content={"error": "No file provided", "success": False}
            )
        
        if not file.filename.lower().endswith(('.xlsx', '.xls', '.csv')):
            print(f"[UPLOAD] ERROR: Invalid file type: {file.filename}")
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid file type. Please upload Excel (.xlsx, .xls) or CSV files only", "success": False}
            )
        
        # Read file
        print("[UPLOAD] Reading file content...")
        content = await file.read()
        print(f"[UPLOAD] File content size: {len(content)} bytes")
        
        if len(content) == 0:
            print("[UPLOAD] ERROR: Empty file")
            return JSONResponse(
                status_code=400,
                content={"error": "File is empty", "success": False}
            )
        
        # Determine file type and read
        print("[UPLOAD] Parsing file...")
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        print(f"[UPLOAD] File has {len(df)} rows and {len(df.columns)} columns")
        print(f"[UPLOAD] Columns: {list(df.columns)}")
        
        # Clean data
        cleaner = DataCleaner()
        
        # Validate columns before processing
        is_valid, validation_message = cleaner.validate_columns(df)
        if not is_valid:
            print(f"[UPLOAD] ERROR: Column validation failed: {validation_message}")
            return JSONResponse(
                status_code=400,
                content={"error": f"Invalid file format: {validation_message}", "success": False}
            )
        
        print(f"[UPLOAD] Column validation passed: {validation_message}")
        
        # Normalize column names
        print(f"[UPLOAD] Original columns: {list(df.columns)}")
        df.columns = [col.strip().upper() for col in df.columns]
        print(f"[UPLOAD] Normalized columns: {list(df.columns)}")
        
        # Validate columns after normalization
        is_valid, validation_message = cleaner.validate_columns(df)
        if not is_valid:
            print(f"[UPLOAD] ERROR: Column validation failed after normalization: {validation_message}")
            return JSONResponse(
                status_code=400,
                content={"error": f"Invalid file format after normalization: {validation_message}", "success": False}
            )
        
        print(f"[UPLOAD] Column validation passed after normalization: {validation_message}")
        
        # Use converted parameters (already handled above)
        # If year was not provided, try to extract from filename
        if not year:
            if "2024" in file.filename or "2025" in file.filename or "2026" in file.filename:
                try:
                    year_int = int([x for x in file.filename.split() if x.isdigit() and len(x) == 4][0])
                except:
                    pass
        
        print(f"[UPLOAD] Final parameters: year={year_int}, month={month_int}, category={category_str}")
        
        # Clean the dataframe
        print("[UPLOAD] Cleaning dataframe...")
        df_clean = cleaner.clean_dataframe(df, year_int, month_int, category_str)
        
        if df_clean is None or len(df_clean) == 0:
            print("[UPLOAD] ERROR: No valid records after cleaning")
            return JSONResponse(
                status_code=400,
                content={"error": "No valid records after cleaning. Please check your data format.", "success": False}
            )
        
        print(f"[UPLOAD] Cleaned data has {len(df_clean)} rows")
        
        # Store in database
        print("[UPLOAD] Storing in database...")
        db.connect()
        db.create_tables()
        db.insert_clean_data(df_clean)
        db.update_item_master()
        db.update_daily_sales()
        
        stats = db.get_database_stats()
        db.disconnect()
        
        print(f"[UPLOAD] Successfully stored {len(df_clean)} records")
        
        return {
            "success": True,
            "status": "success",
            "filename": file.filename,
            "year": year_int,
            "month": month_int,
            "category": category_str,
            "records_uploaded": len(df_clean),
            "items": stats['unique_items'],
            "date_range": {
                "start": stats['date_range'][0],
                "end": stats['date_range'][1]
            },
            "total_units_sold": stats['total_units_sold'],
            "message": f"Successfully uploaded {len(df_clean)} records for {category_str} - {month_int}/{year_int}",
            "note": "Run retrain to update predictions with new data"
        }
        
    except Exception as e:
        print(f"[ERROR] Upload failed: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=400,
            content={"error": str(e), "success": False}
        )

# ============================================================================
# PART 2: DATA PREVIEW
# ============================================================================

@app.get("/data-preview")
def get_data_preview(limit: int = 100):
    """Get preview of latest uploaded data"""
    try:
        db.connect()
        
        query = f'''
            SELECT
                item_name,
                net_qty as quantity,
                date,
                closing_stock as stock,
                r_rate as price,
                category
            FROM inventory_sales
            ORDER BY date DESC
            LIMIT {limit}
        '''
        
        df = pd.read_sql_query(query, db.conn)
        db.disconnect()
        
        if df.empty:
            return {"records": [], "total": 0}
        
        records = df.to_dict('records')
        
        return {
            "records": records,
            "total": len(records),
            "columns": ["item_name", "quantity", "date", "stock", "price", "category"]
        }
        
    except Exception as e:
        print(f"[ERROR] Data preview failed: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

# ============================================================================
# PART 3: MODEL RETRAINING
# ============================================================================

@app.post("/retrain")
def retrain_model():
    """Retrain XGBoost and Prophet models"""
    try:
        print("\n" + "="*80)
        print("STARTING MODEL RETRAINING")
        print("="*80)
        
        # Train XGBoost
        print("\n[RETRAIN] Training XGBoost...")
        trainer = MLTrainerFromDB()
        success = trainer.train()
        
        if not success:
            return JSONResponse(
                status_code=400,
                content={"error": "XGBoost training failed"}
            )
        
        xgb_accuracy = trainer.metrics.get('valid_accuracy', 0)
        
        # Reload hybrid system with new XGBoost
        global hybrid
        hybrid = HybridActiveSystem()
        
        # Skip Prophet training for now due to library issues
        print("\n[RETRAIN] Skipping Prophet training (XGBoost-only mode)...")
        trained, failed = 0, 0  # Skip Prophet training
        
        print("\n" + "="*80)
        print("RETRAINING COMPLETE")
        print("="*80)
        
        return {
            "status": "success",
            "xgboost": {
                "accuracy": f"{xgb_accuracy:.1f}%",
                "mae": f"{trainer.metrics.get('valid_mae', 0):.2f}",
                "rmse": f"{trainer.metrics.get('valid_rmse', 0):.2f}"
            },
            "prophet": {
                "status": "skipped",
                "reason": "XGBoost-only mode for stability",
                "trained_items": 0,
                "failed_items": 0
            },
            "message": "XGBoost model retrained successfully (Prophet skipped for stability)"
        }
        
    except Exception as e:
        print(f"[ERROR] Retraining failed: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

# ============================================================================
# PART 4: PREDICTIONS
# ============================================================================

@app.post("/predict")
async def generate_predictions(request: PredictRequest = None):
    """Generate predictions with trend adjustments and explainability"""
    try:
        print(f"\n[PREDICT] Request received")
        print(f"[PREDICT] Request type: {type(request)}")
        print(f"[PREDICT] Request object: {request}")
        
        if request is None:
            print("[PREDICT] WARNING: Request is None, creating default")
            request = PredictRequest()
        
        if hybrid is None:
            print("[PREDICT] ERROR: Hybrid system not loaded")
            return JSONResponse(
                status_code=400,
                content={"error": "Hybrid system not loaded"}
            )
        
        # Get go through  from request
        prediction_date = None
        if request and hasattr(request, 'prediction_date') and request.prediction_date:
            prediction_date = request.prediction_date
            print(f"[PREDICT] Got prediction_date from request: {prediction_date}")
        
        if not prediction_date:
            prediction_date = datetime.now().strftime("%Y-%m-%d")
            print(f"[PREDICT] Using current date: {prediction_date}")
        
        print(f"[PREDICT] Generating predictions for {prediction_date}")
        
        # Get base predictions from hybrid system
        result = hybrid.predict_for_date(prediction_date)
        
        if result is None:
            print("[PREDICT] ERROR: Failed to generate predictions")
            return JSONResponse(
                status_code=400,
                content={"error": "Failed to generate predictions"}
            )
        
        print(f"[PREDICT] Got {len(result.get('predictions', []))} predictions")
        
        # Extract target month
        try:
            date_obj = datetime.strptime(prediction_date, "%Y-%m-%d")
            target_month = date_obj.month
        except:
            target_month = datetime.now().month
        
        # Enhance predictions with trend adjustments and analytics
        enhanced_predictions = []
        for pred in result.get('predictions', []):
            item_name = pred.get('item_name')
            base_pred = pred.get('final_prediction', 0)
            
            try:
                # Ensure base_pred is not NaN
                if pd.isna(base_pred) or base_pred is None:
                    base_pred = 0.0
                else:
                    base_pred = float(base_pred)
                
                # Get trend adjustment with month-specific historical data
                trend_adjustment = analytics.apply_trend_adjustment(
                    base_pred, 
                    item_name, 
                    adjustment_factor=0.1,
                    target_month=target_month
                )
                
                # Get month context
                month_context = analytics.get_month_prediction_context(item_name, target_month)
                
                # Get yearly statistics
                yearly_stats = analytics.get_yearly_statistics(item_name)
                
                # Get all monthly data for historical chart
                all_monthly_data = analytics.get_all_monthly_data(item_name)
                
                # Transform all_monthly_data to historical_sales format for frontend
                # Frontend expects: { 2024: {1: 150, 2: 200, ...}, 2025: {1: 180, 2: 220, ...} }
                historical_sales = {}
                for data_point in all_monthly_data:
                    year = data_point.get('year')
                    month = data_point.get('month')
                    sales = data_point.get('sales', 0)
                    
                    if year not in historical_sales:
                        historical_sales[year] = {}
                    historical_sales[year][month] = int(sales) if sales else 0
                
                # Build enhanced prediction
                enhanced_pred = {
                    **pred,
                    'ml_prediction': float(base_pred),
                    'trend_adjusted_prediction': float(trend_adjustment['adjusted_prediction']),
                    'final_prediction': max(0, float(trend_adjustment['adjusted_prediction'])),
                    'trend': trend_adjustment.get('trend', 'stable') or 'stable',
                    'growth_rate': float(trend_adjustment.get('growth_rate', 0.0) or 0.0),
                    'trend_reason': trend_adjustment.get('reason', 'Unable to calculate trend'),
                    'month_context': month_context,
                    'historical_stats': trend_adjustment.get('historical_stats', {}),
                    'yearly_stats': yearly_stats,
                    'all_monthly_data': all_monthly_data,
                    'historical_sales': historical_sales,
                    'recommended_order': int(max(0, trend_adjustment['adjusted_prediction'] - (pred.get('current_stock', 0) or 0)))
                }
                
                # Ensure no NaN or negative values
                for key in ['final_prediction', 'trend_adjusted_prediction', 'ml_prediction', 'recommended_order', 'growth_rate']:
                    if key in enhanced_pred:
                        val = enhanced_pred[key]
                        if pd.isna(val) or val is None:
                            enhanced_pred[key] = 0 if key != 'growth_rate' else 0.0
                        else:
                            if key == 'growth_rate':
                                enhanced_pred[key] = float(val)
                            else:
                                enhanced_pred[key] = max(0, float(val))
                
                enhanced_predictions.append(enhanced_pred)
                
            except Exception as e:
                print(f"[WARN] Failed to enhance prediction for {item_name}: {e}")
                # Fallback to base prediction
                enhanced_predictions.append({
                    **pred,
                    'ml_prediction': float(base_pred),
                    'trend_adjusted_prediction': float(base_pred),
                    'final_prediction': max(0, float(base_pred)),
                    'trend': 'stable',
                    'growth_rate': 0.0,
                    'trend_reason': 'Unable to calculate trend'
                })
        
        # Update result with enhanced predictions
        result['predictions'] = enhanced_predictions
        
        print(f"[PREDICT] Generated {len(enhanced_predictions)} trend-adjusted predictions")
        
        return result
        
    except Exception as e:
        print(f"[ERROR] Prediction failed: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

# ============================================================================
# PAGINATED PREDICT ENDPOINT - For handling large datasets
# ============================================================================

@app.post("/predict-paginated")
async def generate_predictions_paginated(request: PredictRequest = None, page: int = 1, page_size: int = 100):
    """Generate predictions with pagination to avoid timeouts"""
    try:
        print(f"\n[PREDICT-PAGINATED] Page {page}, Size {page_size}")
        
        if request is None:
            request = PredictRequest()
        
        if hybrid is None:
            return JSONResponse(status_code=400, content={"error": "Hybrid system not loaded"})
        
        # Get prediction date
        prediction_date = request.prediction_date if request and hasattr(request, 'prediction_date') and request.prediction_date else datetime.now().strftime("%Y-%m-%d")
        
        # Get base predictions from hybrid system
        result = hybrid.predict_for_date(prediction_date)
        
        if result is None:
            return JSONResponse(status_code=400, content={"error": "Failed to generate predictions"})
        
        all_predictions = result.get('predictions', [])
        total_items = len(all_predictions)
        
        # Calculate pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_predictions = all_predictions[start_idx:end_idx]
        
        print(f"[PREDICT-PAGINATED] Total items: {total_items}, Returning {len(page_predictions)} items")
        
        # Extract target month
        try:
            date_obj = datetime.strptime(prediction_date, "%Y-%m-%d")
            target_month = date_obj.month
        except:
            target_month = datetime.now().month
        
        # Enhance only the predictions for this page
        enhanced_predictions = []
        for pred in page_predictions:
            item_name = pred.get('item_name')
            base_pred = pred.get('final_prediction', 0)
            
            try:
                if pd.isna(base_pred) or base_pred is None:
                    base_pred = 0.0
                else:
                    base_pred = float(base_pred)
                
                trend_adjustment = analytics.apply_trend_adjustment(
                    base_pred, 
                    item_name, 
                    adjustment_factor=0.1,
                    target_month=target_month
                )
                
                month_context = analytics.get_month_prediction_context(item_name, target_month)
                yearly_stats = analytics.get_yearly_statistics(item_name)
                all_monthly_data = analytics.get_all_monthly_data(item_name)
                
                # Transform all_monthly_data to historical_sales format for frontend
                # Frontend expects: { 2024: {1: 150, 2: 200, ...}, 2025: {1: 180, 2: 220, ...} }
                historical_sales = {}
                for data_point in all_monthly_data:
                    year = data_point.get('year')
                    month = data_point.get('month')
                    sales = data_point.get('sales', 0)
                    
                    if year not in historical_sales:
                        historical_sales[year] = {}
                    historical_sales[year][month] = int(sales) if sales else 0
                
                enhanced_pred = {
                    **pred,
                    'ml_prediction': float(base_pred),
                    'trend_adjusted_prediction': float(trend_adjustment['adjusted_prediction']),
                    'final_prediction': max(0, float(trend_adjustment['adjusted_prediction'])),
                    'trend': trend_adjustment.get('trend', 'stable') or 'stable',
                    'growth_rate': float(trend_adjustment.get('growth_rate', 0.0) or 0.0),
                    'trend_reason': trend_adjustment.get('reason', 'Unable to calculate trend'),
                    'month_context': month_context,
                    'historical_stats': trend_adjustment.get('historical_stats', {}),
                    'yearly_stats': yearly_stats,
                    'all_monthly_data': all_monthly_data,
                    'historical_sales': historical_sales,
                    'recommended_order': int(max(0, trend_adjustment['adjusted_prediction'] - (pred.get('current_stock', 0) or 0)))
                }
                
                for key in ['final_prediction', 'trend_adjusted_prediction', 'ml_prediction', 'recommended_order', 'growth_rate']:
                    if key in enhanced_pred:
                        val = enhanced_pred[key]
                        if pd.isna(val) or val is None:
                            enhanced_pred[key] = 0 if key != 'growth_rate' else 0.0
                        else:
                            if key == 'growth_rate':
                                enhanced_pred[key] = float(val)
                            else:
                                enhanced_pred[key] = max(0, float(val))
                
                enhanced_predictions.append(enhanced_pred)
                
            except Exception as e:
                print(f"[WARN] Failed to enhance prediction for {item_name}: {e}")
                enhanced_predictions.append({
                    **pred,
                    'ml_prediction': float(base_pred),
                    'trend_adjusted_prediction': float(base_pred),
                    'final_prediction': max(0, float(base_pred)),
                    'trend': 'stable',
                    'growth_rate': 0.0,
                    'trend_reason': 'Unable to calculate trend'
                })
        
        return {
            'predictions': enhanced_predictions,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_items': total_items,
                'total_pages': (total_items + page_size - 1) // page_size,
                'has_next': end_idx < total_items,
                'has_prev': page > 1
            },
            'summary': result.get('summary', {})
        }
        
    except Exception as e:
        print(f"[ERROR] Paginated prediction failed: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=400, content={"error": str(e)})


# ============================================================================
# PART 5: UTILITY ENDPOINTS
# ============================================================================

@app.get("/stores")
def get_stores():
    """Get available stores (mock endpoint for frontend compatibility)"""
    return {
        "stores": [
            {"id": "MY_STORE", "name": "My Store"}
        ]
    }

@app.get("/items")
def get_items():
    """Get items grouped by category"""
    try:
        db.connect()
        
        # Get grocery items
        grocery_query = '''
            SELECT DISTINCT item_name FROM inventory_sales 
            WHERE category = 'Grocery' 
            ORDER BY item_name 
            LIMIT 5
        '''
        grocery_df = pd.read_sql_query(grocery_query, db.conn)
        
        # Get liquor items
        liquor_query = '''
            SELECT DISTINCT item_name FROM inventory_sales 
            WHERE category = 'Liquor' 
            ORDER BY item_name 
            LIMIT 5
        '''
        liquor_df = pd.read_sql_query(liquor_query, db.conn)
        
        # Get top sellers
        top_grocery = '''
            SELECT item_name, SUM(net_qty) as total_sold 
            FROM inventory_sales 
            WHERE category = 'Grocery' 
            GROUP BY item_name 
            ORDER BY total_sold DESC 
            LIMIT 1
        '''
        top_grocery_df = pd.read_sql_query(top_grocery, db.conn)
        
        top_liquor = '''
            SELECT item_name, SUM(net_qty) as total_sold 
            FROM inventory_sales 
            WHERE category = 'Liquor' 
            GROUP BY item_name 
            ORDER BY total_sold DESC 
            LIMIT 1
        '''
        top_liquor_df = pd.read_sql_query(top_liquor, db.conn)
        
        db.disconnect()
        
        return {
            "grocery": {
                "total": len(grocery_df),
                "items": grocery_df['item_name'].tolist(),
                "top_seller": top_grocery_df['item_name'].iloc[0] if len(top_grocery_df) > 0 else "N/A"
            },
            "liquor": {
                "total": len(liquor_df),
                "items": liquor_df['item_name'].tolist(),
                "top_seller": top_liquor_df['item_name'].iloc[0] if len(top_liquor_df) > 0 else "N/A"
            }
        }
    except Exception as e:
        print(f"[ERROR] Failed to get items: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

@app.get("/all_items")
def get_all_items():
    """Get all items with statistics"""
    try:
        # Create new database connection for this thread
        db_local = DatabaseManager()
        db_local.connect()
        
        query = '''
            SELECT 
                item_name,
                category,
                SUM(net_qty) as total_sold,
                SUM(net_qty * r_rate) as revenue,
                AVG(r_rate) as avg_price,
                MAX(closing_stock) as current_stock,
                CASE 
                    WHEN MAX(closing_stock) < 100 THEN 'Low'
                    WHEN MAX(closing_stock) < 500 THEN 'Medium'
                    ELSE 'Adequate'
                END as stock_status
            FROM inventory_sales
            GROUP BY item_name, category
            ORDER BY total_sold DESC
        '''
        
        df = pd.read_sql_query(query, db_local.conn)
        db_local.disconnect()
        
        items = df.to_dict('records')
        
        return {
            "items": items,
            "total": len(items)
        }
    except Exception as e:
        print(f"[ERROR] Failed to get all items: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

# ============================================================================
# PART 5: ANALYTICS ENDPOINTS
# ============================================================================

@app.get("/analytics/item/{item_name}")
def get_item_analytics(item_name: str):
    """Get complete analytics for an item including patterns, trends, and seasonal factors"""
    try:
        analytics_data = analytics.get_item_analytics(item_name)
        
        if not analytics_data:
            return JSONResponse(
                status_code=404,
                content={"error": f"No data found for item: {item_name}"}
            )
        
        return analytics_data
        
    except Exception as e:
        print(f"[ERROR] Failed to get analytics for {item_name}: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

@app.get("/analytics/item/{item_name}/month/{month}")
def get_month_context(item_name: str, month: int):
    """Get historical context for a specific month"""
    try:
        if month < 1 or month > 12:
            return JSONResponse(
                status_code=400,
                content={"error": "Month must be between 1 and 12"}
            )
        
        context = analytics.get_month_prediction_context(item_name, month)
        
        if not context:
            return JSONResponse(
                status_code=404,
                content={"error": f"No data found for {item_name} in month {month}"}
            )
        
        return context
        
    except Exception as e:
        print(f"[ERROR] Failed to get month context: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

@app.get("/analytics/database/items")
def get_database_items():
    """Get list of all items in database with basic stats"""
    try:
        db.connect()
        
        query = '''
            SELECT 
                item_name,
                category,
                SUM(net_qty) as total_sold,
                COUNT(DISTINCT date) as days_with_sales,
                AVG(r_rate) as avg_price,
                MAX(closing_stock) as current_stock
            FROM inventory_sales
            GROUP BY item_name, category
            ORDER BY total_sold DESC
        '''
        
        df = pd.read_sql_query(query, db.conn)
        db.disconnect()
        
        items = df.to_dict('records')
        
        return {
            "total_items": len(items),
            "items": items
        }
        
    except Exception as e:
        print(f"[ERROR] Failed to get database items: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

@app.get("/analytics/database/item/{item_name}")
def get_item_history(item_name: str):
    """Get full history of an item"""
    try:
        db.connect()
        
        query = '''
            SELECT 
                date,
                net_qty as quantity_sold,
                closing_stock as stock,
                r_rate as price,
                category,
                strftime('%Y', date) as year,
                strftime('%m', date) as month
            FROM inventory_sales
            WHERE item_name = ?
            ORDER BY date DESC
        '''
        
        df = pd.read_sql_query(query, db.conn, params=(item_name,))
        db.disconnect()
        
        if df.empty:
            return JSONResponse(
                status_code=404,
                content={"error": f"No history found for item: {item_name}"}
            )
        
        records = df.to_dict('records')
        
        return {
            "item_name": item_name,
            "total_records": len(records),
            "history": records
        }
        
    except Exception as e:
        print(f"[ERROR] Failed to get item history: {e}")
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

@app.get("/")
def get_database_info():
    """Get database information (for Database page)"""
    try:
        db_local = DatabaseManager()
        db_local.connect()
        stats = db_local.get_database_stats()
        
        # Get category breakdown
        category_query = '''
            SELECT category, COUNT(DISTINCT item_name) as count 
            FROM inventory_sales 
            GROUP BY category
        '''
        category_df = pd.read_sql_query(category_query, db_local.conn)
        
        # Get critical items
        critical_query = '''
            SELECT COUNT(DISTINCT item_name) as count 
            FROM inventory_sales 
            WHERE closing_stock < 100
        '''
        critical_df = pd.read_sql_query(critical_query, db_local.conn)
        
        db_local.disconnect()
        
        grocery_count = 0
        liquor_count = 0
        for _, row in category_df.iterrows():
            if row['category'] == 'Grocery':
                grocery_count = row['count']
            elif row['category'] == 'Liquor':
                liquor_count = row['count']
        
        return {
            "name": "Production ML Demand Forecasting API",
            "version": "8.0",
            "port": PORT,
            "status": "ready",
            "pipeline": "Upload → Process → Store → Predict → Retrain → Display",
            "data_period": f"{stats['date_range'][0]} to {stats['date_range'][1]}",
            "model": "Hybrid Prophet + XGBoost",
            "business_intelligence": "enabled",
            "enhanced_predictions": "active",
            "inventory": {
                "total_items": stats['unique_items'],
                "grocery_items": grocery_count,
                "liquor_items": liquor_count,
                "critical_items": int(critical_df['count'].iloc[0]) if len(critical_df) > 0 else 0
            },
            "endpoints": {
                "stores": "GET /stores",
                "items": "GET /items",
                "all_items": "GET /all_items",
                "upload": "POST /upload-data",
                "preview": "GET /data-preview",
                "predict": "POST /predict",
                "retrain": "POST /retrain",
                "health": "GET /health",
                "stats": "GET /stats"
            }
        }
    except Exception as e:
        print(f"[ERROR] Failed to get database info: {e}")
        import traceback
        traceback.print_exc()
        return {
            "name": "Production ML Demand Forecasting API",
            "version": "8.0",
            "port": PORT,
            "status": "ready",
            "error": str(e)
        }

@app.get("/health")
def health_check():
    """Health check"""
    return {
        "status": "ready",
        "hybrid_system": "active" if hybrid else "inactive",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/stats")
def get_stats():
    """Get database statistics"""
    try:
        # Create new database connection for this thread
        db_local = DatabaseManager()
        db_local.connect()
        stats = db_local.get_database_stats()
        db_local.disconnect()
        
        return {
            "total_records": stats['total_records'],
            "unique_items": stats['unique_items'],
            "unique_dates": stats['unique_dates'],
            "date_range": {
                "start": stats['date_range'][0],
                "end": stats['date_range'][1]
            },
            "total_units_sold": stats['total_units_sold']
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": str(e)}
        )

@app.get("/model-info")
def get_model_info():
    """Get model information"""
    if hybrid is None:
        return {"error": "Hybrid system not loaded"}
    
    return {
        "model": "Hybrid Prophet + XGBoost",
        "xgboost": {
            "accuracy": "89.2%",
            "features": len(hybrid.xgb_features),
            "status": "active"
        },
        "prophet": {
            "items_trained": len(hybrid.prophet_cache),
            "top_items": len(hybrid.top_items),
            "status": "active" if len(hybrid.prophet_cache) > 0 else "not_trained"
        },
        "hybrid_ratio": "70% XGBoost + 30% Prophet"
    }

# ============================================================================
# PART 6: ADVANCED PREDICTIONS (BULK PREDICTION V2)
# ============================================================================

@app.post("/predict-previous-years")
async def predict_previous_years(request: PredictPreviousYearsRequest):
    """Predict based on same month across all available years"""
    try:
        print(f"\n[PREDICT-PREVIOUS-YEARS] Items: {len(request.items)}, Date: {request.target_date}")
        
        results = advanced_pred.batch_predict_previous_years(request.items, request.target_date)
        
        print(f"[PREDICT-PREVIOUS-YEARS] Generated {len(results)} predictions")
        
        return {
            "status": "success",
            "type": "previous_years",
            "target_date": request.target_date,
            "total_items": len(results),
            "predictions": results
        }
    except Exception as e:
        print(f"[ERROR] Previous years prediction failed: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=400,
            content={"error": str(e), "status": "failed"}
        )

@app.post("/predict-last-n-months")
async def predict_last_n_months(request: PredictLastNMonthsRequest):
    """Predict based on last N months of data"""
    try:
        print(f"\n[PREDICT-LAST-N-MONTHS] Items: {len(request.items)}, Months: {request.n_months}")
        
        if request.n_months < 1 or request.n_months > 24:
            return JSONResponse(
                status_code=400,
                content={"error": "n_months must be between 1 and 24"}
            )
        
        results = advanced_pred.batch_predict_last_n_months(request.items, request.n_months)
        
        print(f"[PREDICT-LAST-N-MONTHS] Generated {len(results)} predictions")
        
        return {
            "status": "success",
            "type": "last_n_months",
            "n_months": request.n_months,
            "total_items": len(results),
            "predictions": results
        }
    except Exception as e:
        print(f"[ERROR] Last N months prediction failed: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=400,
            content={"error": str(e), "status": "failed"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
