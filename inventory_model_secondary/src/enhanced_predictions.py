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
        if not self.profiles:
            self.profiles = self.analyzer.load_and_process_data()
        return self.profiles
    
    def predict_for_date(self, target_date, store_id="MY_STORE"):
        """Generate predictions for a specific month"""
        if not self.profiles:
            return {"error": "Data not loaded"}
        
        target_dt = pd.to_datetime(target_date)
        current_dt = datetime.now()
        
        # Always predict for the ENTIRE MONTH of the target date
        target_year = target_dt.year
        target_month = target_dt.month
        
        # Calculate days in the target month
        if target_month == 12:
            next_month = datetime(target_year + 1, 1, 1)
        else:
            next_month = datetime(target_year, target_month + 1, 1)
        
        current_month_start = datetime(target_year, target_month, 1)
        days_in_month = (next_month - current_month_start).days
        
        print(f" Generating predictions for {target_dt.strftime('%B %Y')} ({days_in_month} days)")
        
        predictions = []
        
        # Process ALL items, but prioritize by business impact
        all_items = sorted(
            self.profiles.items(), 
            key=lambda x: x[1]['total_sold'], 
            reverse=True
        )
        
        # Process items in batches for better performance
        max_items = min(len(all_items), 500)  # Increase to 500 items to catch seasonal items
        
        for item_name, profile in all_items[:max_items]:
            try:
                # Skip items with very low activity (less than 5 total units sold)
                if profile['total_sold'] < 5:
                    continue
                    
                prediction = self._calculate_enhanced_prediction(
                    item_name, profile, days_in_month, target_dt
                )
                if prediction:
                    predictions.append(prediction)
            except Exception as e:
                print(f"Error predicting {item_name}: {e}")
                continue
        
        # Sort by priority and business impact
        predictions.sort(key=lambda x: (x['priority'], -x['business_impact']))
        
        return self._format_prediction_response(predictions, target_date, days_in_month, store_id)
    
    def _calculate_enhanced_prediction(self, item_name, profile, days_in_month, target_dt):
        """Calculate enhanced prediction for a single item for the ENTIRE TARGET MONTH"""
        
        # Base calculations from REAL data
        monthly_sales = profile['avg_monthly_sales']
        current_stock = profile['current_stock']
        category = profile['category']
        price = profile['avg_price']
        
        # **CRITICAL FIX: Analyze actual seasonal pattern from historical data**
        target_month = target_dt.month
        seasonal_factor = 1.0
        has_seasonal_sales = False
        actual_target_month_sales = 0
        
        # Check if item has actual sales in the target month from historical data
        if 'monthly_sales_history' in profile and profile['monthly_sales_history']:
            # Find sales for the target month in previous years
            target_month_sales = []
            all_months_with_sales = set()
            
            for hist in profile['monthly_sales_history']:
                hist_month = hist['month']
                all_months_with_sales.add(hist_month)
                
                if hist_month == target_month:
                    target_month_sales.append(hist['sales'])
            
            # **SEASONAL LOGIC FIX**
            if target_month_sales:
                # Item has sold in this month before
                has_seasonal_sales = True
                actual_target_month_sales = sum(target_month_sales) / len(target_month_sales)
                
                # Calculate seasonal factor based on actual data vs overall average
                if monthly_sales > 0:
                    seasonal_factor = actual_target_month_sales / monthly_sales
                    seasonal_factor = max(0.1, min(3.0, seasonal_factor))  # Cap between 0.1x and 3x
            else:
                # **CRITICAL: Item has NEVER sold in this month**
                if len(all_months_with_sales) >= 2:  # If we have data for 2+ months and target month not in them
                    has_seasonal_sales = False
                    seasonal_factor = 0.01  # Extremely low chance of sales (1% of average)
                    actual_target_month_sales = 0  # No historical sales in this month
        
        # **TREND ANALYSIS FIX: Check year-over-year decline**
        trend_factor = 1.0
        yearly_decline_factor = 1.0
        
        if 'monthly_sales_history' in profile and len(profile['monthly_sales_history']) >= 2:
            # Check for year-over-year decline in the same month
            same_month_by_year = {}
            for hist in profile['monthly_sales_history']:
                if hist['month'] == target_month:
                    same_month_by_year[hist['year']] = hist['sales']
            
            if len(same_month_by_year) >= 2:
                years = sorted(same_month_by_year.keys())
                latest_year_sales = same_month_by_year[years[-1]]
                previous_year_sales = same_month_by_year[years[-2]]
                
                if previous_year_sales > 0:
                    yearly_decline_factor = latest_year_sales / previous_year_sales
                    yearly_decline_factor = max(0.05, min(2.0, yearly_decline_factor))  # Allow for steeper declines
        
        # Apply trend factor based on ACTUAL trend
        if profile['sales_trend'] == 'decreasing':
            trend_factor = 0.7 * yearly_decline_factor  # Apply both general and specific decline
        elif profile['sales_trend'] == 'increasing':
            trend_factor = 1.1 * yearly_decline_factor
        else:
            trend_factor = yearly_decline_factor
        
        # **REALISTIC DEMAND CALCULATION FOR ENTIRE MONTH**
        if has_seasonal_sales and actual_target_month_sales > 0:
            # Use actual historical sales for this month with trend adjustment
            total_demand = actual_target_month_sales * trend_factor
            daily_demand = total_demand / days_in_month
        elif not has_seasonal_sales:
            # Item doesn't sell in this month - EXTREMELY minimal prediction
            if len(profile.get('monthly_sales_history', [])) >= 2:
                # We have enough data to be confident item doesn't sell this month
                total_demand = 0  # Zero demand for non-seasonal months with sufficient data
                daily_demand = 0
            else:
                # Less confident, but still very low
                total_demand = monthly_sales * 0.001 * trend_factor  # 0.1% of monthly average
                daily_demand = total_demand / days_in_month
        else:
            # Fallback to seasonal-adjusted average
            total_demand = monthly_sales * seasonal_factor * trend_factor
            daily_demand = total_demand / days_in_month
        
        # **MINIMUM REALISTIC DEMAND** - For non-seasonal months, keep it ZERO or very low
        min_demand = 0  # Default minimum demand
        
        if not has_seasonal_sales and len(profile.get('monthly_sales_history', [])) >= 2:
            # Item has never sold in this month and we have enough data - predict ZERO
            total_demand = 0
            min_demand = 0
        elif monthly_sales > 0:
            if has_seasonal_sales:
                min_demand = max(monthly_sales * 0.01, actual_target_month_sales * 0.1)  # 10% of historical month sales
            else:
                # For months with no historical sales, keep minimum ZERO
                min_demand = 0
        
        total_demand = max(total_demand, min_demand)
        
        # **STOCK SITUATION ANALYSIS**
        shortage = max(0, total_demand - current_stock)
        
        # **ENHANCED RECOMMENDATION LOGIC**
        if not has_seasonal_sales and len(profile.get('monthly_sales_history', [])) >= 2:
            # Item has never sold in this month and we have enough data to be confident
            status = "NO_DEMAND"
            priority = 5
            recommended_qty = 0
            recommendation_reason = f"No historical sales in {target_dt.strftime('%B')}. Item only sells in other months - no restocking needed."
        elif yearly_decline_factor < 0.2:  # 80%+ decline year over year
            status = "DECLINING_SEASONAL"
            priority = 5
            recommended_qty = 0
            recommendation_reason = f"Steep decline detected ({(1-yearly_decline_factor)*100:.0f}% drop) + no sales in {target_dt.strftime('%B')}. No restocking recommended."
        elif yearly_decline_factor < 0.5 and not has_seasonal_sales:  # 50%+ decline + no seasonal sales
            status = "DECLINING"
            priority = 4
            recommended_qty = 0
            recommendation_reason = f"Declining trend ({(1-yearly_decline_factor)*100:.0f}% drop) + no historical sales in {target_dt.strftime('%B')}. Skip restocking."
        elif profile['stock_status'] == 'CRITICAL' and has_seasonal_sales:
            status = "CRITICAL"
            priority = 1
            recommended_qty = int(total_demand + (actual_target_month_sales * 0.2))
            recommendation_reason = "Critical stock level for seasonal item. Immediate restocking needed."
        elif profile['stock_status'] == 'LOW' and has_seasonal_sales:
            status = "LOW" 
            priority = 2
            recommended_qty = int(shortage + (actual_target_month_sales * 0.1))
            recommendation_reason = "Low stock for seasonal item. Plan to reorder soon."
        elif shortage > 0 and has_seasonal_sales:
            status = "ADEQUATE"
            priority = 3
            recommended_qty = int(shortage)
            recommendation_reason = "Adequate stock. Order to meet seasonal demand."
        else:
            status = "EXCESS"
            priority = 4
            recommended_qty = 0
            recommendation_reason = "Sufficient stock available or item doesn't sell in this month."
        
        # Calculate business metrics
        investment_needed = recommended_qty * price
        revenue_potential = total_demand * price
        lost_revenue_risk = shortage * price
        
        # Calculate confidence based on data quality and seasonal pattern
        base_confidence = min(95, 60 + (profile['months_data'] * 5))
        if has_seasonal_sales:
            confidence = base_confidence
        else:
            confidence = max(85, base_confidence - 10)  # High confidence for "no sales" prediction
        
        # **ENHANCED PREDICTION EXPLANATION**
        prediction_factors = []
        
        # Seasonal explanation with actual data
        if has_seasonal_sales:
            if actual_target_month_sales > 0:
                prediction_factors.append(f"Historical {target_dt.strftime('%B')} sales: {actual_target_month_sales:.0f} units average")
            if seasonal_factor > 1.2:
                prediction_factors.append(f"Peak season: {((seasonal_factor-1)*100):.0f}% above yearly average")
            elif seasonal_factor < 0.8:
                prediction_factors.append(f"Low season: {((1-seasonal_factor)*100):.0f}% below yearly average")
            else:
                prediction_factors.append(f"Normal season: Similar to yearly average")
        else:
            prediction_factors.append(f"SEASONAL ITEM: No historical sales in {target_dt.strftime('%B')} - item only sells in specific months")
        
        # Trend explanation with actual numbers
        if yearly_decline_factor < 0.5:
            prediction_factors.append(f"STEEP DECLINE: {((1-yearly_decline_factor)*100):.0f}% drop from last year - item losing popularity")
        elif yearly_decline_factor < 0.9:
            prediction_factors.append(f"Declining trend: {((1-yearly_decline_factor)*100):.0f}% drop from last year same month")
        elif yearly_decline_factor > 1.1:
            prediction_factors.append(f"Growth trend: {((yearly_decline_factor-1)*100):.0f}% increase from last year same month")
        else:
            prediction_factors.append(f"Stable trend: Similar to last year same month")
        
        # Time period explanation - FIXED FOR MONTHLY PREDICTION
        prediction_factors.append(f"Prediction period: Entire {target_dt.strftime('%B %Y')} ({days_in_month} days)")
        
        # Stock consideration
        prediction_factors.append(f"Current stock: {current_stock} units available")
        
        # Recommendation vs Prediction explanation
        if not has_seasonal_sales:
            recommendation_explanation = {
                "predicted_demand": float(total_demand),
                "predicted_explanation": f"ZERO consumption expected - item doesn't sell in {target_dt.strftime('%B')}",
                "recommended_order": int(recommended_qty),
                "recommendation_explanation": recommendation_reason,
                "difference_explanation": f"No restocking needed - item is seasonal and doesn't sell in {target_dt.strftime('%B')}"
            }
        else:
            recommendation_explanation = {
                "predicted_demand": float(total_demand),
                "predicted_explanation": f"Expected consumption for entire {target_dt.strftime('%B %Y')} based on historical pattern and trend analysis",
                "recommended_order": int(recommended_qty),
                "recommendation_explanation": recommendation_reason,
                "difference_explanation": f"Recommendation considers seasonal pattern, trend, and current stock ({current_stock} units)"
            }
        
        # Generate REAL historical performance using ACTUAL sales data
        last_4_weeks = []
        
        if 'monthly_sales_history' in profile and profile['monthly_sales_history']:
            # Use ACTUAL monthly sales history
            for hist in profile['monthly_sales_history'][-6:]:  # Last 6 months
                # Show actual sales data
                actual_monthly = hist['sales']
                predicted_monthly = monthly_sales  # Use average as "predicted"
                
                last_4_weeks.append({
                    "date": hist['date'],
                    "predicted": round(predicted_monthly, 2),
                    "actual": round(actual_monthly, 2)
                })
        
        return {
            'item_name': item_name,
            'category': category,
            'current_stock': int(current_stock),
            'predicted_demand': float(round(total_demand, 2)),
            'daily_demand': float(round(daily_demand, 2)),
            'low_estimate': float(round(total_demand * 0.8, 2)),
            'high_estimate': float(round(total_demand * 1.2, 2)),
            'recommended_order': int(recommended_qty),
            'shortage': float(round(shortage, 2)),
            'status': status,
            'priority': int(priority),
            'confidence': f"{confidence:.1f}%",
            'price': float(round(price, 2)),
            'investment_needed': float(round(investment_needed, 2)),
            'revenue_potential': float(round(revenue_potential, 2)),
            'lost_revenue_risk': float(round(lost_revenue_risk, 2)),
            'business_impact': float(revenue_potential),
            
            # **NEW: Enhanced prediction explanation**
            'prediction_factors': prediction_factors,
            'recommendation_vs_prediction': recommendation_explanation,
            'seasonal_info': {
                'is_seasonal': bool(has_seasonal_sales),
                'seasonal_factor': float(seasonal_factor),
                'target_month': int(target_month),
                'historical_same_month': f"Historical {target_dt.strftime('%B')} sales: {actual_target_month_sales:.1f} units" if has_seasonal_sales else f"No historical sales in {target_dt.strftime('%B')}",
                'has_historical_sales': bool(has_seasonal_sales),
                'actual_month_sales': float(actual_target_month_sales)
            },
            'trend_info': {
                'sales_trend': str(profile['sales_trend']),
                'trend_factor': float(trend_factor),
                'yearly_decline_factor': float(yearly_decline_factor),
                'monthly_average': float(monthly_sales)
            },
            'last_4_weeks': last_4_weeks,
            'business_metrics': {
                'avg_monthly_sales': float(round(monthly_sales, 2)),
                'stock_velocity': float(round(profile['stock_velocity'], 2)),
                'sales_trend': str(profile['sales_trend']),
                'months_of_data': int(profile['months_data']),
                'total_sold_ytd': int(profile['total_sold']),
                'seasonal_factor': float(round(seasonal_factor, 2))
            },
            'prediction_details': {
                'seasonal_factor': float(round(seasonal_factor, 2)),
                'trend_factor': float(round(trend_factor, 2)),
                'base_monthly_sales': float(round(monthly_sales, 2)),
                'target_month': int(target_month)
            },
            'demand_breakdown': {
                'daily_average': {
                    'low': float(round(daily_demand * 0.8, 2)),
                    'average': float(round(daily_demand, 2)),
                    'high': float(round(daily_demand * 1.2, 2)),
                    'explanation': f"Daily rate for {target_dt.strftime('%B')}: {actual_target_month_sales:.1f}  {days_in_month} days" if has_seasonal_sales else f"No sales expected in {target_dt.strftime('%B')}"
                },
                'weekly': {
                    'low': float(round(daily_demand * 7 * 0.8, 2)),
                    'average': float(round(daily_demand * 7, 2)),
                    'high': float(round(daily_demand * 7 * 1.2, 2)),
                    'explanation': f"Weekly projection for {target_dt.strftime('%B')} based on daily rate"
                },
                'monthly': {
                    'low': float(round(total_demand * 0.8, 2)),
                    'average': float(round(total_demand, 2)),
                    'high': float(round(total_demand * 1.2, 2)),
                    'explanation': f"ENTIRE {target_dt.strftime('%B %Y')} forecast" + (f" (Historical: {actual_target_month_sales:.0f} units)" if has_seasonal_sales else " (No historical sales)")
                },
                'quarterly': {
                    'low': float(round(monthly_sales * 3 * 0.8, 2)),
                    'average': float(round(monthly_sales * 3, 2)),
                    'high': float(round(monthly_sales * 3 * 1.2, 2)),
                    'explanation': "Quarterly projection based on overall average (seasonal items may vary significantly)"
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
    
    def _format_prediction_response(self, predictions, target_date, days_ahead, store_id="MY_STORE"):
        """Format the prediction response"""
        total_products = len(predictions)
        critical_count = sum(1 for p in predictions if p['status'] == 'CRITICAL')
        low_count = sum(1 for p in predictions if p['status'] == 'LOW')
        total_order_value = sum(p['investment_needed'] for p in predictions)
        total_revenue_at_risk = sum(p['lost_revenue_risk'] for p in predictions)
        
        return {
            "store_id": str(store_id),
            "prediction_date": str(target_date),
            "days_ahead": int(days_ahead),
            "model": "enhanced_business_intelligence",
            "summary": {
                "total_products": int(total_products),
                "critical_stock": int(critical_count),
                "low_stock": int(low_count),
                "adequate_stock": int(sum(1 for p in predictions if p['status'] == 'ADEQUATE')),
                "excess_stock": int(sum(1 for p in predictions if p['status'] == 'EXCESS')),
                "total_order_value": float(round(total_order_value, 2)),
                "total_revenue_at_risk": float(round(total_revenue_at_risk, 2)),
                "currency": "",
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
        print(f"\n Enhanced Predictions Summary:")
        print(f"Total Products: {result['summary']['total_products']}")
        print(f"Critical Items: {result['summary']['critical_stock']}")
        print(f"Total Investment: {result['summary']['total_order_value']:,.2f}")
        
        print(f"\n Top 5 Recommendations:")
        for i, item in enumerate(result['predictions'][:5], 1):
            print(f"{i}. {item['item_name'][:40]}")
            print(f"   Demand: {item['predicted_demand']:.1f} | Order: {item['recommended_order']} | Investment: {item['investment_needed']:,.2f}")
