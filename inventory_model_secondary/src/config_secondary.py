from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

MODEL_FILE = MODEL_DIR / "demand_model_secondary.pkl"
ENCODERS_FILE = MODEL_DIR / "encoders_secondary.pkl"
METRICS_FILE = MODEL_DIR / "model_metrics_secondary.pkl"
DATA_FILE = DATA_DIR / "liquor_grocery_sales.csv"
