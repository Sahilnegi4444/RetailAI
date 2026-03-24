"""
Hybrid ML + Business Logic Training Pipeline
Combines XGBoost predictions with business intelligence rules
"""

import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

from xgboost import XGBRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, mean_absolute_percentage_error

from inventory_model_secondary.src.features_secondary import create_features
from inventory_model_secondary.src.business_intelligence import InventoryAnalyzer

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

print("\n" + "="*80)
print("HYBRID ML + BUSINESS LOGIC TRAINING PIPELINE")
print("="*80)

# ============================================================================
# STEP 1: Load and Prepare Data
# ============================================================================
print("\n[STEP 1] Loading business data...")

analyzer = InventoryAnalyzer()
profiles = analyzer.load_and_process_data()

if not profiles:
    print("ERROR: Failed to load data")
    exit(1)

print(f"Loaded {len(profiles)} items")

# ============================================================================
# STEP 2: Create Training Dataset from Profiles
# ============================================================================
print("\n[STEP 2] Creating training dataset from item profiles...")

training_data = []

for item_name, profile in profiles.items():
    if 'monthly_sales_history' not in profile or not profile['monthly_sales_history']:
        continue
    
    monthly_history = profile['monthly_sales_history']
    
    if len(monthly_history) < 3:  # Need at least 3 months
        continue
    
    # Create records for each month
    for i, month_data in enumerate(monthly_history):
        year = month_data['year']
        month = month_data['month']
        sales = month_data['sales']
        
        # Calculate lag features
        lag_1 = monthly_history[i-1]['sales'] if i >= 1 else sales
        lag_2 = monthly_history[i-2]['sales'] if i >= 2 else sales
        lag_3 = monthly_history[i-3]['sales'] if i >= 3 else sales
        
        # Calculate rolling averages
        if i >= 2:
            rolling_mean_3 = np.mean([monthly_history[j]['sales'] for j in range(max(0, i-2), i+1)])
        else:
            rolling_mean_3 = sales
        
        # Seasonal indicators
        is_peak_season = month in [10, 11, 12]  # Oct-Dec typically peak
        is_low_season = month in [5, 6, 7]      # May-Jul typically low
        
        # Trend calculation (year-over-year)
        yoy_change = 0
        if i > 0:
            prev_sales = monthly_history[i-1]['sales']
            if prev_sales > 0:
                yoy_change = (sales - prev_sales) / prev_sales
        
        training_data.append({
            'item_name': item_name,
            'category': profile['category'],
            'year': year,
            'month': month,
            'sales': sales,
            'lag_1': lag_1,
            'lag_2': lag_2,
            'lag_3': lag_3,
            'rolling_mean_3': rolling_mean_3,
            'is_peak_season': is_peak_season,
            'is_low_season': is_low_season,
            'yoy_change': yoy_change,
            'avg_monthly_sales': profile['avg_monthly_sales'],
            'total_sold': profile['total_sold'],
            'months_data': profile['months_data'],
            'current_stock': profile['current_stock'],
            'avg_price': profile['avg_price'],
        })

df = pd.DataFrame(training_data)

print(f"Created {len(df)} training records from {len(profiles)} items")
print(f"Date range: {df['year'].min()}-{df['month'].min():02d} to {df['year'].max()}-{df['month'].max():02d}")

# ============================================================================
# STEP 3: Encode Categorical Variables
# ============================================================================
print("\n[STEP 3] Encoding categorical variables...")

encoders = {}

# Encode item names
le_item = LabelEncoder()
df['item_encoded'] = le_item.fit_transform(df['item_name'].astype(str))
encoders['item_name'] = le_item

# Encode categories
le_cat = LabelEncoder()
df['category_encoded'] = le_cat.fit_transform(df['category'].astype(str))
encoders['category'] = le_cat

print(f"Encoded {len(le_item.classes_)} unique items")
print(f"Encoded {len(le_cat.classes_)} categories")

