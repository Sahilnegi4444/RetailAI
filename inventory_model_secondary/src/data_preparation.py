"""
Data Preparation Script for Secondary Model (Liquor & Grocery 2024-2025)
Combines all Excel files into one clean CSV
"""

import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_SOURCE = Path("inventory_model/data/Datatype_02_secondary/CSD SALE")
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

print("\n" + "="*70)
print("SECONDARY MODEL DATA PREPARATION")
print("="*70)

# Initialize list to store all data
all_data = []

# Years and categories
years = ['2024', '2025']
categories = ['Grocery', 'Liquor']

# Month mapping
month_map = {
    '01': 'January', '02': 'February', '03': 'March', '04': 'April',
    '05': 'May', '06': 'June', '07': 'July', '08': 'August',
    '09': 'September', '10': 'October', '11': 'November', '12': 'December'
}

print("\nReading Excel files...")

# Read all Excel files
for year in years:
    for category in categories:
        folder_name = f"{category} {year}"
        folder_path = DATA_SOURCE / year / folder_name
        
        if not folder_path.exists():
            print(f"  Folder not found: {folder_path}")
            continue
        
        print(f"\n Processing: {year} - {category}")
        
        # Get all Excel files
        excel_files = list(folder_path.glob("*.xls")) + list(folder_path.glob("*.xlsx"))
        
        for excel_file in sorted(excel_files):
            try:
                # Extract month from filename (e.g., "01 JAN.xls" -> "01")
                month_num = excel_file.stem.split()[0]
                if not month_num.isdigit():
                    # Try to extract from different format
                    month_num = '01'  # Default
                
                # Try reading as tab-delimited first (your files are actually TSV)
                try:
                    df = pd.read_csv(excel_file, sep='\t', encoding='utf-8')
                except:
                    try:
                        df = pd.read_csv(excel_file, sep='\t', encoding='latin1')
                    except:
                        # Try as Excel
                        try:
                            df = pd.read_excel(excel_file, engine='openpyxl')
                        except:
                            df = pd.read_excel(excel_file, engine='xlrd')
                
                # Skip if empty
                if df.empty:
                    continue
                
                # Add metadata columns
                df['Year'] = int(year)
                df['Month'] = int(month_num) if month_num.isdigit() else 1
                df['Category'] = category
                df['Source_File'] = excel_file.name
                
                all_data.append(df)
                print(f"    {excel_file.name}: {len(df)} records")
                
            except Exception as e:
                print(f"    Error reading {excel_file.name}: {e}")

if not all_data:
    print("\n No data found! Check your file paths.")
    exit(1)

# Combine all data
print(f"\n Combining {len(all_data)} files...")
combined_df = pd.concat(all_data, ignore_index=True)

print(f" Total records: {len(combined_df):,}")

# Clean and standardize column names
print("\n Cleaning data...")

# Standardize column names
combined_df.columns = combined_df.columns.str.strip().str.replace(' ', '_').str.lower()

# Create date column
combined_df['date'] = pd.to_datetime(
    combined_df['year'].astype(str) + '-' + 
    combined_df['month'].astype(str).str.zfill(2) + '-01'
)

# Clean numeric columns
numeric_cols = ['w_rate', 'r_rate', 'qty', 'refund_qty', 'net_qty', 
                'r_amt', 'w_amt', 'profit', 'o_b', 'closing_stock', 'net_tax']

for col in numeric_cols:
    if col in combined_df.columns:
        # Remove commas and convert to numeric
        combined_df[col] = pd.to_numeric(
            combined_df[col].astype(str).str.replace(',', '').str.replace("'", ""),
            errors='coerce'
        )
        # Fill NaN with 0
        combined_df[col] = combined_df[col].fillna(0)

# Create store_id (you have one store, so use "STORE_001")
combined_df['store_id'] = 'STORE_001'

# Create product_id from pluno
combined_df['product_id'] = combined_df['pluno'].astype(str).str.strip()

# Clean item names
combined_df['item_name'] = combined_df['item_name'].astype(str).str.strip()

# Determine category from GP_Index_No if not already set
def determine_category(row):
    if pd.notna(row.get('gp_index_no')):
        if str(row['gp_index_no']).startswith('I/'):
            return 'Grocery'
        elif str(row['gp_index_no']).startswith('V/'):
            return 'Liquor'
    return row.get('category', 'Unknown')

combined_df['category'] = combined_df.apply(determine_category, axis=1)

