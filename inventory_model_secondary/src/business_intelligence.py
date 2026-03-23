"""
Business Intelligence Module for Retail Inventory Management
Focuses on accurate inventory predictions based on consumption patterns
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

class InventoryAnalyzer:
    def __init__(self):
        # Fix path to work from both root and src directory
        self.data_source = Path("../../inventory_model/data/Datatype_02_secondary/CSD SALE")
        if not self.data_source.exists():
            self.data_source = Path("inventory_model/data/Datatype_02_secondary/CSD SALE")
        self.processed_data = None
        self.item_profiles = {}
        
    def load_and_process_data(self):
        """Load and process all Excel files with proper business logic"""
        print(" Loading and analyzing your inventory data...")
        
        all_data = []
        years = ['2024', '2025']
        categories = ['Grocery', 'Liquor']
        
        for year in years:
            for category in categories:
                folder_path = self.data_source / year / f"{category} {year}"
                if not folder_path.exists():
                    continue
                    
                excel_files = list(folder_path.glob("*.xls")) + list(folder_path.glob("*.xlsx"))
                
                for excel_file in excel_files:
                    try:
                        # Extract month from filename
                        month_str = excel_file.stem.split()[0]
                        if month_str.isdigit():
                            month = int(month_str)
                        else:
                            # Handle different naming conventions
                            month_map = {'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
                                       'JUL': 7, 'JULY': 7, 'AUG': 8, 'SEP': 9, 'SEPT': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12}
                            month = month_map.get(month_str.upper(), 1)
                        
                        df = pd.read_csv(excel_file, sep='\t', encoding='utf-8')
                        
                        # Clean and standardize data
                        df = self._clean_dataframe(df, year, month, category, excel_file.name)
                        if not df.empty:
                            all_data.append(df)
                            print(f"   {excel_file.name}: {len(df)} items")
                            
                    except Exception as e:
                        # Try reading as Excel file if CSV fails
                        try:
                            df = pd.read_excel(excel_file)
                            df = self._clean_dataframe(df, year, month, category, excel_file.name)
                            if not df.empty:
                                all_data.append(df)
                                print(f"   {excel_file.name}: {len(df)} items (Excel format)")
                        except Exception as e2:
                            print(f"   Error reading {excel_file.name}: {e}")
                            continue
        
        if all_data:
            self.processed_data = pd.concat(all_data, ignore_index=True)
            print(f"\n Total records loaded: {len(self.processed_data):,}")
            return self._perform_eda()
        else:
            print(" No data loaded!")
            return None
    
    def _clean_dataframe(self, df, year, month, category, filename):
        """Clean individual dataframe with business logic"""
        # Remove empty rows and invalid data
        df = df.dropna(subset=['Item_Name'])
        df = df[df['Item_Name'].astype(str).str.strip() != '']
        
        # Clean numeric columns - CRITICAL: Use correct column names
        numeric_cols = ['W_Rate', 'R_Rate', 'Qty', 'Refund_Qty', 'Net_Qty', 
                       'R_Amt', 'W_Amt', 'Profit', 'O_B', 'Closing_Stock', 'Net_Tax']
        
        for col in numeric_cols:
            if col in df.columns:
                # Remove commas, quotes, and hash symbols
                df[col] = df[col].astype(str).str.replace(',', '').str.replace("'", "").str.replace('#', '')
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        
        # Add metadata
        df['Year'] = int(year)
        df['Month'] = month
        df['Category'] = category
        df['Source_File'] = filename
        df['Date'] = pd.to_datetime(f"{year}-{month:02d}-01")
        
        # Clean item names and create unique identifiers
        df['Item_Name_Clean'] = df['Item_Name'].astype(str).str.strip().str.upper()
        df['Product_Code'] = df['pluno'].astype(str).str.strip()
        
        # Calculate key business metrics - USING ACTUAL SALES DATA
        df['Units_Sold'] = df['Net_Qty']  # THIS IS THE ACTUAL UNITS SOLD (CRITICAL!)
        df['Revenue'] = df['R_Amt']       # Revenue amount
        df['Cost'] = df['W_Amt']          # Wholesale amount
        df['Profit_Amount'] = df['Profit'] # Profit
        df['Opening_Stock'] = df['O_B']   # Opening balance
        df['Current_Stock'] = df['Closing_Stock'] # Current inventory
        df['Retail_Price'] = df['R_Rate'] # Selling price
        df['Wholesale_Price'] = df['W_Rate'] # Cost price
        
        # Calculate actual consumption (this is what customers bought)
        df['Consumption'] = df['Units_Sold']  # Net_Qty is the actual consumption
        df['Stock_Movement'] = df['Opening_Stock'] + df['Units_Sold'] - df['Current_Stock']
        
        # Remove invalid records
        df = df[df['Units_Sold'] >= 0]  # Remove negative sales
        
        # Debug: Print sample for verification
        if len(df) > 0 and 'KING FISHER' in df['Item_Name_Clean'].iloc[0]:
            print(f"    DEBUG: Sample KINGFISHER - Units Sold: {df['Units_Sold'].iloc[0]}, Stock: {df['Current_Stock'].iloc[0]}")
        
        return df
    
    def _perform_eda(self):
        """Perform Exploratory Data Analysis"""
        print("\n Performing Exploratory Data Analysis...")
        
        df = self.processed_data
        
        # Basic statistics
        print(f"\n Dataset Overview:")
        print(f"   Total Records: {len(df):,}")
        print(f"   Date Range: {df['Date'].min().strftime('%Y-%m')} to {df['Date'].max().strftime('%Y-%m')}")
        print(f"   Unique Items: {df['Item_Name_Clean'].nunique():,}")
        print(f"   Categories: {df['Category'].unique()}")
        
        # Category breakdown
        category_stats = df.groupby('Category').agg({
            'Item_Name_Clean': 'nunique',
            'Units_Sold': 'sum',
            'Revenue': 'sum',
            'Current_Stock': 'sum'
        }).round(2)
        
        print(f"\n Category Breakdown:")
        for cat in category_stats.index:
            stats = category_stats.loc[cat]
            print(f"   {cat}:")
            print(f"    - Unique Items: {stats['Item_Name_Clean']:,}")
            print(f"    - Total Units Sold: {stats['Units_Sold']:,}")
            print(f"    - Total Revenue: {stats['Revenue']:,.2f}")
            print(f"    - Current Stock: {stats['Current_Stock']:,}")
        
        # Top selling items
        top_items = df.groupby('Item_Name_Clean').agg({
            'Units_Sold': 'sum',
            'Revenue': 'sum',
            'Category': 'first',
            'Retail_Price': 'mean'
        }).sort_values('Units_Sold', ascending=False).head(10)
        
        print(f"\n Top 10 Selling Items:")
        for i, (item, stats) in enumerate(top_items.iterrows(), 1):
            print(f"  {i:2d}. {item[:50]}")
            print(f"      Units: {stats['Units_Sold']:,} | Revenue: {stats['Revenue']:,.2f} | Category: {stats['Category']}")
        
        # Stock analysis
        stock_analysis = df.groupby('Item_Name_Clean').agg({
            'Current_Stock': 'last',
            'Units_Sold': 'sum',
            'Opening_Stock': 'mean'
        })
        
        # Calculate stock status
        stock_analysis['Days_of_Stock'] = np.where(
            stock_analysis['Units_Sold'] > 0,
            (stock_analysis['Current_Stock'] / (stock_analysis['Units_Sold'] / 12)) * 30,  # Monthly average
            999  # High number for items with no sales
        )
        
        critical_stock = stock_analysis[stock_analysis['Days_of_Stock'] < 7].shape[0]
        low_stock = stock_analysis[(stock_analysis['Days_of_Stock'] >= 7) & (stock_analysis['Days_of_Stock'] < 30)].shape[0]
        
        print(f"\n Stock Status:")
        print(f"   Critical Stock (< 7 days): {critical_stock} items")
        print(f"   Low Stock (7-30 days): {low_stock} items")
        print(f"   Adequate Stock (> 30 days): {len(stock_analysis) - critical_stock - low_stock} items")
        
        return self._create_item_profiles()
    
    def _create_item_profiles(self):
        """Create detailed profiles for each item"""
        print("\n Creating item profiles for accurate predictions...")
        
        df = self.processed_data
        
        # Group by item name (smart grouping)
        item_groups = df.groupby('Item_Name_Clean')
        
        profiles = {}
        
        for item_name, group in item_groups:
            # Calculate key metrics
            total_sold = group['Units_Sold'].sum()
            avg_monthly_sales = total_sold / group['Month'].nunique()
            current_stock = group['Current_Stock'].iloc[-1]  # Latest stock
            avg_price = group['Retail_Price'].mean()
            category = group['Category'].iloc[0]
            
            # Calculate consumption pattern
            monthly_sales = group.groupby(['Year', 'Month'])['Units_Sold'].sum()
            sales_trend = 'stable'
            if len(monthly_sales) > 1:
                if monthly_sales.iloc[-1] > monthly_sales.iloc[0] * 1.2:
                    sales_trend = 'increasing'
                elif monthly_sales.iloc[-1] < monthly_sales.iloc[0] * 0.8:
                    sales_trend = 'decreasing'
            
            # Store last 4 months of actual sales data for historical performance
            monthly_sales_history = []
            
            # Get actual monthly sales from processed data if available
            if hasattr(self, 'processed_data') and self.processed_data is not None:
                item_data = self.processed_data[self.processed_data['Item_Name_Clean'] == item_name]
                if not item_data.empty:
                    # Group by year and month to get actual monthly sales
                    monthly_actual = item_data.groupby(['Year', 'Month'])['Units_Sold'].sum().reset_index()
                    monthly_actual = monthly_actual.sort_values(['Year', 'Month'])
                    
                    # Get ALL available months for better analysis (not just last 12)
                    for _, row in monthly_actual.iterrows():
                        monthly_sales_history.append({
                            'year': int(row['Year']),
                            'month': int(row['Month']),
                            'sales': float(row['Units_Sold']),
                            'date': f"{int(row['Year'])}-{int(row['Month']):02d}-01"
                        })
            
            # If no actual data, generate based on profile averages
            if not monthly_sales_history:
                base_sales = monthly_sales / 4  # Weekly average
                
                for i in range(4):
                    import numpy as np
                    from datetime import datetime, timedelta
                    week_sales = base_sales * np.random.uniform(0.8, 1.2)
                    actual_sales = week_sales * np.random.uniform(0.9, 1.1)
                    
                    monthly_sales_history.append({
                        'year': datetime.now().year,
                        'month': datetime.now().month - i,
                        'sales': round(actual_sales * 4, 2),  # Convert to monthly
                        'date': (datetime.now() - timedelta(days=30*i)).strftime('%Y-%m-%d')
                    })
            
            # Stock velocity (how fast stock moves)
            if avg_monthly_sales > 0:
                stock_velocity = current_stock / avg_monthly_sales  # Months of stock
                reorder_point = avg_monthly_sales * 0.5  # 15 days worth
                optimal_order = avg_monthly_sales * 2    # 2 months worth
            else:
                stock_velocity = 999
                reorder_point = 0
                optimal_order = 0
            
            # Calculate seasonal patterns from ACTUAL data
            seasonal_pattern = {}
            if monthly_sales_history:
                for month_data in monthly_sales_history:
                    month = month_data['month']
                    if month not in seasonal_pattern:
                        seasonal_pattern[month] = []
                    seasonal_pattern[month].append(month_data['sales'])
                
                # Calculate average for each month
                for month in seasonal_pattern:
                    seasonal_pattern[month] = sum(seasonal_pattern[month]) / len(seasonal_pattern[month])
            
            profiles[item_name] = {
                'category': category,
                'total_sold': total_sold,
                'avg_monthly_sales': avg_monthly_sales,
                'current_stock': current_stock,
                'avg_price': avg_price,
                'stock_velocity': stock_velocity,
                'sales_trend': sales_trend,
                'reorder_point': reorder_point,
                'optimal_order_qty': optimal_order,
                'revenue_potential': avg_monthly_sales * avg_price,
                'stock_status': self._get_stock_status(stock_velocity),
                'months_data': group['Month'].nunique(),
                'last_updated': group['Date'].max(),
                'monthly_sales_history': monthly_sales_history,
                'seasonal_pattern': seasonal_pattern  # Add seasonal pattern
            }
        
        self.item_profiles = profiles
        print(f" Created profiles for {len(profiles):,} unique items")
        
        return profiles
    
    def _get_stock_status(self, velocity):
        """Determine stock status based on velocity"""
        if velocity < 0.5:
            return 'CRITICAL'
        elif velocity < 1.0:
            return 'LOW'
        elif velocity < 3.0:
            return 'ADEQUATE'
        else:
            return 'EXCESS'
    
    def get_purchase_recommendations(self, days_ahead=30):
        """Generate purchase recommendations for next period"""
        print(f"\n Generating purchase recommendations for next {days_ahead} days...")
        
        recommendations = []
        
        for item_name, profile in self.item_profiles.items():
            # Calculate expected demand
            daily_demand = profile['avg_monthly_sales'] / 30
            expected_demand = daily_demand * days_ahead
            
            # Current stock situation
            current_stock = profile['current_stock']
            shortage = max(0, expected_demand - current_stock)
            
            # Recommendation logic
            if profile['stock_status'] == 'CRITICAL':
                recommended_qty = max(shortage, profile['optimal_order_qty'])
                priority = 1
            elif profile['stock_status'] == 'LOW':
                recommended_qty = max(shortage * 0.8, profile['reorder_point'])
                priority = 2
            elif shortage > 0:
                recommended_qty = shortage
                priority = 3
            else:
                recommended_qty = 0
                priority = 4
            
            if recommended_qty > 0 or profile['stock_status'] in ['CRITICAL', 'LOW']:
                recommendations.append({
                    'item_name': item_name,
                    'category': profile['category'],
                    'current_stock': int(current_stock),
                    'expected_demand': round(expected_demand, 2),
                    'recommended_qty': int(recommended_qty),
                    'priority': priority,
                    'stock_status': profile['stock_status'],
                    'avg_price': round(profile['avg_price'], 2),
                    'investment_needed': round(recommended_qty * profile['avg_price'], 2),
                    'revenue_potential': round(profile['revenue_potential'], 2),
                    'sales_trend': profile['sales_trend'],
                    'months_of_data': profile['months_data']
                })
        
        # Sort by priority and revenue potential
        recommendations.sort(key=lambda x: (x['priority'], -x['revenue_potential']))
        
        return recommendations
    
    def generate_summary_report(self):
        """Generate executive summary"""
        if not self.item_profiles:
            return "No data processed yet!"
        
        total_items = len(self.item_profiles)
        categories = {}
        stock_status_count = {'CRITICAL': 0, 'LOW': 0, 'ADEQUATE': 0, 'EXCESS': 0}
        total_investment = 0
        total_revenue_potential = 0
        
        for profile in self.item_profiles.values():
            cat = profile['category']
            if cat not in categories:
                categories[cat] = 0
            categories[cat] += 1
            
            stock_status_count[profile['stock_status']] += 1
            total_investment += profile['current_stock'] * profile['avg_price']
            total_revenue_potential += profile['revenue_potential']
        
        report = f"""
 INVENTORY ANALYSIS SUMMARY
{'='*50}

 INVENTORY OVERVIEW:
   Total Unique Items: {total_items:,}
   Categories: {', '.join(f"{k}: {v}" for k, v in categories.items())}
   Current Investment: {total_investment:,.2f}
   Monthly Revenue Potential: {total_revenue_potential:,.2f}

 STOCK STATUS:
   Critical Stock: {stock_status_count['CRITICAL']} items (immediate action needed)
   Low Stock: {stock_status_count['LOW']} items (reorder soon)
   Adequate Stock: {stock_status_count['ADEQUATE']} items (good level)
   Excess Stock: {stock_status_count['EXCESS']} items (reduce orders)

 RECOMMENDATIONS:
   Focus on {stock_status_count['CRITICAL']} critical items first
   Review {stock_status_count['EXCESS']} excess stock items
   Monitor sales trends for better forecasting
   Consider seasonal patterns in ordering
"""
        return report

# Usage example
if __name__ == "__main__":
    analyzer = InventoryAnalyzer()
    profiles = analyzer.load_and_process_data()
    
    if profiles:
        print(analyzer.generate_summary_report())
        
        # Get recommendations
        recommendations = analyzer.get_purchase_recommendations(30)
        
        print(f"\n TOP 10 PURCHASE RECOMMENDATIONS:")
        for i, rec in enumerate(recommendations[:10], 1):
            print(f"{i:2d}. {rec['item_name'][:40]}")
            print(f"    Status: {rec['stock_status']} | Stock: {rec['current_stock']} | Need: {rec['recommended_qty']}")
            print(f"    Investment: {rec['investment_needed']:,.2f} | Category: {rec['category']}")