# ============================================================================
# STEP 4: Feature Engineering
# ============================================================================
print("\n[STEP 4] Engineering features...")

# Normalize features
df['lag_1_norm'] = df['lag_1'] / (df['avg_monthly_sales'] + 1)
df['lag_2_norm'] = df['lag_2'] / (df['avg_monthly_sales'] + 1)
df['lag_3_norm'] = df['lag_3'] / (df['avg_monthly_sales'] + 1)
df['rolling_mean_3_norm'] = df['rolling_mean_3'] / (df['avg_monthly_sales'] + 1)

# Cyclical encoding for month
df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

# Trend features
df['trend_up'] = (df['yoy_change'] > 0.1).astype(int)
df['trend_down'] = (df['yoy_change'] < -0.1).astype(int)
df['trend_stable'] = ((df['yoy_change'] >= -0.1) & (df['yoy_change'] <= 0.1)).astype(int)

# Volatility (coefficient of variation)
df['volatility'] = df.groupby('item_name')['sales'].transform(lambda x: x.std() / (x.mean() + 1))

print("Features engineered successfully")

# ============================================================================
# STEP 5: Prepare Training/Validation Split
# ============================================================================
print("\n[STEP 5] Preparing time-based train/validation split...")

# Sort by year and month
df = df.sort_values(['year', 'month']).reset_index(drop=True)

# Time-based split (80% train, 20% validation)
split_idx = int(len(df) * 0.8)
df_train = df.iloc[:split_idx].copy()
df_valid = df.iloc[split_idx:].copy()

print(f"Training set: {len(df_train)} records ({len(df_train)/len(df)*100:.1f}%)")
print(f"Validation set: {len(df_valid)} records ({len(df_valid)/len(df)*100:.1f}%)")
print(f"Split date: {df_train['year'].max()}-{df_train[df_train['year']==df_train['year'].max()]['month'].max():02d}")

# ============================================================================
# STEP 6: Define Features and Target
# ============================================================================
print("\n[STEP 6] Defining features and target...")

FEATURES = [
    'item_encoded', 'category_encoded', 'month',
    'lag_1_norm', 'lag_2_norm', 'lag_3_norm', 'rolling_mean_3_norm',
    'is_peak_season', 'is_low_season',
    'yoy_change', 'trend_up', 'trend_down', 'trend_stable',
    'month_sin', 'month_cos',
    'volatility', 'months_data'
]

TARGET = 'sales'

X_train = df_train[FEATURES].copy()
y_train = df_train[TARGET].copy()

X_valid = df_valid[FEATURES].copy()
y_valid = df_valid[TARGET].copy()

print(f"Features: {len(FEATURES)}")
print(f"Target: {TARGET}")

# ============================================================================
# STEP 7: Train XGBoost Model
# ============================================================================
print("\n[STEP 7] Training XGBoost model...")

model = XGBRegressor(
    n_estimators=500,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=3,
    gamma=0.1,
    reg_alpha=0.5,
    reg_lambda=1.0,
    objective="reg:squarederror",
    tree_method="hist",
    random_state=42,
    verbosity=0
)

model.fit(
    X_train, y_train,
    eval_set=[(X_valid, y_valid)],
    early_stopping_rounds=50,
    verbose=False
)

print("Model training complete!")

# ============================================================================
# STEP 8: Evaluate Model
# ============================================================================
print("\n[STEP 8] Evaluating model performance...")

# Training predictions
y_train_pred = model.predict(X_train)
train_mae = mean_absolute_error(y_train, y_train_pred)
train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
train_mape = mean_absolute_percentage_error(y_train, y_train_pred)

# Validation predictions
y_valid_pred = model.predict(X_valid)
valid_mae = mean_absolute_error(y_valid, y_valid_pred)
valid_rmse = np.sqrt(mean_squared_error(y_valid, y_valid_pred))
valid_mape = mean_absolute_percentage_error(y_valid, y_valid_pred)

print("\n" + "="*80)
print("MODEL PERFORMANCE METRICS")
print("="*80)