# Create units_sold_7d (weekly sales) - aggregate by week
print("\n Creating weekly aggregations...")

# Add week number
combined_df['week'] = combined_df['date'].dt.isocalendar().week
combined_df['year_week'] = combined_df['year'].astype(str) + '_W' + combined_df['week'].astype(str).str.zfill(2)

# Group by store, product, and week
weekly_df = combined_df.groupby(['store_id', 'product_id', 'item_name', 'category', 'year_week', 'year', 'week']).agg({
    'date': 'first',
    'net_qty': 'sum',  # Total quantity sold in week
    'r_rate': 'mean',  # Average retail rate
    'w_rate': 'mean',  # Average wholesale rate
    'profit': 'sum',   # Total profit
    'closing_stock': 'last',  # Last closing stock
    'o_b': 'first',  # Opening balance
    'net_tax': 'sum'  # Total tax
}).reset_index()

# Rename for model compatibility
weekly_df = weekly_df.rename(columns={
    'net_qty': 'units_sold_7d',
    'r_rate': 'price',
    'closing_stock': 'inventory_level'
})

# Create additional features
weekly_df['discount'] = ((weekly_df['price'] - weekly_df['w_rate']) / weekly_df['price'] * 100).fillna(0)
weekly_df['discount'] = weekly_df['discount'].clip(0, 100)

# Add dummy features (since you don't have these)
weekly_df['region'] = 'REGION_001'
weekly_df['weather_condition'] = 'Normal'
weekly_df['holiday_promotion'] = 0  # Can be enhanced later
weekly_df['competitor_pricing'] = weekly_df['price'] * 1.05  # Assume 5% higher
weekly_df['seasonality'] = weekly_df['date'].dt.month.map({
    12: 'Winter', 1: 'Winter', 2: 'Winter',
    3: 'Spring', 4: 'Spring', 5: 'Spring',
    6: 'Summer', 7: 'Summer', 8: 'Summer',
    9: 'Fall', 10: 'Fall', 11: 'Fall'
})

# Add units_sold (daily equivalent)
weekly_df['units_sold'] = (weekly_df['units_sold_7d'] / 7).round(2)

# Add units_ordered (assume reorder based on sales)
weekly_df['units_ordered'] = (weekly_df['units_sold_7d'] * 1.1).round(0)  # 10% buffer

# Add demand_forecast (will be replaced by model predictions)
weekly_df['demand_forecast'] = weekly_df['units_sold_7d']

# Select final columns
final_columns = [
    'date', 'store_id', 'product_id', 'item_name', 'category', 'region',
    'inventory_level', 'units_sold', 'units_sold_7d', 'units_ordered', 
    'demand_forecast', 'price', 'discount', 'weather_condition',
    'holiday_promotion', 'competitor_pricing', 'seasonality',
    'profit', 'w_rate', 'net_tax'
]

# Ensure all columns exist
for col in final_columns:
    if col not in weekly_df.columns:
        weekly_df[col] = 0

final_df = weekly_df[final_columns].copy()

# Remove rows with zero sales (optional - keep for now to see patterns)
# final_df = final_df[final_df['units_sold_7d'] > 0]

# Sort by date
final_df = final_df.sort_values(['date', 'product_id']).reset_index(drop=True)

# Save to CSV
output_file = DATA_DIR / "liquor_grocery_sales.csv"
final_df.to_csv(output_file, index=False)

print(f"\n Data preparation complete!")
print(f" Saved to: {output_file}")
print(f"\n Final Dataset Statistics:")
print(f"   Total Records: {len(final_df):,}")
print(f"   Date Range: {final_df['date'].min()} to {final_df['date'].max()}")
print(f"   Unique Products: {final_df['product_id'].nunique()}")
print(f"   Categories: {final_df['category'].unique().tolist()}")
print(f"   Total Sales: {final_df['units_sold_7d'].sum():,.0f} units")
print(f"   Total Profit: {final_df['profit'].sum():,.2f}")

# Show sample
print(f"\n Sample Data (first 5 rows):")
print(final_df.head().to_string())

# Show data quality
print(f"\n Data Quality Check:")
print(f"   Zero sales records: {(final_df['units_sold_7d'] == 0).sum()} ({(final_df['units_sold_7d'] == 0).sum()/len(final_df)*100:.1f}%)")
print(f"   Missing values: {final_df.isnull().sum().sum()}")

print("\n" + "="*70)
print(" Ready for model training!")
print("="*70)

