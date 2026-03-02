import pandas as pd
import numpy as np
import joblib
from pathlib import Path

from xgboost import XGBRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from features_secondary import create_features
from metrics import calculate_all_metrics, print_metrics, compare_metrics

# =========================
# Load data
# =========================
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

print("\n" + "="*70)
print("SECONDARY MODEL TRAINING (Liquor & Grocery 2024-2025)")
print("="*70)

df = pd.read_csv(DATA_DIR / "liquor_grocery_sales.csv")

df.columns = (
    df.columns.str.strip().str.lower().str.replace(" ", "_").str.replace("/", "_")
)

df['date'] = pd.to_datetime(df['date'], errors='coerce')

print(f"\nLoaded {len(df):,} records")
print(f"Date range: {df['date'].min()} to {df['date'].max()}")
print(f"Unique products: {df['product_id'].nunique()}")
print(f"Categories: {df['category'].unique().tolist()}")

# =========================
# BAD DATA REMOVAL (BIGGEST IMPACT)
# =========================
df = df[df['units_sold'] >= 0]
df = df[df['price'] > 0]
df = df.dropna()

print(f"After cleaning: {len(df):,} records")

# =========================
# Encode categoricals
# =========================
categorical_cols = [
    'store_id','product_id','category',
    'region','weather_condition','seasonality'
]

encoders = {}
for col in categorical_cols:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    encoders[col] = le

# =========================
# Feature engineering
# =========================
df = create_features(df)

print("\nWeekly Demand Distribution:")
print(df['units_sold_7d'].describe())

# =========================
# Features & Target
# =========================
FEATURES = [
    'store_id','product_id','category','region',
    'inventory_level','price','discount',
    'competitor_pricing','holiday_promotion',
    'seasonality','is_weekend','week','month',
    'lag_7','lag_14','lag_30','lag_60',
    'rolling_mean_7','rolling_mean_30'
]

TARGET = 'log_units_sold_7d'

# =========================
# Time-safe split
# =========================
split_date = df['date'].quantile(0.80)

X_train = df[df['date'] <= split_date][FEATURES]
y_train = df[df['date'] <= split_date][TARGET]

X_valid = df[df['date'] > split_date][FEATURES]
y_valid = df[df['date'] > split_date][TARGET]

print(f"\nTraining set: {len(X_train):,} records")
print(f"Validation set: {len(X_valid):,} records")

# =========================
# Train model
# =========================
print("\nTraining XGBoost model...")

model = XGBRegressor(
    n_estimators=600,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=5,
    gamma=0.2,
    reg_alpha=0.5,
    reg_lambda=1.5,
    objective="reg:squarederror",
    tree_method="hist",
    random_state=42
)

model.fit(X_train, y_train)

print("Training complete!")

# =========================
# Evaluation with Advanced Metrics
# =========================
print("\n" + "="*70)
print("MODEL EVALUATION WITH ZERO-DEMAND HANDLING")
print("="*70)

# Training set predictions
train_preds = np.expm1(model.predict(X_train))
train_true = np.expm1(y_train)

# Validation set predictions
valid_preds = np.expm1(model.predict(X_valid))
valid_true = np.expm1(y_valid)

# Calculate comprehensive metrics
train_metrics = calculate_all_metrics(
    train_true, 
    train_preds, 
    y_train=None,
    exclude_zeros=True
)

valid_metrics = calculate_all_metrics(
    valid_true, 
    valid_preds, 
    y_train=train_true,
    exclude_zeros=True
)

# Print metrics
print_metrics(train_metrics, "TRAINING SET PERFORMANCE")
print_metrics(valid_metrics, "VALIDATION SET PERFORMANCE")

# Compare metrics
compare_metrics(train_metrics, valid_metrics)

# Data split info
print(f"\n{'='*70}")
print(f"DATA SPLIT INFORMATION")
print(f"{'='*70}")
print(f"\n   Split Date: {split_date}")
print(f"   Training: {len(X_train):,} records ({len(X_train)/len(df)*100:.1f}%)")
print(f"   Validation: {len(X_valid):,} records ({len(X_valid)/len(df)*100:.1f}%)")
print(f"\n   Training Zero-Demand: {train_metrics['zero_records']:,} ({train_metrics['zero_percentage']:.1f}%)")
print(f"   Validation Zero-Demand: {valid_metrics['zero_records']:,} ({valid_metrics['zero_percentage']:.1f}%)")