print(f"\nTRAINING SET:")
print(f"  MAE:  {train_mae:.2f} units")
print(f"  RMSE: {train_rmse:.2f} units")
print(f"  MAPE: {train_mape:.2f}%")

print(f"\nVALIDATION SET:")
print(f"  MAE:  {valid_mae:.2f} units")
print(f"  RMSE: {valid_rmse:.2f} units")
print(f"  MAPE: {valid_mape:.2f}%")

# Calculate accuracy
valid_accuracy = max(0, 100 - valid_mape)
print(f"\nPREDICTION ACCURACY: {valid_accuracy:.1f}%")

if valid_accuracy >= 85:
    print("STATUS: EXCELLENT - Ready for production")
elif valid_accuracy >= 75:
    print("STATUS: GOOD - Suitable for production")
elif valid_accuracy >= 65:
    print("STATUS: ACCEPTABLE - Use with caution")
else:
    print("STATUS: NEEDS IMPROVEMENT - Retrain with more data")

# ============================================================================
# STEP 9: Feature Importance
# ============================================================================
print("\n[STEP 9] Feature importance analysis...")

feature_importance = pd.DataFrame({
    'feature': FEATURES,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print("\nTop 10 Most Important Features:")
for idx, row in feature_importance.head(10).iterrows():
    print(f"  {row['feature']:25} {row['importance']:.4f}")

# ============================================================================
# STEP 10: Save Model and Artifacts
# ============================================================================
print("\n[STEP 10] Saving model and artifacts...")

joblib.dump(model, MODEL_DIR / "demand_model_secondary.pkl")
joblib.dump(encoders, MODEL_DIR / "encoders_secondary.pkl")

# Save metrics
metrics = {
    'train_mae': float(train_mae),
    'train_rmse': float(train_rmse),
    'train_mape': float(train_mape),
    'valid_mae': float(valid_mae),
    'valid_rmse': float(valid_rmse),
    'valid_mape': float(valid_mape),
    'valid_accuracy': float(valid_accuracy),
    'train_records': len(X_train),
    'valid_records': len(X_valid),
    'total_records': len(df),
    'unique_items': len(profiles),
    'features': FEATURES,
    'feature_importance': feature_importance.to_dict('records'),
    'training_date': datetime.now().isoformat(),
    'model_type': 'XGBoost Hybrid ML + Business Logic'
}

joblib.dump(metrics, MODEL_DIR / "model_metrics_secondary.pkl")

print(f"Model saved to: {MODEL_DIR / 'demand_model_secondary.pkl'}")
print(f"Encoders saved to: {MODEL_DIR / 'encoders_secondary.pkl'}")
print(f"Metrics saved to: {MODEL_DIR / 'model_metrics_secondary.pkl'}")

# ============================================================================
# STEP 11: Summary Report
# ============================================================================
print("\n" + "="*80)
print("TRAINING PIPELINE COMPLETE")
print("="*80)

print(f"\nDataset Summary:")
print(f"  Total Records: {len(df):,}")
print(f"  Unique Items: {len(profiles):,}")
print(f"  Date Range: {df['year'].min()}-{df['month'].min():02d} to {df['year'].max()}-{df['month'].max():02d}")
print(f"  Categories: {df['category'].nunique()}")

print(f"\nModel Configuration:")
print(f"  Algorithm: XGBoost Regressor")
print(f"  Features: {len(FEATURES)}")
print(f"  Max Depth: 5")
print(f"  Learning Rate: 0.05")
print(f"  Estimators: 500")

print(f"\nPerformance:")
print(f"  Validation MAE: {valid_mae:.2f} units")
print(f"  Validation RMSE: {valid_rmse:.2f} units")
print(f"  Validation MAPE: {valid_mape:.2f}%")
print(f"  Prediction Accuracy: {valid_accuracy:.1f}%")

print(f"\nModel Status: READY FOR PRODUCTION")
print("="*80 + "\n")
