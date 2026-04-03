"""
Debug query to see what's being returned
"""

import sqlite3
import pandas as pd

db_path = "converted_dataset/inventory_sales.db"
conn = sqlite3.connect(db_path)

item_name = "COCA COLA 250ML"
target_month = "04"

# Test query from advanced_predictions.py
query = '''
    SELECT
        strftime('%Y', date) as year,
        strftime('%m', date) as month,
        SUM(net_qty) as total_units,
        SUM(net_qty * r_rate) as total_sales
    FROM inventory_sales
    WHERE UPPER(TRIM(item_name)) = ?
    AND strftime('%m', date) = ?
    GROUP BY year, month
    ORDER BY year ASC
'''

print(f"Testing query for: {item_name}")
print(f"Target month: {target_month}")
print(f"Query params: ('{item_name.upper().strip()}', '{target_month}')")
print()

df = pd.read_sql_query(query, conn, params=(item_name.upper().strip(), target_month))

print(f"Results: {len(df)} rows")
print(df)
print()

# Also check what's in the database for this item
check_query = '''
    SELECT date, net_qty, r_rate, item_name
    FROM inventory_sales
    WHERE UPPER(TRIM(item_name)) = ?
    AND strftime('%Y', date) = '2026'
    ORDER BY date
'''

print(f"\nAll 2026 records for {item_name}:")
df2 = pd.read_sql_query(check_query, conn, params=(item_name.upper().strip(),))
print(df2)

conn.close()
