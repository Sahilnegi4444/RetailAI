#!/usr/bin/env python3
"""
Test script to verify real data processing
"""

import sys
sys.path.append('inventory_model_secondary/src')

from business_intelligence import InventoryAnalyzer

def main():
    print("🔍 Testing Real Business Data Processing...")
    
    analyzer = InventoryAnalyzer()
    profiles = analyzer.load_and_process_data()
    
    if not profiles:
        print("❌ No data loaded!")
        return
    
    print(f"\n📊 Total items analyzed: {len(profiles)}")
    
    # Check KINGFISHER BEER specifically
    kingfisher_found = False
    for name, profile in profiles.items():
        if 'KINGFISHER' in name and 'BEER' in name:
            print(f"\n🍺 FOUND: {name}")
            print(f"   Total Sold: {profile['total_sold']} units")
            print(f"   Monthly Average: {profile['avg_monthly_sales']:.1f} units")
            print(f"   Current Stock: {profile['current_stock']} units")
            print(f"   Category: {profile['category']}")
            print(f"   Stock Status: {profile['stock_status']}")
            print(f"   Average Price: ₹{profile['avg_price']:.2f}")
            kingfisher_found = True
            break
    
    if not kingfisher_found:
        print("\n❌ KINGFISHER BEER not found in profiles")
        print("\n📋 Available items (first 10):")
        for i, (name, profile) in enumerate(list(profiles.items())[:10]):
            print(f"   {i+1}. {name} - {profile['total_sold']} units sold")
    
    # Show top 5 items by sales
    print(f"\n🏆 TOP 5 ITEMS BY SALES:")
    top_items = sorted(profiles.items(), key=lambda x: x[1]['total_sold'], reverse=True)[:5]
    for i, (name, profile) in enumerate(top_items, 1):
        print(f"   {i}. {name}")
        print(f"      Total Sold: {profile['total_sold']} units")
        print(f"      Monthly Avg: {profile['avg_monthly_sales']:.1f} units")
        print(f"      Current Stock: {profile['current_stock']} units")
        print(f"      Status: {profile['stock_status']}")
        print()

if __name__ == "__main__":
    main()