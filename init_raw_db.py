import os
import pandas as pd
import sqlite3
import re
from pathlib import Path
from datetime import datetime

# Paths
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "converted_dataset" / "inventory_sales.db"
DATA_DIR = BASE_DIR / "data"

# Extract month from filename
def extract_month(filename):
    month_match = re.search(r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)', filename.lower())
    month = month_match.group(1) if month_match else 'unknown'
    month_full = {
        'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
        'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
        'sep': 'September', 'oct': 'October', 'nov': 'November', 'dec': 'December'
    }.get(month, month)
    return month_full

def init_db():
    # Ensure directory exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # Drop old table and create new
    print("Dropping old tables...")
    cursor.execute("DROP TABLE IF EXISTS inventory_sales")
    cursor.execute("DROP TABLE IF EXISTS upload_log")
    
    # Create upload_log
    cursor.execute("""
    CREATE TABLE upload_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        year INTEGER NOT NULL,
        month TEXT NOT NULL,
        category TEXT NOT NULL,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(year, month, category)
    )
    """)
    conn.commit()
    
    # We will let pandas create the inventory_sales table automatically using df.to_sql
    
    print(f"Scanning {DATA_DIR} for raw files...")
    
    for year_dir in DATA_DIR.iterdir():
        if not year_dir.is_dir() or not re.match(r'20\d\d', year_dir.name):
            continue
            
        year = int(year_dir.name)
        
        for category_dir in year_dir.iterdir():
            if not category_dir.is_dir():
                continue
                
            # e.g., "Grocery 2024" or "Liquor 2024"
            cat_name = category_dir.name.split(' ')[0]
            
            for file_path in category_dir.iterdir():
                if file_path.is_dir() or not file_path.name.lower().endswith(('.xlsx', '.xls', '.csv')):
                    continue
                    
                # Skip the cleaned files which are in the 'cleaned' folder (handled by is_dir check)
                # But just to be safe, if a file has 'cleaned' in the name, skip it
                if 'cleaned' in file_path.name.lower() or file_path.name.startswith('~$'):
                    continue
                    
                month = extract_month(file_path.name)
                
                print(f"Ingesting: {file_path.name} (Year: {year}, Month: {month}, Category: {cat_name})")
                
                try:
                    if file_path.name.lower().endswith('.csv'):
                        df = pd.read_csv(file_path)
                    else:
                        df = pd.read_excel(file_path, engine='openpyxl')
                    
                    # Add metadata columns
                    df['_source_file'] = file_path.name
                    df['_year'] = year
                    df['_month'] = month
                    df['_category'] = cat_name
                    df['_ingested_at'] = datetime.now()
                    
                    # Store in DB
                    df.to_sql('inventory_sales', conn, if_exists='append', index=False)
                    
                    # Log to upload_log
                    cursor.execute("""
                        INSERT OR REPLACE INTO upload_log (filename, year, month, category)
                        VALUES (?, ?, ?, ?)
                    """, (file_path.name, year, month, cat_name))
                    conn.commit()
                    
                except Exception as e:
                    print(f"  [ERROR] Failed to ingest {file_path.name}: {e}")
                    
    conn.close()
    print("\nDatabase initialization complete.")

if __name__ == "__main__":
    init_db()
