#!/usr/bin/env python3
"""
System Health Check Script
Tests all components of the AI-Powered Retail Inventory Management System
"""

import requests
import json
import sys
from datetime import datetime

def test_endpoint(url, method='GET', data=None, description=""):
    """Test an API endpoint and return results"""
    try:
        if method == 'GET':
            response = requests.get(url, timeout=10)
        elif method == 'POST':
            response = requests.post(url, json=data, timeout=10)
        
        if response.status_code == 200:
            print(f"✅ {description}: OK")
            return True, response.json()
        else:
            print(f"❌ {description}: HTTP {response.status_code}")
            return False, None
    except Exception as e:
        print(f"❌ {description}: {str(e)}")
        return False, None

def main():
    print("🔍 AI Retail Inventory System - Health Check")
    print("=" * 50)
    
    # Test Primary Model (Port 8000)
    print("\n📊 Testing Primary Model (Port 8000):")
    primary_ok, _ = test_endpoint("http://127.0.0.1:8000/", description="Primary Model Status")
    stores_ok, stores_data = test_endpoint("http://127.0.0.1:8000/stores", description="Stores Endpoint")
    
    if stores_ok and stores_data.get('stores'):
        store_id = stores_data['stores'][0]
        test_endpoint(f"http://127.0.0.1:8000/products/{store_id}", description="Products Endpoint")
        
        # Test bulk prediction
        bulk_data = {"store_id": store_id, "prediction_date": "2025-03-15"}
        test_endpoint("http://127.0.0.1:8000/bulk_predict", method='POST', data=bulk_data, description="Primary Bulk Prediction")
    
    # Test Secondary Model (Port 8001)
    print("\n🏪 Testing Secondary Model (Port 8001):")
    secondary_ok, secondary_info = test_endpoint("http://127.0.0.1:8001/", description="Secondary Model Status")
    
    if secondary_ok:
        print(f"   📦 Total Items: {secondary_info.get('inventory', {}).get('total_items', 'N/A')}")
        print(f"   🥬 Grocery Items: {secondary_info.get('inventory', {}).get('grocery_items', 'N/A')}")
        print(f"   🍷 Liquor Items: {secondary_info.get('inventory', {}).get('liquor_items', 'N/A')}")
    
    items_ok, items_data = test_endpoint("http://127.0.0.1:8001/items", description="Items Endpoint")
    test_endpoint("http://127.0.0.1:8001/items/grocery", description="Grocery Items")
    test_endpoint("http://127.0.0.1:8001/items/liquor", description="Liquor Items")
    
    # Test secondary bulk prediction
    bulk_data = {"store_id": "MY_STORE", "prediction_date": "2025-03-15"}
    bulk_ok, bulk_result = test_endpoint("http://127.0.0.1:8001/bulk_predict", method='POST', data=bulk_data, description="Secondary Bulk Prediction")
    
    if bulk_ok and bulk_result:
        summary = bulk_result.get('summary', {})
        print(f"   📊 Predictions: {summary.get('total_products', 'N/A')} products")
        print(f"   🚨 Critical Stock: {summary.get('critical_stock', 'N/A')}")
        print(f"   💰 Order Value: ₹{summary.get('total_order_value', 'N/A')}")
    
    # Test Frontend (Port 5173)
    print("\n🌐 Testing Frontend (Port 5173):")
    frontend_ok, _ = test_endpoint("http://localhost:5173/", description="Frontend Application")
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 SYSTEM STATUS SUMMARY:")
    
    if primary_ok:
        print("✅ Primary Model: OPERATIONAL")
    else:
        print("❌ Primary Model: OFFLINE")
    
    if secondary_ok:
        print("✅ Secondary Model: OPERATIONAL")
    else:
        print("❌ Secondary Model: OFFLINE")
    
    if frontend_ok:
        print("✅ Frontend: OPERATIONAL")
    else:
        print("❌ Frontend: OFFLINE")
    
    if primary_ok and secondary_ok and frontend_ok:
        print("\n🎉 ALL SYSTEMS OPERATIONAL!")
        print("🚀 Ready for production use!")
        return 0
    else:
        print("\n⚠️  Some components are offline.")
        print("📝 Check the startup scripts and ensure all services are running.")
        return 1

if __name__ == "__main__":
    sys.exit(main())