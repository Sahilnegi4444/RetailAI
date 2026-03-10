#!/usr/bin/env python3
"""
Find KINGFISHER BEER in the Excel data
"""

import pandas as pd
import os

def main():
    base_path = 'inventory_model/data/Datatype_02_secondary/CSD SALE'
    found_items = []
    
    print("🔍 Searching for KINGFISHER and BEER items across all files...")
    
    for year in ['2024', '2025']:
        for category in ['Grocery', 'Liquor']:
            folder = f'{base_path}/{year}/{category} {year}'
            if os.path.exists(folder):
                files = [f for f in os.listdir(folder) if f.endswith(('.xlsx', '.xls'))]
                print(f"\n📁 Checking {category} {year} ({len(files)} files)")
                
                for file in files:
                    try:
                        file_path = f'{folder}/{file}'
                        df = pd.read_excel(file_path)
                        
                        # Look for KINGFISHER
                        kingfisher = df[df['Item_Name'].str.contains('KINGFISHER', case=False, na=False)]
                        if not kingfisher.empty:
                            for _, row in kingfisher.iterrows():
                                found_items.append({
                                    'file': file,
                                    'category': category,
                                    'year': year,
                                    'item': row['Item_Name'],
                                    'net_qty': row['Net_Qty'],
                                    'price': row['R_Rate'],
                                    'stock': row['Closing_Stock']
                                })
                        
                        # Look for any BEER items
                        beer = df[df['Item_Name'].str.contains('BEER', case=False, na=False)]
                        if not beer.empty:
                            for _, row in beer.head(2).iterrows():  # Just first 2 beer items per file
                                found_items.append({
                                    'file': file,
                                    'category': category,
                                    'year': year,
                                    'item': row['Item_Name'],
                                    'net_qty': row['Net_Qty'],
                                    'price': row['R_Rate'],
                                    'stock': row['Closing_Stock']
                                })
                        
                    except Exception as e:
                        print(f"  ❌ Error reading {file}: {e}")
                        continue
    
    if found_items:
        print(f"\n🎯 FOUND {len(found_items)} BEER/KINGFISHER ITEMS:")
        print("="*80)
        
        for item in found_items:
            print(f"📄 {item['file']} ({item['category']} {item['year']})")
            print(f"   🍺 {item['item']}")
            print(f"   📊 Net_Qty (Units Sold): {item['net_qty']}")
            print(f"   💰 Price: ₹{item['price']}")
            print(f"   📦 Stock: {item['stock']}")
            print()
        
        # Calculate totals for KINGFISHER specifically
        kingfisher_items = [item for item in found_items if 'KINGFISHER' in item['item'].upper()]
        if kingfisher_items:
            total_sold = sum(item['net_qty'] for item in kingfisher_items if pd.notna(item['net_qty']))
            print(f"🎯 KINGFISHER BEER SUMMARY:")
            print(f"   Total items found: {len(kingfisher_items)}")
            print(f"   Total units sold: {total_sold}")
            print(f"   Average per month: {total_sold / len(kingfisher_items):.1f}")
    else:
        print("\n❌ No BEER or KINGFISHER items found in any files")
        
        # Show sample data from one file
        try:
            sample_file = 'inventory_model/data/Datatype_02_secondary/CSD SALE/2025/Liquor 2025/06 JUN.xls'
            df = pd.read_excel(sample_file)
            print(f"\n📋 Sample items from {sample_file}:")
            for _, row in df.head(10).iterrows():
                print(f"   - {row['Item_Name']} (Net_Qty: {row['Net_Qty']})")
        except:
            pass

if __name__ == "__main__":
    main()