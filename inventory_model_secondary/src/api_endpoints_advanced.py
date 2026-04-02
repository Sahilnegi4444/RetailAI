"""
Advanced Prediction Endpoints
Add these to api_production.py
"""

from fastapi import FastAPI
from pydantic import BaseModel
from inventory_model_secondary.src.advanced_predictions import AdvancedPredictions
from fastapi.responses import JSONResponse

class PredictPreviousYearsRequest(BaseModel):
    items: list
    target_date: str

class PredictLastNMonthsRequest(BaseModel):
    items: list
    n_months: int = 4

def add_advanced_endpoints(app: FastAPI):
    """Add advanced prediction endpoints to FastAPI app"""
    
    advanced_pred = AdvancedPredictions()
    
    @app.post("/predict-previous-years")
    async def predict_previous_years(request: PredictPreviousYearsRequest):
        """
        Predict based on same month across all available years
        
        Example:
        {
            "items": ["COCA COLA 250ML", "GILLETTE"],
            "target_date": "2026-04-01"
        }
        """
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
        """
        Predict based on last N months of data
        
        Example:
        {
            "items": ["COCA COLA 250ML", "GILLETTE"],
            "n_months": 4
        }
        """
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
    
    return app
