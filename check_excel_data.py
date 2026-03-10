#!/usr/bin/env python3
"""
Check actual Excel data content
"""

import pandas as pd

def main():
    # Read the Excel file and check for KINGFISHER
    file_path = 'inventory_model/data/Datatype_02_secondary/CSD SALE/2024/Liquor 2024/liq sale jun 24.xlsx'
    
    try:
        df = pd.read_excel(file_path)
        
        print("🔍 Checking Excel data content...")
        print(f"Total rows: {len(df)}")
        print(f"Columns: {list(df.columns)}")
        print()
        
        print("Looking for KINGFISHER items...")
        kingfisher_items = df[df['Item_Name'].str.contains('KINGFISHER', case=False, na=False)]
        
        if not kingfisher_items.empty:
            print(f"✅ Found {len(kingfisher_items)} KINGFISHER items:")
            for idx, row in kingfisher_items.iterrows():
                print(f"  - {row['Item_Name']}")
                print(f"    Net_Qty (Units Sold): {row['Net_Qty']}")
                print(f"    R_Rate (Price): ₹{row['R_Rate']}")
                print(f"    Closing_Stock: {row['Closing_Stock']}")
                print()
        else:
            print("❌ No KINGFISHER items found in this file")
            print("\n📋 Sample items in this file:")
            for idx, row in df.head(10).iterrows():
                item_name = str(row['Item_Name'])[:50]  # Truncate long names
                net_qty = row['Net_Qty']
                print(f"  - {item_name} (Net_Qty: {net_qty})")
        
        # Check data quality
        print(f"\n📊 Data Quality Check:")
        print(f"  Non-zero Net_Qty items: {(df['Net_Qty'] > 0).sum()}")
        print(f"  Total Net_Qty: {df['Net_Qty'].sum()}")
        print(f"  Average Net_Qty: {df['Net_Qty'].mean():.2f}")
        
    except Exception as e:
        print(f"❌ Error reading Excel file: {e}")

if __name__ == "__main__":
    main()