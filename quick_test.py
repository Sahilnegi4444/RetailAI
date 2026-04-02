"""Quick Prediction Test"""
import requests
import json

API_URL = "http://localhost:8001"

print("🧪 Quick Prediction Test\n")

# Test 1: Health Check
print("1️⃣ Testing Health Check...")
try:
    response = requests.get(f"{API_URL}/health")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Status: {data.get('status')}")
        print(f"   ✅ Model Loaded: {data.get('model_loaded')}")
        print(f"   ✅ System: {data.get('system')}")
    else:
        print(f"   ❌ Error: {response.status_code}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 2: Paginated Predictions
print("\n2️⃣ Testing Paginated Predictions...")
try:
    response = requests.post(
        f"{API_URL}/predict-paginated?page=1&page_size=5",
        json={"prediction_date": "2026-04-02"},
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Predictions: {len(data['predictions'])}")
        print(f"   ✅ Total Items: {data['pagination']['total_items']}")
        print(f"   ✅ Accuracy: {data['summary']['model_accuracy']}")
        
        # Show first prediction
        if data['predictions']:
            pred = data['predictions'][0]
            print(f"\n   📊 Sample: {pred['item_name']}")
            print(f"      Prediction: {pred['final_prediction']:.2f}")
            print(f"      Confidence: {pred['confidence']*100:.1f}%")
            print(f"      Trend: {pred['trend']}")
    else:
        print(f"   ❌ Error: {response.status_code}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 3: Previous Years
print("\n3️⃣ Testing Previous Years Prediction...")
try:
    response = requests.post(
        f"{API_URL}/predict-previous-years",
        json={"items": ["BDWISER CAN BEER STRONG"], "target_date": "2026-04-01"},
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        data = response.json()
        if data['predictions']:
            pred = data['predictions'][0]
            print(f"   ✅ Item: {pred['item_name']}")
            print(f"   ✅ Prediction: {pred['prediction']:.2f}")
            print(f"   ✅ Confidence: {pred['confidence']*100:.1f}%")
            print(f"   ✅ Years analyzed: {len(pred['yearly_data'])}")
            print(f"   ✅ Trend: {pred['statistics']['trend']}")
    else:
        print(f"   ❌ Error: {response.status_code}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 4: Last N Months
print("\n4️⃣ Testing Last N Months Prediction...")
try:
    response = requests.post(
        f"{API_URL}/predict-last-n-months",
        json={"items": ["BDWISER CAN BEER STRONG"], "n_months": 4},
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        data = response.json()
        if data['predictions']:
            pred = data['predictions'][0]
            print(f"   ✅ Item: {pred['item_name']}")
            print(f"   ✅ Prediction: {pred['prediction']:.2f}")
            print(f"   ✅ Confidence: {pred['confidence']*100:.1f}%")
            print(f"   ✅ Months analyzed: {len(pred['monthly_data'])}")
            print(f"   ✅ Trend: {pred['statistics']['trend']}")
    else:
        print(f"   ❌ Error: {response.status_code}")
except Exception as e:
    print(f"   ❌ Error: {e}")

print("\n✅ All tests completed!")
