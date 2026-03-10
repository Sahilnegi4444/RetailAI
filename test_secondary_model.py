#!/usr/bin/env python3
"""
Test the secondary model with real data
"""

import sys
sys.path.append('inventory_model_secondary/src')

def main():
    try:
        from business_intelligence import InventoryAnalyzer
        
        print("🔄 Testing Secondary Model with Real Data...")
        analyzer = InventoryAnalyzer()
        profiles = analyzer.load_and_process_data()
        
        if profiles:
            print(f"✅ SUCCESS: Loaded {len(profiles)} items")
            
            # Find KINGFISHER items
            kingfisher_items = []
            for name, profile in profiles.items():
                if 'KINGFISHER' in name:
                    kingfisher_items.append((name, profile))
            
            if kingfisher_items:
                print(f"\n🍺 FOUND {len(kingfisher_items)} KINGFISHER ITEMS:")
                for name, profile in kingfisher_items:
                    print(f"  📊 {name}")
                    print(f"     Total Sold: {profile['total_sold']} units")
                    print(f"     Monthly Avg: {profile['avg_monthly_sales']:.1f} units")
                    print(f"     Current Stock: {profile['current_stock']} units")
                    print(f"     Status: {profile['stock_status']}")
                    print(f"     Price: ₹{profile['avg_price']:.2f}")
                    print()
                
                # Test prediction for KINGFISHER
                print("🎯 Testing Prediction for KINGFISHER...")
                from enhanced_predictions import EnhancedPredictor
                
                predictor = EnhancedPredictor()
                predictor.analyzer = analyzer
                predictor.profiles = profiles
                
                result = predictor.predict_for_date("2026-04-15", "MY_STORE")
                
                if "error" not in result:
                    # Find KINGFISHER in predictions
                    for pred in result.get("predictions", []):
                        if "KINGFISHER" in pred.get("item_name", ""):
                            print(f"  ✅ PREDICTION FOUND:")
                            print(f"     Item: {pred['item_name']}")
                            print(f"     Predicted Demand: {pred['predicted_demand']} units")
                            print(f"     Current Stock: {pred['current_stock']} units")
                            print(f"     Recommended Order: {pred['recommended_order']} units")
                            print(f"     Status: {pred['status']}")
                            print(f"     Confidence: {pred['confidence']}")
                            break
                    else:
                        print("  ❌ KINGFISHER not found in predictions")
                else:
                    print(f"  ❌ Prediction Error: {result['error']}")
            else:
                print("❌ No KINGFISHER items found in profiles")
        else:
            print("❌ FAILED: No data loaded")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()