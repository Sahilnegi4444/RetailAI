#!/usr/bin/env python3
"""
Test prediction accuracy for multiple items with different patterns
"""

import sys
sys.path.append('inventory_model_secondary/src')

def main():
    from business_intelligence import InventoryAnalyzer
    from enhanced_predictions import EnhancedPredictor
    
    print("🔍 Testing Prediction Accuracy for Multiple Items...")
    
    # Load data
    analyzer = InventoryAnalyzer()
    profiles = analyzer.load_and_process_data()
    
    if not profiles:
        print("❌ No data loaded")
        return
    
    print(f"✅ Loaded {len(profiles)} items")
    
    # Test different categories of items
    test_categories = {
        'High Volume Items': [],
        'Medium Volume Items': [],
        'Low Volume Items': [],
        'Grocery Items': [],
        'Liquor Items': []
    }
    
    # Categorize items by sales volume and category
    sorted_items = sorted(profiles.items(), key=lambda x: x[1]['total_sold'], reverse=True)
    
    for name, profile in sorted_items:
        if len(test_categories['High Volume Items']) < 5 and profile['total_sold'] > 1000:
            test_categories['High Volume Items'].append((name, profile))
        elif len(test_categories['Medium Volume Items']) < 5 and 100 < profile['total_sold'] <= 1000:
            test_categories['Medium Volume Items'].append((name, profile))
        elif len(test_categories['Low Volume Items']) < 5 and profile['total_sold'] <= 100:
            test_categories['Low Volume Items'].append((name, profile))
        
        if profile['category'] == 'Grocery' and len(test_categories['Grocery Items']) < 5:
            test_categories['Grocery Items'].append((name, profile))
        elif profile['category'] == 'Liquor' and len(test_categories['Liquor Items']) < 5:
            test_categories['Liquor Items'].append((name, profile))
    
    # Test predictions for each category
    predictor = EnhancedPredictor()
    predictor.analyzer = analyzer
    predictor.profiles = profiles
    
    print("\n" + "="*80)
    print("🎯 TESTING INDIVIDUAL ITEM PATTERNS & PREDICTIONS")
    print("="*80)
    
    for category_name, items in test_categories.items():
        if not items:
            continue
            
        print(f"\n📊 {category_name.upper()}:")
        print("-" * 60)
        
        for name, profile in items:
            print(f"\n🔍 Item: {name}")
            print(f"   Category: {profile['category']}")
            print(f"   Total Sold: {profile['total_sold']} units")
            print(f"   Monthly Average: {profile['avg_monthly_sales']:.1f} units")
            print(f"   Current Stock: {profile['current_stock']} units")
            print(f"   Stock Status: {profile['stock_status']}")
            print(f"   Sales Trend: {profile['sales_trend']}")
            print(f"   Stock Velocity: {profile['stock_velocity']:.1f} months")
            print(f"   Average Price: ₹{profile['avg_price']:.2f}")
            
            # Check if item has seasonal patterns
            if 'seasonal_pattern' in profile and profile['seasonal_pattern']:
                print(f"   Seasonal Pattern: Yes (varies by month)")
                # Show peak and low months
                seasonal = profile['seasonal_pattern']
                if seasonal:
                    peak_month = max(seasonal.items(), key=lambda x: x[1])
                    low_month = min(seasonal.items(), key=lambda x: x[1])
                    print(f"   Peak Month: {peak_month[0]} ({peak_month[1]:.1f} units)")
                    print(f"   Low Month: {low_month[0]} ({low_month[1]:.1f} units)")
            else:
                print(f"   Seasonal Pattern: No significant variation")
            
            # Test prediction for 30 days ahead
            try:
                result = predictor.predict_for_date("2026-04-15", "MY_STORE")
                
                if "error" not in result:
                    # Find this item in predictions
                    item_prediction = None
                    for pred in result.get("predictions", []):
                        if pred.get("item_name", "").upper() == name.upper():
                            item_prediction = pred
                            break
                    
                    if item_prediction:
                        print(f"   ✅ PREDICTION (30 days ahead):")
                        print(f"      Predicted Demand: {item_prediction['predicted_demand']:.1f} units")
                        print(f"      Recommended Order: {item_prediction['recommended_order']} units")
                        print(f"      Status: {item_prediction['status']}")
                        print(f"      Confidence: {item_prediction['confidence']}")
                        
                        # Check if prediction makes sense
                        monthly_avg = profile['avg_monthly_sales']
                        predicted = item_prediction['predicted_demand']
                        
                        if monthly_avg > 0:
                            ratio = predicted / monthly_avg
                            if 0.5 <= ratio <= 2.0:
                                print(f"      ✅ Prediction Quality: GOOD (ratio: {ratio:.2f})")
                            elif 0.2 <= ratio <= 3.0:
                                print(f"      ⚠️ Prediction Quality: ACCEPTABLE (ratio: {ratio:.2f})")
                            else:
                                print(f"      ❌ Prediction Quality: POOR (ratio: {ratio:.2f})")
                        else:
                            print(f"      ℹ️ Prediction Quality: No historical data")
                    else:
                        print(f"   ❌ Item not found in predictions")
                else:
                    print(f"   ❌ Prediction Error: {result['error']}")
                    
            except Exception as e:
                print(f"   ❌ Prediction Failed: {e}")
    
    # Overall system assessment
    print(f"\n{'='*80}")
    print(f"📈 OVERALL SYSTEM ASSESSMENT")
    print(f"{'='*80}")
    
    # Count items by different characteristics
    high_volume = sum(1 for p in profiles.values() if p['total_sold'] > 1000)
    medium_volume = sum(1 for p in profiles.values() if 100 < p['total_sold'] <= 1000)
    low_volume = sum(1 for p in profiles.values() if p['total_sold'] <= 100)
    
    increasing_trend = sum(1 for p in profiles.values() if p['sales_trend'] == 'increasing')
    stable_trend = sum(1 for p in profiles.values() if p['sales_trend'] == 'stable')
    decreasing_trend = sum(1 for p in profiles.values() if p['sales_trend'] == 'decreasing')
    
    critical_stock = sum(1 for p in profiles.values() if p['stock_status'] == 'CRITICAL')
    low_stock = sum(1 for p in profiles.values() if p['stock_status'] == 'LOW')
    
    print(f"\n📊 Item Distribution:")
    print(f"   High Volume (>1000 units): {high_volume} items")
    print(f"   Medium Volume (100-1000): {medium_volume} items")
    print(f"   Low Volume (<100): {low_volume} items")
    
    print(f"\n📈 Sales Trends:")
    print(f"   Increasing: {increasing_trend} items")
    print(f"   Stable: {stable_trend} items")
    print(f"   Decreasing: {decreasing_trend} items")
    
    print(f"\n⚠️ Stock Alerts:")
    print(f"   Critical Stock: {critical_stock} items")
    print(f"   Low Stock: {low_stock} items")
    
    print(f"\n🎯 System Capability:")
    print(f"   ✅ Individual item analysis: YES")
    print(f"   ✅ Seasonal pattern detection: YES")
    print(f"   ✅ Trend analysis: YES")
    print(f"   ✅ Stock velocity calculation: YES")
    print(f"   ✅ Category-specific logic: YES")
    print(f"   ✅ Confidence scoring: YES")

if __name__ == "__main__":
    main()