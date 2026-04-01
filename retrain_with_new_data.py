#!/usr/bin/env python3
"""
Retrain XGBoost model with newly uploaded data
This script loads ALL data from the database (including April 2026) and retrains the model
"""

import sys
from pathlib import Path

# Add project to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from inventory_model_secondary.src.ml_training_from_db import MLTrainerFromDB
from inventory_model_secondary.src.hybrid_active import HybridActiveSystem
from inventory_model_secondary.src.database_manager import DatabaseManager

def main():
    print("\n" + "="*80)
    print("RETRAINING WITH NEW DATA")
    print("="*80)
    
    # Step 1: Check database stats
    print("\n[STEP 1] Checking database...")
    db = DatabaseManager()
    db.connect()
    stats = db.get_database_stats()
    db.disconnect()
    
    print(f"  Total records: {stats['total_records']:,}")
    print(f"  Unique items: {stats['unique_items']:,}")
    print(f"  Date range: {stats['date_range'][0]} to {stats['date_range'][1]}")
    print(f"  Total units sold: {stats['total_units_sold']:,.0f}")
    
    # Step 2: Retrain model
    print("\n[STEP 2] Retraining XGBoost model...")
    trainer = MLTrainerFromDB()
    success = trainer.train()
    
    if not success:
        print("ERROR: Training failed!")
        return False
    
    # Step 3: Reload hybrid system
    print("\n[STEP 3] Reloading hybrid system...")
    try:
        hybrid = HybridActiveSystem()
        print("OK Hybrid system loaded with new model")
    except Exception as e:
        print(f"ERROR: Failed to load hybrid system: {e}")
        return False
    
    # Step 4: Test predictions
    print("\n[STEP 4] Testing predictions...")
    result = hybrid.predict_for_date("2026-04-01")
    
    if result is None:
        print("ERROR: Prediction failed!")
        return False
    
    predictions = result.get('predictions', [])
    print(f"OK Generated {len(predictions)} predictions")
    
    # Step 5: Search for specific items
    print("\n[STEP 5] Searching for test items...")
    
    test_items = ["COCA COLA 250ML", "GILLETTE", "GELLETE"]
    
    for test_item in test_items:
        found = False
        for pred in predictions:
            if pred.get('item_name', '').upper() == test_item.upper():
                print(f"\n[FOUND] {pred['item_name']}")
                print(f"   Predicted Demand: {pred.get('final_prediction', 0):.0f} units")
                print(f"   Current Stock: {pred.get('current_stock', 0)}")
                print(f"   Trend: {pred.get('trend', 'N/A')}")
                found = True
                break
        
        if not found:
            print(f"\n[NOT FOUND] {test_item}")
    
    print("\n" + "="*80)
    print("RETRAINING COMPLETE")
    print("="*80)
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
