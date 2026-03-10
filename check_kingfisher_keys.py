#!/usr/bin/env python3
"""
Check KINGFISHER keys in profiles
"""

import sys
sys.path.append('inventory_model_secondary/src')

def main():
    from business_intelligence import InventoryAnalyzer
    
    analyzer = InventoryAnalyzer()
    profiles = analyzer.load_and_process_data()
    
    if profiles:
        print("🔍 Searching for KINGFISHER in profile keys...")
        
        # Search for KINGFISHER variations
        kingfisher_keys = []
        for key in profiles.keys():
            if any(term in key.upper() for term in ['KINGFISHER', 'KING FISHER', 'BEER KING']):
                kingfisher_keys.append(key)
        
        if kingfisher_keys:
            print(f"✅ FOUND {len(kingfisher_keys)} KINGFISHER ITEMS:")
            for key in kingfisher_keys:
                profile = profiles[key]
                print(f"  📊 \"{key}\"")
                print(f"     Total Sold: {profile['total_sold']} units")
                print(f"     Monthly Avg: {profile['avg_monthly_sales']:.1f} units")
                print(f"     Current Stock: {profile['current_stock']} units")
                print(f"     Status: {profile['stock_status']}")
                print()
        else:
            print("❌ No KINGFISHER keys found")
            print("\n📋 Sample keys (first 20):")
            for i, key in enumerate(list(profiles.keys())[:20]):
                print(f"  {i+1:2d}. \"{key}\"")
            
            # Check for BEER items
            print("\n🍺 Looking for BEER items:")
            beer_keys = [key for key in profiles.keys() if 'BEER' in key.upper()]
            for key in beer_keys[:10]:
                print(f"  - \"{key}\"")

if __name__ == "__main__":
    main()