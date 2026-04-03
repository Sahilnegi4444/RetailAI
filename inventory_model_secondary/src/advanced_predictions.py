"""
Advanced Prediction Endpoints
- Predict based on previous years (same month across all years)
- Predict based on last N months
"""

import pandas as pd
from datetime import datetime, timedelta
from inventory_model_secondary.src.database_manager import DatabaseManager

class AdvancedPredictions:
    def __init__(self, db=None, db_path="converted_dataset/inventory_sales.db"):
        """
        Initialize AdvancedPredictions with either an existing db connection or create new one
        
        Args:
            db: Existing DatabaseManager instance (preferred for performance)
            db_path: Path to database file (used only if db is None)
        """
        if db is not None:
            self.db = db
            print("[ADVANCED-PRED] Using shared database connection")
        else:
            self.db = DatabaseManager(db_path)
            print("[ADVANCED-PRED] Created new database connection")
    
    def predict_previous_years(self, item_name, target_date):
        """
        Predict based on same month across all available years
        
        Args:
            item_name: Product name
            target_date: Target date (YYYY-MM-DD format)
        
        Returns:
            {
                'item_name': str,
                'target_date': str,
                'target_month': int,
                'yearly_data': [
                    {
                        'year': int,
                        'month': int,
                        'sales': float,
                        'units': int
                    }
                ],
                'statistics': {
                    'low_sales': float,
                    'high_sales': float,
                    'average_sales': float,
                    'median_sales': float,
                    'std_dev': float,
                    'trend': str  # 'increasing', 'decreasing', 'stable'
                },
                'prediction': float,
                'confidence': float
            }
        """
        try:
            # Keep connection open - don't reconnect every time
            if not self.db.conn:
                self.db.connect()
            
            # Extract target month
            target_date_obj = datetime.strptime(target_date, "%Y-%m-%d")
            target_month = target_date_obj.month
            
            # Query all sales for this item in the target month across all years
            query = '''
                SELECT
                    strftime('%Y', date) as year,
                    strftime('%m', date) as month,
                    SUM(net_qty) as total_units,
                    SUM(net_qty * r_rate) as total_sales
                FROM inventory_sales
                WHERE UPPER(TRIM(item_name)) = ?
                AND strftime('%m', date) = ?
                GROUP BY year, month
                ORDER BY year ASC
            '''
            
            df = pd.read_sql_query(query, self.db.conn, params=(item_name.upper().strip(), str(target_month).zfill(2)))
            
            if df.empty:
                return {
                    'item_name': item_name,
                    'target_date': target_date,
                    'target_month': target_month,
                    'yearly_data': [],
                    'statistics': {
                        'low_sales': 0,
                        'high_sales': 0,
                        'average_sales': 0,
                        'median_sales': 0,
                        'std_dev': 0,
                        'trend': 'no_data'
                    },
                    'prediction': 0,
                    'confidence': 0
                }
            
            # Convert to list of dicts
            yearly_data = []
            sales_values = []
            
            for _, row in df.iterrows():
                year = int(row['year'])
                month = int(row['month'])
                units = int(row['total_units']) if row['total_units'] else 0
                sales = float(row['total_sales']) if row['total_sales'] else 0
                
                yearly_data.append({
                    'year': year,
                    'month': month,
                    'sales': sales,
                    'units': units
                })
                
                if sales > 0:
                    sales_values.append(sales)
            
            # Calculate statistics
            if sales_values:
                low_sales = min(sales_values)
                high_sales = max(sales_values)
                average_sales = sum(sales_values) / len(sales_values)
                median_sales = sorted(sales_values)[len(sales_values) // 2]
                
                # Calculate standard deviation
                variance = sum((x - average_sales) ** 2 for x in sales_values) / len(sales_values)
                std_dev = variance ** 0.5
                
                # Determine trend
                if len(sales_values) >= 2:
                    recent_avg = sum(sales_values[-2:]) / 2
                    old_avg = sum(sales_values[:2]) / 2
                    if recent_avg > old_avg * 1.1:
                        trend = 'increasing'
                    elif recent_avg < old_avg * 0.9:
                        trend = 'decreasing'
                    else:
                        trend = 'stable'
                else:
                    trend = 'stable'
                
                # Prediction: use average with trend adjustment
                prediction = average_sales
                if trend == 'increasing':
                    prediction = average_sales * 1.1
                elif trend == 'decreasing':
                    prediction = average_sales * 0.9
                
                # Confidence based on data consistency
                if std_dev == 0:
                    confidence = 0.95
                else:
                    cv = std_dev / average_sales  # Coefficient of variation
                    confidence = max(0.5, 1 - cv)
            else:
                low_sales = 0
                high_sales = 0
                average_sales = 0
                median_sales = 0
                std_dev = 0
                trend = 'no_data'
                prediction = 0
                confidence = 0
            
            return {
                'item_name': item_name,
                'target_date': target_date,
                'target_month': target_month,
                'yearly_data': yearly_data,
                'statistics': {
                    'low_sales': round(low_sales, 2),
                    'high_sales': round(high_sales, 2),
                    'average_sales': round(average_sales, 2),
                    'median_sales': round(median_sales, 2),
                    'std_dev': round(std_dev, 2),
                    'trend': trend
                },
                'prediction': round(prediction, 2),
                'confidence': round(confidence, 3)
            }
            
        except Exception as e:
            print(f"[ERROR] Previous years prediction failed: {e}")
            import traceback
            traceback.print_exc()
            return {
                'item_name': item_name,
                'target_date': target_date,
                'error': str(e)
            }
    
    def predict_last_n_months(self, item_name, n_months=4):
        """
        Predict based on last N months of data
        
        Args:
            item_name: Product name
            n_months: Number of months to analyze (default 4)
        
        Returns:
            {
                'item_name': str,
                'n_months': int,
                'monthly_data': [
                    {
                        'date': str (YYYY-MM-DD),
                        'year': int,
                        'month': int,
                        'sales': float,
                        'units': int
                    }
                ],
                'statistics': {
                    'low_sales': float,
                    'high_sales': float,
                    'average_sales': float,
                    'median_sales': float,
                    'std_dev': float,
                    'trend': str
                },
                'prediction': float,
                'confidence': float
            }
        """
        try:
            # Keep connection open - don't reconnect every time
            if not self.db.conn:
                self.db.connect()
            
            # Get last N months of data
            query = '''
                SELECT
                    DATE(date) as date,
                    strftime('%Y', date) as year,
                    strftime('%m', date) as month,
                    SUM(net_qty) as total_units,
                    SUM(net_qty * r_rate) as total_sales
                FROM inventory_sales
                WHERE UPPER(TRIM(item_name)) = ?
                GROUP BY strftime('%Y-%m', date)
                ORDER BY date DESC
                LIMIT ?
            '''
            
            df = pd.read_sql_query(query, self.db.conn, params=(item_name.upper().strip(), n_months))
            
            if df.empty:
                return {
                    'item_name': item_name,
                    'n_months': n_months,
                    'monthly_data': [],
                    'statistics': {
                        'low_sales': 0,
                        'high_sales': 0,
                        'average_sales': 0,
                        'median_sales': 0,
                        'std_dev': 0,
                        'trend': 'no_data'
                    },
                    'prediction': 0,
                    'confidence': 0
                }
            
            # Reverse to chronological order
            df = df.iloc[::-1].reset_index(drop=True)
            
            # Convert to list of dicts
            monthly_data = []
            sales_values = []
            
            for _, row in df.iterrows():
                date_str = row['date']
                year = int(row['year'])
                month = int(row['month'])
                units = int(row['total_units']) if row['total_units'] else 0
                sales = float(row['total_sales']) if row['total_sales'] else 0
                
                monthly_data.append({
                    'date': date_str,
                    'year': year,
                    'month': month,
                    'sales': sales,
                    'units': units
                })
                
                if sales > 0:
                    sales_values.append(sales)
            
            # Calculate statistics
            if sales_values:
                low_sales = min(sales_values)
                high_sales = max(sales_values)
                average_sales = sum(sales_values) / len(sales_values)
                median_sales = sorted(sales_values)[len(sales_values) // 2]
                
                # Calculate standard deviation
                variance = sum((x - average_sales) ** 2 for x in sales_values) / len(sales_values)
                std_dev = variance ** 0.5
                
                # Determine trend using linear regression
                if len(sales_values) >= 2:
                    x = list(range(len(sales_values)))
                    y = sales_values
                    
                    # Simple linear regression
                    n = len(x)
                    sum_x = sum(x)
                    sum_y = sum(y)
                    sum_xy = sum(x[i] * y[i] for i in range(n))
                    sum_x2 = sum(x[i] ** 2 for i in range(n))
                    
                    slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)
                    
                    if slope > 0.05 * average_sales:
                        trend = 'increasing'
                    elif slope < -0.05 * average_sales:
                        trend = 'decreasing'
                    else:
                        trend = 'stable'
                else:
                    trend = 'stable'
                
                # Prediction: use average with trend adjustment
                prediction = average_sales
                if trend == 'increasing':
                    prediction = average_sales * 1.15
                elif trend == 'decreasing':
                    prediction = average_sales * 0.85
                
                # Confidence based on data consistency
                if std_dev == 0:
                    confidence = 0.95
                else:
                    cv = std_dev / average_sales
                    confidence = max(0.5, 1 - cv)
            else:
                low_sales = 0
                high_sales = 0
                average_sales = 0
                median_sales = 0
                std_dev = 0
                trend = 'no_data'
                prediction = 0
                confidence = 0
            
            return {
                'item_name': item_name,
                'n_months': n_months,
                'monthly_data': monthly_data,
                'statistics': {
                    'low_sales': round(low_sales, 2),
                    'high_sales': round(high_sales, 2),
                    'average_sales': round(average_sales, 2),
                    'median_sales': round(median_sales, 2),
                    'std_dev': round(std_dev, 2),
                    'trend': trend
                },
                'prediction': round(prediction, 2),
                'confidence': round(confidence, 3)
            }
            
        except Exception as e:
            print(f"[ERROR] Last N months prediction failed: {e}")
            import traceback
            traceback.print_exc()
            return {
                'item_name': item_name,
                'n_months': n_months,
                'error': str(e)
            }
    
    def batch_predict_previous_years(self, items, target_date):
        """Batch predict for multiple items using previous years"""
        results = []
        total = len(items)
        for idx, item in enumerate(items):
            if idx % 100 == 0:  # Log every 100 items
                print(f"[BATCH-PREV-YEARS] Progress: {idx}/{total} items processed")
            result = self.predict_previous_years(item, target_date)
            results.append(result)
        print(f"[BATCH-PREV-YEARS] Completed: {total}/{total} items processed")
        return results
    
    def batch_predict_last_n_months(self, items, n_months=4):
        """Batch predict for multiple items using last N months"""
        results = []
        total = len(items)
        for idx, item in enumerate(items):
            if idx % 100 == 0:  # Log every 100 items
                print(f"[BATCH-LAST-N] Progress: {idx}/{total} items processed")
            result = self.predict_last_n_months(item, n_months)
            results.append(result)
        print(f"[BATCH-LAST-N] Completed: {total}/{total} items processed")
        return results
