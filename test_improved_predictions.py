#!/usr/bin/env python3
"""
Test improved predictions for more items
"""

import sys
sys.path.append('inventory_model_secondary/src')

def main():
    from business_intelligence import InventoryAnalyzer
    from enhanced_predictions import EnhancedPredictor
    
    print("🔍 Testing Improved Predictions for More Items...")
    
    # Load data
    analyzer = InventoryAnalyzer()
    profiles = analyzer.load_and_process_data()
    
    if not profiles:
        print("❌ No data loaded")
        return
    
    print(f"✅ Loaded {len(profiles)} items")
    
    # Test enhanced predictor
    predictor = EnhancedPredictor()
    predictor.analyzer = analyzer
    predictor.profiles = profiles
    
    print("\n🎯 Testing Enhanced Predictions...")
    result = predictor.predict_for_date("2026-04-15", "MY_STORE")
    
    if "error" in result:
        print(f"❌ Error: {result['error']}")
        return
    
    predictions = result.get("predictions", [])
    print(f"✅ Generated predictions for {len(predictions)} items")
    
    # Analyze prediction coverage by category
    categories = {}
    volume_ranges = {'High (>1000)': 0, 'Medium (100-1000)': 0, 'Low (10-100)': 0, 'Very Low (<10)': 0}
    
    for pred in predictions:
        item_name = pred['item_name']
        if item_name in profiles:
            profile = profiles[item_name]
            category = profile['category']
            total_sold = profile['total_sold']
            
            # Count by category
            if category not in categories:
                categories[category] = 0
            categories[category] += 1
            
            # Count by volume
            if total_sold > 1000:
                volume_ranges['High (>1000)'] += 1
            elif total_sold > 100:
                volume_ranges['Medium (100-1000)'] += 1
            elif total_sold > 10:
                volume_ranges['Low (10-100)'] += 1
            else:
                volume_ranges['Very Low (<10)'] += 1
    
    print(f"\n📊 Prediction Coverage:")
    print(f"   Total Items Predicted: {len(predictions)}")
    print(f"   Categories:")
    for cat, count in categories.items():
        print(f"     {cat}: {count} items")
    
    print(f"   Volume Ranges:")
    for range_name, count in volume_ranges.items():
        print(f"     {range_name}: {count} items")
    
    # Show sample predictions from different categories
    print(f"\n🔍 Sample Predictions by Pattern:")
    
    # Group by status
    status_groups = {}
    for pred in predictions:
        status = pred['status']
        if status not in status_groups:
            status_groups[status] = []
        status_groups[status].append(pred)
    
    for status, items in status_groups.items():
        print(f"\n📋 {status} Items ({len(items)} total):")
        for pred in items[:3]:  # Show first 3 of each status
            item_name = pred['item_name']
            if item_name in profiles:
                profile = profiles[item_name]
                print(f"   • {item_name[:50]}")
                print(f"     Category: {profile['category']} | Total Sold: {profile['total_sold']} units")
                print(f"     Monthly Avg: {profile['avg_monthly_sales']:.1f} | Current Stock: {profile['current_stock']}")
                print(f"     Predicted Demand: {pred['predicted_demand']:.1f} | Recommended Order: {pred['recommended_order']}")
                print(f"     Confidence: {pred['confidence']} | Trend: {profile['sales_trend']}")
                
                # Check prediction quality
                if profile['avg_monthly_sales'] > 0:
                    ratio = pred['predicted_demand'] / profile['avg_monthly_sales']
                    quality = "GOOD" if 0.5 <= ratio <= 2.0 else "ACCEPTABLE" if 0.2 <= ratio <= 3.0 else "POOR"
                    print(f"     Quality: {quality} (ratio: {ratio:.2f})")
                print()
    
    # Test specific items with different patterns
    print(f"\n🎯 Testing Specific Item Patterns:")
    
    test_items = [
        "BISC.PARLE  G  100GMS",  # High volume, stable
        "MAGGI 2 MINUTS MASALA  75 GMS",  # High volume, seasonal
        "BEER KING FISHER STRONG PREMIUM",  # Liquor, seasonal
        "SOAP DETTOL ORIGINAL 75GM"  # Medium volume
    ]
    
    for item_name in test_items:
        if item_name in profiles:
            profile = profiles[item_name]
            
            # Find prediction for this item
            pred = None
            for p in predictions:
                if p['item_name'] == item_name:
                    pred = p
                    break
            
            print(f"\n🔍 {item_name}")
            print(f"   Historical Pattern:")
            print(f"     Total Sold: {profile['total_sold']} units")
            print(f"     Monthly Average: {profile['avg_monthly_sales']:.1f} units")
            print(f"     Sales Trend: {profile['sales_trend']}")
            print(f"     Stock Velocity: {profile['stock_velocity']:.1f} months")
            
            if 'seasonal_pattern' in profile and profile['seasonal_pattern']:
                seasonal = profile['seasonal_pattern']
                peak_month = max(seasonal.items(), key=lambda x: x[1])
                low_month = min(seasonal.items(), key=lambda x: x[1])
                print(f"     Seasonal: Peak in month {peak_month[0]} ({peak_month[1]:.1f}), Low in month {low_month[0]} ({low_month[1]:.1f})")
            
            if pred:
                print(f"   Prediction (April 2026):")
                print(f"     Predicted Demand: {pred['predicted_demand']:.1f} units")
                print(f"     Current Stock: {pred['current_stock']} units")
                print(f"     Recommended Order: {pred['recommended_order']} units")
                print(f"     Status: {pred['status']}")
                print(f"     Confidence: {pred['confidence']}")
                
                # Validate prediction logic
                monthly_avg = profile['avg_monthly_sales']
                predicted = pred['predicted_demand']
                
                if monthly_avg > 0:
                    ratio = predicted / monthly_avg
                    print(f"     Validation: {ratio:.2f}x monthly average")
                    
                    if 0.8 <= ratio <= 1.5:
                        print(f"     ✅ Prediction looks realistic")
                    elif 0.5 <= ratio <= 2.0:
                        print(f"     ⚠️ Prediction is acceptable")
                    else:
                        print(f"     ❌ Prediction may need adjustment")
            else:
                print(f"   ❌ No prediction found for this item")

if __name__ == "__main__":
    main()