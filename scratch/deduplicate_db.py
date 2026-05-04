import sqlite3
import pandas as pd
from pathlib import Path

db_path = Path("converted_dataset/inventory_sales.db")
if not db_path.exists():
    print("Database not found")
    exit()

conn = sqlite3.connect(str(db_path))
# Get column names
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(inventory_sales)")
cols = [row[1] for row in cursor.fetchall()]

# Read all data
df = pd.read_sql("SELECT * FROM inventory_sales", conn)
print(f"Total rows in DB: {len(df)}")

# Deduplicate
dedup_cols = [c for c in df.columns if c not in ["S.No", "_ingested_at", "rowid"]]
df_clean = df.drop_duplicates(subset=dedup_cols)
print(f"Unique rows in DB: {len(df_clean)}")

if len(df_clean) < len(df):
    print(f"Removing {len(df) - len(df_clean)} duplicates...")
    # Overwrite the table with clean data
    df_clean.to_sql("inventory_sales", conn, if_exists="replace", index=False)
    conn.commit()
    print("Database deduplicated.")
else:
    print("No duplicates found in DB.")

conn.close()