# Prediction range
print(f"\n{'='*70}")
print(f"PREDICTION RANGE")
print(f"{'='*70}")
print(f"\n   Training:")
print(f"      Min: {train_preds.min():.2f}, Max: {train_preds.max():.2f}, Mean: {train_preds.mean():.2f}")
print(f"   Validation:")
print(f"      Min: {valid_preds.min():.2f}, Max: {valid_preds.max():.2f}, Mean: {valid_preds.mean():.2f}")

# Final interpretation
print(f"\n{'='*70}")
print(f"FINAL MODEL ASSESSMENT")
print(f"{'='*70}")

primary_accuracy = valid_metrics['wape_accuracy']

print(f"\n   PRIMARY METRIC: WAPE Accuracy = {primary_accuracy:.2f}%")
print(f"   (WAPE is most robust to zero-demand records)")

if primary_accuracy >= 90:
    print(f"\n   EXCELLENT! Model is highly accurate")
    print(f"      - Predictions are highly reliable")
    print(f"      - Safe for production use")
elif primary_accuracy >= 80:
    print(f"\n   GOOD! Model is reliable")
    print(f"      - Predictions are reliable")
    print(f"      - Suitable for production")
elif primary_accuracy >= 70:
    print(f"\n   MODERATE. Model is acceptable")
    print(f"      - Use with caution")
    print(f"      - Consider improvements")
else:
    print(f"\n   POOR. Model needs improvement")
    print(f"      - Not recommended for production")
    print(f"      - Retrain with more/better data")

print(f"\n{'='*70}")

# =========================
# Save artifacts
# =========================
joblib.dump(model, MODEL_DIR / "demand_model_secondary.pkl")
joblib.dump(encoders, MODEL_DIR / "encoders_secondary.pkl")

# Save comprehensive metrics
metrics = {
    'train_mae': train_metrics['mae'],
    'train_rmse': train_metrics['rmse'],
    'train_r2': train_metrics['r2'],
    'train_mape': train_metrics['mape'],
    'train_smape': train_metrics['smape'],
    'train_wape': train_metrics['wape'],
    'train_mape_accuracy': train_metrics['mape_accuracy'],
    'train_smape_accuracy': train_metrics['smape_accuracy'],
    'train_wape_accuracy': train_metrics['wape_accuracy'],
    'train_zero_records': train_metrics['zero_records'],
    'train_zero_percentage': train_metrics['zero_percentage'],
    'valid_mae': valid_metrics['mae'],
    'valid_rmse': valid_metrics['rmse'],
    'valid_r2': valid_metrics['r2'],
    'valid_mape': valid_metrics['mape'],
    'valid_smape': valid_metrics['smape'],
    'valid_wape': valid_metrics['wape'],
    'valid_mape_accuracy': valid_metrics['mape_accuracy'],
    'valid_smape_accuracy': valid_metrics['smape_accuracy'],
    'valid_wape_accuracy': valid_metrics['wape_accuracy'],
    'valid_mase': valid_metrics['mase'],
    'valid_zero_records': valid_metrics['zero_records'],
    'valid_zero_percentage': valid_metrics['zero_percentage'],
    'train_records': len(X_train),
    'valid_records': len(X_valid),
    'split_date': str(split_date),
    'primary_accuracy': valid_metrics['wape_accuracy'],
    'primary_metric': 'WAPE'
}

joblib.dump(metrics, MODEL_DIR / "model_metrics_secondary.pkl")

print("\nWeekly demand model trained & saved")
print(f"Model saved to: {MODEL_DIR / 'demand_model_secondary.pkl'}")
print(f"Metrics saved to: {MODEL_DIR / 'model_metrics_secondary.pkl'}")
print(f"\nPRIMARY ACCURACY (WAPE): {valid_metrics['wape_accuracy']:.2f}%")
print("\n" + "="*70)
print("SECONDARY MODEL READY FOR USE!")
print("="*70)
