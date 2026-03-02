"""
Enhanced Prediction System with Improved Accuracy
Focuses on realistic business predictions with calendar-based forecasting
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from business_intelligence import InventoryAnalyzer

class EnhancedPredictor:
    def __init__(self):
        self.analyzer = InventoryAnalyzer()
        self.profiles = None
        
    def load_data(self):
        """Load and analyze business data"""
        self.profiles = self.analyzer.load_and_process_data()
        return self.profiles
    
    def predict_for_date(self, target_date, store_id="MY_STORE"):
        """Generate predictions for a specific future date"""
        if not self.profiles:
            return {"error": "Data not loaded"}
        
        target_dt = pd.to_datetime(target_date)
        current_dt = datetime.now()
        days_ahead = (target_dt - current_dt).days
        
        if days_ahead < 0:
            return {"error": "Cannot predict for past dates"}
        
        if days_ahead > 365:
            return {"error": "Predictions limited to 1 year ahead"}
        
        print(f"🎯 Generating predictions for {target_date} ({days_ahead} days ahead)")
        
        predictions = []
        
        # Get top items by sales volume for more accurate predictions
        top_items = sorted(
            self.profiles.items(), 
            key=lambda x: x[1]['total_sold'], 
            reverse=True
        )[:50]  # Top 50 items
        
        for item_name, profile in top_items:
            try:
                prediction = self._calculate_enhanced_prediction(
                    item_name, profile, days_ahead, target_dt
                )
                if prediction:
                    predictions.append(prediction)
            except Exception as e:
                print(f"Error predicting {item_name}: {e}")
                continue
        
        # Sort by priority and business impact
        predictions.sort(key=lambda x: (x['priority'], -x['business_impact']))
        
        return self._format_prediction_response(predictions, target_date, days_ahead)
    
    def _calculate_enhanced_prediction(self, item_name, profile, days_ahead, target_dt):
        """Calculate enhanced prediction for a single item"""
        
        # Base calculations
        monthly_sales = profile['avg_monthly_sales']
        current_stock = profile['current_stock']
        category = profile['category']
        price = profile['avg_price']
        
        # Enhanced demand calculation
        daily_demand = monthly_sales / 30
        
        # Apply seasonality based on target month
        seasonal_factor = self._get_seasonal_factor(target_dt, category)
        
        # Apply trend factor
        trend_factor = self._get_trend_factor(profile['sales_trend'], days_ahead)
        
        # Apply business growth factor (realistic growth)
        growth_factor = 1 + (0.05 * (days_ahead / 365))  # 5% annual growth
        
        # Calculate enhanced demand
        enhanced_daily_demand = daily_demand * seasonal_factor * trend_factor * growth_factor
        total_demand = enhanced_daily_demand * days_ahead
        
        # Ensure minimum realistic demand for active items
        if monthly_sales > 0:
            min_demand = max(monthly_sales * 0.3, 5)  # At least 30% of monthly or 5 units
            total_demand = max(total_demand, min_demand)
        
        # Calculate stock situation
        shortage = max(0, total_demand - current_stock)
        
        # Enhanced recommendation logic
        if profile['stock_status'] == 'CRITICAL' or shortage > total_demand * 0.7:
            status = "CRITICAL"
            priority = 1
            # Order enough for demand + safety stock
            recommended_qty = int(total_demand + (monthly_sales * 0.5))
        elif profile['stock_status'] == 'LOW' or shortage > total_demand * 0.3:
            status = "LOW" 
            priority = 2
            recommended_qty = int(shortage + (monthly_sales * 0.3))
        elif shortage > 0:
            status = "ADEQUATE"
            priority = 3
            recommended_qty = int(shortage)
        else:
            status = "EXCESS"
            priority = 4
            recommended_qty = 0
        
        # Calculate business metrics
        investment_needed = recommended_qty * price
        revenue_potential = total_demand * price
        lost_revenue_risk = shortage * price
        
        # Calculate confidence based on data quality
        confidence = min(95, 60 + (profile['months_data'] * 5))
        
        return {
            'item_name': item_name,
            'category': category,
            'current_stock': int(current_stock),
            'predicted_demand': round(total_demand, 2),
            'daily_demand': round(enhanced_daily_demand, 2),
            'low_estimate': round(total_demand * 0.8, 2),
            'high_estimate': round(total_demand * 1.2, 2),
            'recommended_order': recommended_qty,
            'shortage': round(shortage, 2),
            'status': status,
            'priority': priority,
            'confidence': f"{confidence:.1f}%",
            'price': round(price, 2),
            'investment_needed': round(investment_needed, 2),
            'revenue_potential': round(revenue_potential, 2),
            'lost_revenue_risk': round(lost_revenue_risk, 2),
            'business_impact': revenue_potential,  # For sorting
            'prediction_factors': {
                'seasonal_factor': round(seasonal_factor, 2),
                'trend_factor': round(trend_factor, 2),
                'growth_factor': round(growth_factor, 2),
                'base_monthly_sales': round(monthly_sales, 2)
            },
            'demand_breakdown': {
                'daily': {
                    'low': round(enhanced_daily_demand * 0.8, 2),
                    'average': round(enhanced_daily_demand, 2),
                    'high': round(enhanced_daily_demand * 1.2, 2),
                    'explanation': f"Expected daily consumption for {target_dt.strftime('%B %Y')}"
                },
                'weekly': {
                    'low': round(enhanced_daily_demand * 7 * 0.8, 2),
                    'average': round(enhanced_daily_demand * 7, 2),
                    'high': round(enhanced_daily_demand * 7 * 1.2, 2),
                    'explanation': f"Expected weekly consumption"
                },
                'monthly': {
                    'low': round(enhanced_daily_demand * 30 * 0.8, 2),
                    'average': round(enhanced_daily_demand * 30, 2),
                    'high': round(enhanced_daily_demand * 30 * 1.2, 2),
                    'explanation': f"Expected monthly consumption"
                }
            }
        }
    
    def _get_seasonal_factor(self, target_dt, category):
        """Calculate seasonal factor based on month and category"""
        month = target_dt.month
        
        if category == 'Liquor':
            # Liquor sales typically higher in winter months and festivals
            seasonal_map = {
                1: 1.2,   # January (New Year)
                2: 0.9,   # February
                3: 1.0,   # March
                4: 1.1,   # April (festivals)
                5: 1.0,   # May
                6: 0.9,   # June
                7: 0.9,   # July
                8: 1.0,   # August
                9: 1.1,   # September (festivals)
                10: 1.2,  # October (Diwali season)
                11: 1.3,  # November (wedding season)
                12: 1.4   # December (Christmas/New Year)
            }
        else:  # Grocery
            # Grocery more stable but higher during festivals
            seasonal_map = {
                1: 1.1,   # January
                2: 1.0,   # February
                3: 1.0,   # March
                4: 1.1,   # April
                5: 1.0,   # May
                6: 1.0,   # June
                7: 1.0,   # July
                8: 1.0,   # August
                9: 1.1,   # September
                10: 1.2,  # October (festival season)
                11: 1.2,  # November
                12: 1.1   # December
            }
        
        return seasonal_map.get(month, 1.0)
    
    def _get_trend_factor(self, sales_trend, days_ahead):
        """Calculate trend factor based on sales trend"""
        if sales_trend == 'increasing':
            return 1 + (0.1 * (days_ahead / 365))  # 10% annual increase
        elif sales_trend == 'decreasing':
            return 1 - (0.05 * (days_ahead / 365))  # 5% annual decrease
        else:
            return 1.0  # Stable
    
    def _format_prediction_response(self, predictions, target_date, days_ahead):
        """Format the prediction response"""
        total_products = len(predictions)
        critical_count = sum(1 for p in predictions if p['status'] == 'CRITICAL')
        low_count = sum(1 for p in predictions if p['status'] == 'LOW')
        total_order_value = sum(p['investment_needed'] for p in predictions)
        total_revenue_at_risk = sum(p['lost_revenue_risk'] for p in predictions)
        
        return {
            "store_id": "MY_STORE",
            "prediction_date": target_date,
            "days_ahead": days_ahead,
            "model": "enhanced_business_intelligence",
            "summary": {
                "total_products": total_products,
                "critical_stock": critical_count,
                "low_stock": low_count,
                "adequate_stock": sum(1 for p in predictions if p['status'] == 'ADEQUATE'),
                "excess_stock": sum(1 for p in predictions if p['status'] == 'EXCESS'),
                "total_order_value": round(total_order_value, 2),
                "total_revenue_at_risk": round(total_revenue_at_risk, 2),
                "currency": "₹",
                "prediction_accuracy": "enhanced",
                "factors_considered": ["seasonality", "trends", "growth", "business_patterns"]
            },
            "predictions": predictions,
            "business_insights": {
                "top_revenue_items": sorted(predictions, key=lambda x: x['revenue_potential'], reverse=True)[:5],
                "most_critical": [p for p in predictions if p['status'] == 'CRITICAL'][:10],
                "prediction_note": f"Enhanced predictions for {target_date} considering seasonality, trends, and business growth patterns"
            }
        }

# Usage example
if __name__ == "__main__":
    predictor = EnhancedPredictor()
    predictor.load_data()
    
    # Test prediction for 30 days ahead
    result = predictor.predict_for_date("2025-04-15")
    
    if "error" not in result:
        print(f"\n🎯 Enhanced Predictions Summary:")
        print(f"Total Products: {result['summary']['total_products']}")
        print(f"Critical Items: {result['summary']['critical_stock']}")
        print(f"Total Investment: ₹{result['summary']['total_order_value']:,.2f}")
        
        print(f"\n🔥 Top 5 Recommendations:")
        for i, item in enumerate(result['predictions'][:5], 1):
            print(f"{i}. {item['item_name'][:40]}")
            print(f"   Demand: {item['predicted_demand']:.1f} | Order: {item['recommended_order']} | Investment: ₹{item['investment_needed']:,.2f}")