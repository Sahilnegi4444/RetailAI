"""
Analytics Engine - Month-wise Patterns & Trend Detection
Provides explainable predictions with seasonal and trend analysis
"""

import pandas as pd
import numpy as np
from datetime import datetime
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')

class AnalyticsEngine:
    """Extract patterns, trends, and analytics from historical data"""
    
    def __init__(self, db_manager):
        self.db = db_manager
        self.monthly_patterns = {}  # {item_name: {month: [sales_2023, sales_2024, sales_2025]}}
        self.yearly_trends = {}     # {item_name: {year: total_sales}}
        self.trend_direction = {}   # {item_name: 'increasing'/'decreasing'/'stable'}
        self.seasonal_factors = {}  # {item_name: {month: factor}}
    
    def extract_monthly_patterns(self, item_name):
        """Extract sales for each month across all years"""
        try:
            # Ensure connection is open - reconnect if needed
            try:
                if not self.db.conn:
                    self.db.connect()
                # Test connection
                self.db.conn.execute("SELECT 1")
            except Exception as conn_err:
                print(f"[WARN] Database connection issue in extract_monthly_patterns: {conn_err}, reconnecting...")
                self.db.connect()
            
            query = '''
                SELECT 
                    strftime('%m', date) as month,
                    strftime('%Y', date) as year,
                    SUM(net_qty) as total_sales
                FROM inventory_sales
                WHERE item_name = ?
                GROUP BY year, month
                ORDER BY year, month
            '''
            
            df = pd.read_sql_query(query, self.db.conn, params=(item_name,))
            
            if df.empty:
                return None
            
            # Organize by month
            patterns = defaultdict(list)
            for _, row in df.iterrows():
                month = int(row['month'])
                year = int(row['year'])
                sales = row['total_sales']
                patterns[month].append({
                    'year': year,
                    'sales': sales
                })
            
            self.monthly_patterns[item_name] = dict(patterns)
            return dict(patterns)
            
        except Exception as e:
            print(f"[ERROR] Failed to extract monthly patterns for {item_name}: {e}")
            return None
    
    def extract_yearly_trends(self, item_name):
        """Extract total sales per year"""
        try:
            # Ensure connection is open - reconnect if needed
            try:
                if not self.db.conn:
                    self.db.connect()
                # Test connection
                self.db.conn.execute("SELECT 1")
            except Exception as conn_err:
                print(f"[WARN] Database connection issue in extract_yearly_trends: {conn_err}, reconnecting...")
                self.db.connect()
            
            query = '''
                SELECT 
                    strftime('%Y', date) as year,
                    SUM(net_qty) as total_sales
                FROM inventory_sales
                WHERE item_name = ?
                GROUP BY year
                ORDER BY year
            '''
            
            df = pd.read_sql_query(query, self.db.conn, params=(item_name,))
            
            if df.empty:
                return None
            
            trends = {}
            for _, row in df.iterrows():
                year = int(row['year'])
                sales = row['total_sales']
                trends[year] = sales
            
            self.yearly_trends[item_name] = trends
            return trends
            
        except Exception as e:
            print(f"[ERROR] Failed to extract yearly trends for {item_name}: {e}")
            return None
    
    def calculate_trend_direction(self, item_name):
        """Determine if sales are increasing, decreasing, or stable"""
        trends = self.extract_yearly_trends(item_name)
        
        if not trends or len(trends) < 2:
            return 'stable', 0.0
        
        # Sort by year
        years = sorted(trends.keys())
        sales_values = [trends[year] for year in years]
        
        # Calculate year-over-year growth rates
        growth_rates = []
        for i in range(1, len(sales_values)):
            if sales_values[i-1] > 0:
                growth = (sales_values[i] - sales_values[i-1]) / sales_values[i-1]
                growth_rates.append(growth)
        
        if not growth_rates:
            return 'stable', 0.0
        
        # Average growth rate
        avg_growth = np.mean(growth_rates)
        
        # Determine trend
        if avg_growth > 0.05:  # > 5% growth
            trend = 'increasing'
        elif avg_growth < -0.05:  # < -5% decline
            trend = 'decreasing'
        else:
            trend = 'stable'
        
        self.trend_direction[item_name] = trend
        return trend, avg_growth
    
    def calculate_seasonal_factors(self, item_name):
        """Calculate seasonal adjustment factors for each month"""
        patterns = self.extract_monthly_patterns(item_name)
        
        if not patterns:
            return None
        
        # Calculate average sales per month across all years
        monthly_averages = {}
        for month, data_list in patterns.items():
            sales_values = [d['sales'] for d in data_list]
            monthly_averages[month] = np.mean(sales_values)
        
        # Calculate overall average
        overall_avg = np.mean(list(monthly_averages.values()))
        
        # Calculate seasonal factors (month_avg / overall_avg)
        seasonal_factors = {}
        for month, avg_sales in monthly_averages.items():
            if overall_avg > 0:
                factor = avg_sales / overall_avg
            else:
                factor = 1.0
            seasonal_factors[month] = factor
        
        self.seasonal_factors[item_name] = seasonal_factors
        return seasonal_factors
    
    def get_item_analytics(self, item_name):
        """Get complete analytics for an item"""
        
        # Extract all data
        monthly_patterns = self.extract_monthly_patterns(item_name)
        yearly_trends = self.extract_yearly_trends(item_name)
        trend_direction, growth_rate = self.calculate_trend_direction(item_name)
        seasonal_factors = self.calculate_seasonal_factors(item_name)
        
        if not monthly_patterns or not yearly_trends:
            return None
        
        # Calculate statistics
        all_sales = []
        for month_data in monthly_patterns.values():
            all_sales.extend([d['sales'] for d in month_data])
        
        avg_sales = np.mean(all_sales) if all_sales else 0
        std_sales = np.std(all_sales) if all_sales else 0
        min_sales = np.min(all_sales) if all_sales else 0
        max_sales = np.max(all_sales) if all_sales else 0
        
        return {
            'item_name': item_name,
            'monthly_patterns': monthly_patterns,
            'yearly_trends': yearly_trends,
            'trend_direction': trend_direction,
            'growth_rate': float(growth_rate),
            'seasonal_factors': seasonal_factors,
            'statistics': {
                'avg_sales': float(avg_sales),
                'std_sales': float(std_sales),
                'min_sales': float(min_sales),
                'max_sales': float(max_sales),
                'cv': float(std_sales / avg_sales) if avg_sales > 0 else 0  # Coefficient of variation
            }
        }
    
    def apply_trend_adjustment(self, base_prediction, item_name, adjustment_factor=0.1, target_month=None):
        """Apply trend adjustment with historical bounding to prevent unrealistic predictions"""
        
        try:
            trend, growth_rate = self.calculate_trend_direction(item_name)
        except Exception as e:
            print(f"[WARN] Failed to calculate trend for {item_name}: {e}")
            trend = 'stable'
            growth_rate = 0.0
        
        # Ensure trend is valid
        if trend is None or trend == 'unknown':
            trend = 'stable'
        
        # If target_month is provided, use month-specific historical data for bounding
        if target_month is not None:
            try:
                patterns = self.extract_monthly_patterns(item_name)
                if patterns and target_month in patterns:
                    month_data = patterns[target_month]
                    sales_values = [d['sales'] for d in month_data if d['sales'] > 0]
                    
                    if sales_values and len(sales_values) > 0:
                        # Calculate historical statistics
                        historical_avg = float(np.mean(sales_values))
                        historical_min = float(np.min(sales_values))
                        historical_max = float(np.max(sales_values))
                        
                        print(f"[ANALYTICS] {item_name} Month {target_month}: avg={historical_avg:.0f}, min={historical_min:.0f}, max={historical_max:.0f}")
                        
                        # CRITICAL: Use historical average as PRIMARY prediction source
                        # Apply trend adjustment to historical average (NOT to ML prediction)
                        if trend == 'increasing':
                            predicted = historical_avg * (1 + min(growth_rate, 0.15))  # Cap growth at 15%
                        elif trend == 'decreasing':
                            predicted = historical_avg * (1 + max(growth_rate, -0.15))  # Cap decline at 15%
                        else:
                            predicted = historical_avg
                        
                        # CRITICAL: Apply bounding layer to prevent unrealistic predictions
                        lower_bound = historical_min * 0.8  # Allow 20% below minimum
                        upper_bound = historical_max * 1.2  # Allow 20% above maximum
                        
                        # Bound the prediction
                        bounded_pred = max(lower_bound, min(predicted, upper_bound))
                        
                        # Additional validation: if prediction > 2x average, cap it
                        if bounded_pred > historical_avg * 2:
                            print(f"[WARN] {item_name}: Prediction {bounded_pred:.0f} > 2x avg {historical_avg:.0f}, capping")
                            bounded_pred = historical_avg * 1.2
                        
                        # CRITICAL FIX: Ensure prediction never goes below 90% of historical average
                        # This prevents unrealistic drops for stable/increasing trends
                        min_floor = historical_avg * 0.9
                        if bounded_pred < min_floor:
                            print(f"[WARN] {item_name}: Bounded pred {bounded_pred:.0f} < floor {min_floor:.0f}, adjusting")
                            bounded_pred = min_floor
                        
                        # Ensure no negative values
                        bounded_pred = max(0, float(bounded_pred))
                        
                        # If we have only 1 data point and trend is stable, use it directly
                        if len(sales_values) == 1 and trend == 'stable':
                            bounded_pred = historical_avg
                            print(f"[ANALYTICS] {item_name}: Using single historical data point: {bounded_pred:.0f}")
                        
                        print(f"[ANALYTICS] {item_name}: ML={base_prediction:.0f}, Historical={historical_avg:.0f}, Bounded={bounded_pred:.0f}")
                        
                        return {
                            'original_prediction': float(base_prediction),
                            'adjusted_prediction': float(bounded_pred),
                            'trend': trend,
                            'adjustment_factor': float(growth_rate),
                            'growth_rate': float(growth_rate),
                            'reason': f"Based on historical {target_month} avg ({historical_avg:.0f} units, range: {historical_min:.0f}-{historical_max:.0f}) with {trend} trend",
                            'historical_stats': {
                                'avg': float(historical_avg),
                                'min': float(historical_min),
                                'max': float(historical_max),
                                'count': len(sales_values)
                            }
                        }
            except Exception as e:
                print(f"[WARN] Failed to use month-specific data for {item_name}: {e}")
                import traceback
                traceback.print_exc()
        
        # Fallback: use simple trend adjustment (should rarely happen)
        if trend == 'increasing':
            adjusted = base_prediction * 1.05
        elif trend == 'decreasing':
            adjusted = base_prediction * 0.95
        else:
            adjusted = base_prediction
        
        adjusted = max(0, float(adjusted))
        
        return {
            'original_prediction': float(base_prediction),
            'adjusted_prediction': float(adjusted),
            'trend': trend,
            'adjustment_factor': float(adjustment_factor),
            'growth_rate': float(growth_rate) if not pd.isna(growth_rate) else 0.0,
            'reason': f"Trend is {trend} (no historical month data available)"
        }
    
    def get_month_prediction_context(self, item_name, target_month):
        """Get historical context for a specific month"""
        
        try:
            patterns = self.extract_monthly_patterns(item_name)
            
            if not patterns or target_month not in patterns:
                # Return default context when no data available
                return {
                    'month': target_month,
                    'years': [],
                    'sales': [],
                    'average': 0.0,
                    'std_dev': 0.0,
                    'min': 0.0,
                    'max': 0.0,
                    'trend': 'stable',
                    'data_available': False
                }
            
            month_data = patterns[target_month]
            sales_values = [d['sales'] for d in month_data]
            years = [d['year'] for d in month_data]
            
            # Ensure no NaN values
            sales_values = [float(s) if not pd.isna(s) else 0.0 for s in sales_values]
            
            avg_val = float(np.mean(sales_values)) if sales_values else 0.0
            std_val = float(np.std(sales_values)) if sales_values else 0.0
            min_val = float(np.min(sales_values)) if sales_values else 0.0
            max_val = float(np.max(sales_values)) if sales_values else 0.0
            
            # Ensure no NaN in results
            avg_val = 0.0 if pd.isna(avg_val) else avg_val
            std_val = 0.0 if pd.isna(std_val) else std_val
            min_val = 0.0 if pd.isna(min_val) else min_val
            max_val = 0.0 if pd.isna(max_val) else max_val
            
            return {
                'month': target_month,
                'years': years,
                'sales': sales_values,
                'average': avg_val,
                'std_dev': std_val,
                'min': min_val,
                'max': max_val,
                'trend': 'increasing' if len(sales_values) > 1 and sales_values[-1] > sales_values[0] else 'decreasing' if len(sales_values) > 1 and sales_values[-1] < sales_values[0] else 'stable',
                'data_available': True
            }
        except Exception as e:
            print(f"[WARN] Failed to get month context for {item_name}: {e}")
            return {
                'month': target_month,
                'years': [],
                'sales': [],
                'average': 0.0,
                'std_dev': 0.0,
                'min': 0.0,
                'max': 0.0,
                'trend': 'stable',
                'data_available': False
            }
    
    def get_yearly_statistics(self, item_name):
        """Get yearly low, average, and high sales for an item"""
        try:
            trends = self.extract_yearly_trends(item_name)
            
            if not trends or len(trends) == 0:
                return {
                    'low': 0.0,
                    'average': 0.0,
                    'high': 0.0,
                    'years': []
                }
            
            sales_values = list(trends.values())
            years = list(trends.keys())
            
            return {
                'low': float(np.min(sales_values)),
                'average': float(np.mean(sales_values)),
                'high': float(np.max(sales_values)),
                'years': years,
                'by_year': trends
            }
        except Exception as e:
            print(f"[ERROR] Failed to get yearly statistics for {item_name}: {e}")
            return {
                'low': 0.0,
                'average': 0.0,
                'high': 0.0,
                'years': []
            }
    
    def get_all_monthly_data(self, item_name):
        """Get all monthly sales data for historical chart display"""
        try:
            patterns = self.extract_monthly_patterns(item_name)
            
            if not patterns:
                return []
            
            # Flatten the data into a list sorted by date
            all_data = []
            for month, month_data in patterns.items():
                for entry in month_data:
                    all_data.append({
                        'year': entry['year'],
                        'month': month,
                        'sales': entry['sales'],
                        'date': f"{entry['year']}-{month:02d}-01"
                    })
            
            # Sort by date (most recent first)
            all_data.sort(key=lambda x: x['date'], reverse=True)
            
            return all_data
            
        except Exception as e:
            print(f"[ERROR] Failed to get all monthly data for {item_name}: {e}")
            return []
    
    def get_all_items_analytics(self, limit=None):
        """Get analytics for all items in database"""
        
        try:
            self.db.connect()
            
            query = 'SELECT DISTINCT item_name FROM inventory_sales'
            df = pd.read_sql_query(query, self.db.conn)
            self.db.disconnect()
            
            items = df['item_name'].tolist()
            
            if limit:
                items = items[:limit]
            
            analytics = {}
            for item in items:
                try:
                    item_analytics = self.get_item_analytics(item)
                    if item_analytics:
                        analytics[item] = item_analytics
                except Exception as e:
                    print(f"[WARN] Failed to get analytics for {item}: {e}")
                    continue
            
            return analytics
            
        except Exception as e:
            print(f"[ERROR] Failed to get all items analytics: {e}")
            return {}
