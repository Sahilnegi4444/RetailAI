"""
ML Training Pipeline from Database
Trains XGBoost model on clean data from database
"""

import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

from xgboost import XGBRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, mean_absolute_percentage_error
from inventory_model_secondary.src.database_manager import DatabaseManager

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"

class MLTrainerFromDB:
    """Train ML model from database"""
    
    def __init__(self, db_path="converted_dataset/inventory_sales.db"):
        self.db = DatabaseManager(db_path)
        self.model = None
        self.encoders = {}
        self.metrics = {}
        self.features = None
    
    def load_data_from_db(self):
        """Load training data from database"""
        
        print("\n" + "="*80)
        print("ML TRAINING PIPELINE - LOADING DATA FROM DATABASE")
        print("="*80)
        
        self.db.connect()
        
        # Get training data
        df = self.db.get_training_data()
        
        if df is None or len(df) == 0:
            print("ERROR: No data found in database")
            return None
        
        print(f"\nOK Loaded {len(df):,} records from database")
        print(f"  Date range: {df['date'].min()} to {df['date'].max()}")
        print(f"  Unique items: {df['item_name'].nunique():,}")
        print(f"  Categories: {df['category'].unique()}")
        
        return df
    
    def engineer_features(self, df):
        """Engineer features for ML model"""
        
        print("\n[STEP 1] Engineering features...")
        
        df = df.copy()
        
        # Basic features
        df['price_margin'] = df['r_rate'] - df['w_rate']
        df['discount_ratio'] = df['price_margin'] / (df['r_rate'] + 1)
        df['stock_turnover'] = df['net_qty'] / (df['closing_stock'] + 1)
        df['profit_per_unit'] = df['profit'] / (df['net_qty'] + 1)
        
        # Time-based features
        df['date'] = pd.to_datetime(df['date'])
        df['month'] = df['date'].dt.month
        df['quarter'] = df['date'].dt.quarter
        df['day_of_year'] = df['date'].dt.dayofyear
        
        # Cyclical encoding for month
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        
        # Lag features (per item)
        df = df.sort_values(['item_name', 'date']).reset_index(drop=True)
        df['lag_1'] = df.groupby('item_name')['net_qty'].shift(1).fillna(0)
        df['lag_2'] = df.groupby('item_name')['net_qty'].shift(2).fillna(0)
        df['lag_3'] = df.groupby('item_name')['net_qty'].shift(3).fillna(0)
        
        # Rolling averages
        df['rolling_mean_7'] = df.groupby('item_name')['net_qty'].transform(
            lambda x: x.rolling(window=7, min_periods=1).mean()
        )
        df['rolling_mean_30'] = df.groupby('item_name')['net_qty'].transform(
            lambda x: x.rolling(window=30, min_periods=1).mean()
        )
        
        print("OK Features engineered successfully")
        
        return df
    
    def encode_categorical(self, df):
        """Encode categorical variables"""
        
        print("\n[STEP 2] Encoding categorical variables...")
        
        df = df.copy()
        
        # Encode item names
        le_item = LabelEncoder()
        df['item_encoded'] = le_item.fit_transform(df['item_name'].astype(str))
        self.encoders['item_name'] = le_item
        
        # Encode categories
        le_cat = LabelEncoder()
        df['category_encoded'] = le_cat.fit_transform(df['category'].astype(str))
        self.encoders['category'] = le_cat
        
        print(f"OK Encoded {len(le_item.classes_)} unique items")
        print(f"OK Encoded {len(le_cat.classes_)} categories")
        
        return df
    
    def prepare_training_data(self, df):
        """Prepare final training data"""
        
        print("\n[STEP 3] Preparing training data...")
        
        # Define features - use only available columns
        self.features = [
            'item_encoded', 'category_encoded', 'month',
            'w_rate', 'r_rate', 'price_margin', 'discount_ratio',
            'stock_turnover', 'profit_per_unit', 'closing_stock',
            'lag_1', 'lag_2', 'lag_3',
            'rolling_mean_7', 'rolling_mean_30',
            'month_sin', 'month_cos', 'quarter', 'day_of_year'
        ]
        
        # Remove rows with NaN in features or target
        df = df.dropna(subset=self.features + ['net_qty'])
        
        # Remove outliers (net_qty > 10000 or < 0)
        df = df[(df['net_qty'] >= 0) & (df['net_qty'] <= 10000)]
        
        X = df[self.features].copy()
        y = df['net_qty'].copy()
        
        print(f"OK Training data prepared: {len(X):,} records")
        print(f"  Features: {len(self.features)}")
        print(f"  Target range: {y.min():.2f} to {y.max():.2f}")
        
        return X, y
    
    def train_model(self, X, y):
        """Train XGBoost model"""
        
        print("\n[STEP 4] Training XGBoost model...")
        
        # Time-based split (80% train, 20% validation)
        split_idx = int(len(X) * 0.8)
        X_train, X_valid = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_valid = y.iloc[:split_idx], y.iloc[split_idx:]
        
        print(f"  Training set: {len(X_train):,} records")
        print(f"  Validation set: {len(X_valid):,} records")
        
        # Train model
        self.model = XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=3,
            gamma=0.1,
            reg_alpha=0.5,
            reg_lambda=1.0,
            objective="reg:squarederror",
            random_state=42,
            verbosity=0
        )
        
        self.model.fit(X_train, y_train)
        
        print("OK Model training complete")
        
        # Evaluate
        self._evaluate_model(X_train, y_train, X_valid, y_valid)
    
    def _evaluate_model(self, X_train, y_train, X_valid, y_valid):
        """Evaluate model performance"""
        
        print("\n[STEP 5] Evaluating model...")
        
        # Training metrics
        y_train_pred = self.model.predict(X_train)
        train_mae = mean_absolute_error(y_train, y_train_pred)
        train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
        
        # Validation metrics
        y_valid_pred = self.model.predict(X_valid)
        valid_mae = mean_absolute_error(y_valid, y_valid_pred)
        valid_rmse = np.sqrt(mean_squared_error(y_valid, y_valid_pred))
        
        # Calculate accuracy as 1 - (MAE / mean_value)
        mean_valid = y_valid.mean()
        valid_accuracy = max(0, 100 * (1 - valid_mae / (mean_valid + 1)))
        
        # Store metrics
        self.metrics = {
            'train_mae': float(train_mae),
            'train_rmse': float(train_rmse),
            'valid_mae': float(valid_mae),
            'valid_rmse': float(valid_rmse),
            'valid_accuracy': float(valid_accuracy),
            'features': self.features,
            'training_date': datetime.now().isoformat(),
            'model_type': 'XGBoost ML-Only'
        }
        
        print(f"\n  Training MAE: {train_mae:.2f} units")
        print(f"  Training RMSE: {train_rmse:.2f} units")
        
        print(f"\n  Validation MAE: {valid_mae:.2f} units")
        print(f"  Validation RMSE: {valid_rmse:.2f} units")
        print(f"  Validation Accuracy: {valid_accuracy:.1f}%")
        
        if valid_accuracy >= 85:
            print("\n  OK STATUS: EXCELLENT - Ready for production")
        elif valid_accuracy >= 75:
            print("\n  OK STATUS: GOOD - Suitable for production")
        else:
            print("\n  OK STATUS: ACCEPTABLE - Monitor performance")
    
    def save_model(self):
        """Save model and artifacts"""
        
        print("\n[STEP 6] Saving model...")
        
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        
        joblib.dump(self.model, MODEL_DIR / "ml_model.pkl")
        joblib.dump(self.encoders, MODEL_DIR / "ml_encoders.pkl")
        joblib.dump(self.metrics, MODEL_DIR / "ml_metrics.pkl")
        
        print(f"OK Model saved to {MODEL_DIR / 'ml_model.pkl'}")
        print(f"OK Encoders saved to {MODEL_DIR / 'ml_encoders.pkl'}")
        print(f"OK Metrics saved to {MODEL_DIR / 'ml_metrics.pkl'}")
    
    def train(self):
        """Complete training pipeline"""
        
        # Load data
        df = self.load_data_from_db()
        if df is None:
            return False
        
        # Engineer features
        df = self.engineer_features(df)
        
        # Encode categorical
        df = self.encode_categorical(df)
        
        # Prepare training data
        X, y = self.prepare_training_data(df)
        
        # Train model
        self.train_model(X, y)
        
        # Save model
        self.save_model()
        
        self.db.disconnect()
        
        print("\n" + "="*80)
        print("OK ML TRAINING COMPLETE")
        print("="*80)
        
        return True

# Usage
if __name__ == "__main__":
    trainer = MLTrainerFromDB()
    trainer.train()
