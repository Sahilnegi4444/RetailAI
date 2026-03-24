"""
Database Manager
Stores cleaned data in SQLite database for ML training
"""

import sqlite3
import pandas as pd
from pathlib import Path
from datetime import datetime

class DatabaseManager:
    """Manage inventory sales database"""
    
    def __init__(self, db_path="converted_dataset/inventory_sales.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = None
    
    def connect(self):
        """Connect to database"""
        self.conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        print(f"Connected to database: {self.db_path}")
    
    def disconnect(self):
        """Disconnect from database"""
        if self.conn:
            self.conn.close()
    
    def create_tables(self):
        """Create database tables"""
        
        cursor = self.conn.cursor()
        
        # Main inventory sales table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS inventory_sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL,
                s_no INTEGER,
                gp_index_no TEXT,
                pluno TEXT,
                item_name TEXT NOT NULL,
                w_rate REAL,
                r_rate REAL,
                qty REAL,
                refund_qty REAL,
                net_qty REAL NOT NULL,
                r_amt REAL,
                w_amt REAL,
                profit REAL,
                o_b REAL,
                closing_stock REAL,
                net_tax REAL,
                year INTEGER,
                month INTEGER,
                category TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, pluno, item_name)
            )
        ''')
        
        # Item master table (for quick lookups)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS item_master (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_name TEXT UNIQUE NOT NULL,
                category TEXT,
                avg_price REAL,
                total_sold REAL,
                months_with_data INTEGER,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Daily aggregated sales (for faster ML training)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS item_daily_sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL,
                item_name TEXT NOT NULL,
                total_sales REAL,
                avg_price REAL,
                stock_level REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, item_name)
            )
        ''')
        
        # Create indexes for faster queries
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_date ON inventory_sales(date)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_item ON inventory_sales(item_name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_category ON inventory_sales(category)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_daily_date ON item_daily_sales(date)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_daily_item ON item_daily_sales(item_name)')
        
        self.conn.commit()
        print("Database tables created")
    
    def insert_clean_data(self, df):
        """Insert cleaned data into database"""
        
        print(f"\nInserting {len(df):,} records into database...")
        
        # Rename columns to match database schema
        df_copy = df.copy()
        df_copy.columns = [col.lower() for col in df_copy.columns]
        
        # Map column names
        column_mapping = {
            's.no': 's_no',
            'gp_index_no': 'gp_index_no',
            'pluno': 'pluno',
            'item_name': 'item_name',
            'w_rate': 'w_rate',
            'r_rate': 'r_rate',
            'qty': 'qty',
            'refund_qty': 'refund_qty',
            'net_qty': 'net_qty',
            'r_amt': 'r_amt',
            'w_amt': 'w_amt',
            'profit': 'profit',
            'o_b': 'o_b',
            'closing_stock': 'closing_stock',
            'net_tax': 'net_tax',
            'year': 'year',
            'month': 'month',
            'category': 'category',
            'date': 'date'
        }
        
        # Select only columns that exist
        cols_to_insert = [col for col in column_mapping.values() if col in df_copy.columns]
        df_insert = df_copy[cols_to_insert]
        
        try:
            df_insert.to_sql(
                'inventory_sales',
                self.conn,
                if_exists='append',
                index=False,
                method='multi',
                chunksize=1000
            )
            self.conn.commit()
            print(f"Successfully inserted {len(df_insert):,} records")
            
        except sqlite3.IntegrityError as e:
            print(f"⚠ Some records already exist (skipped duplicates): {e}")
            self.conn.rollback()
        except Exception as e:
            print(f"✗ Error inserting data: {e}")
            self.conn.rollback()
    
    def update_item_master(self):
        """Update item master table with aggregated stats"""
        
        print("\nUpdating item master table...")
        
        cursor = self.conn.cursor()
        
        # Clear existing data
        cursor.execute('DELETE FROM item_master')
        
        # Insert aggregated data - group by item_name only (take first category)
        cursor.execute('''
            INSERT INTO item_master (item_name, category, avg_price, total_sold, months_with_data)
            SELECT
                item_name,
                MAX(category) as category,
                AVG(r_rate) as avg_price,
                SUM(net_qty) as total_sold,
                COUNT(DISTINCT strftime('%Y-%m', date)) as months_with_data
            FROM inventory_sales
            GROUP BY item_name
        ''')
        
        self.conn.commit()
        
        cursor.execute('SELECT COUNT(*) FROM item_master')
        count = cursor.fetchone()[0]
        print(f"Updated {count:,} items in master table")
    
    def update_daily_sales(self):
        """Create daily aggregated sales table"""
        
        print("\nAggregating daily sales...")
        
        cursor = self.conn.cursor()
        
        # Clear existing data
        cursor.execute('DELETE FROM item_daily_sales')
        
        # Insert aggregated daily data
        cursor.execute('''
            INSERT INTO item_daily_sales (date, item_name, total_sales, avg_price, stock_level)
            SELECT
                date,
                item_name,
                SUM(net_qty) as total_sales,
                AVG(r_rate) as avg_price,
                AVG(closing_stock) as stock_level
            FROM inventory_sales
            GROUP BY date, item_name
        ''')
        
        self.conn.commit()
        
        cursor.execute('SELECT COUNT(*) FROM item_daily_sales')
        count = cursor.fetchone()[0]
        print(f"Created {count:,} daily sales records")
    
    def get_training_data(self):
        """Get data for ML training"""
        
        query = '''
            SELECT
                date,
                item_name,
                w_rate,
                r_rate,
                net_qty,
                closing_stock,
                profit,
                category
            FROM inventory_sales
            ORDER BY date, item_name
        '''
        
        df = pd.read_sql_query(query, self.conn)
        print(f"Loaded {len(df):,} records for training")
        
        return df
    
    def get_item_history(self, item_name):
        """Get historical data for specific item"""
        
        query = '''
            SELECT
                date,
                net_qty as sales,
                closing_stock as stock,
                r_rate as price
            FROM inventory_sales
            WHERE item_name = ?
            ORDER BY date
        '''
        
        df = pd.read_sql_query(query, self.conn, params=(item_name,))
        return df
    
    def get_database_stats(self):
        """Get database statistics"""
        
        cursor = self.conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM inventory_sales')
        total_records = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(DISTINCT item_name) FROM inventory_sales')
        unique_items = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(DISTINCT date) FROM inventory_sales')
        unique_dates = cursor.fetchone()[0]
        
        cursor.execute('SELECT MIN(date), MAX(date) FROM inventory_sales')
        date_range = cursor.fetchone()
        
        cursor.execute('SELECT SUM(net_qty) FROM inventory_sales')
        total_units = cursor.fetchone()[0]
        
        return {
            'total_records': total_records,
            'unique_items': unique_items,
            'unique_dates': unique_dates,
            'date_range': date_range,
            'total_units_sold': total_units
        }

# Usage
if __name__ == "__main__":
    from inventory_model_secondary.src.data_cleaning_pipeline import DataCleaner
    
    # Step 1: Clean data
    print("Step 1: Cleaning raw data...")
    cleaner = DataCleaner()
    clean_df = cleaner.process_raw_data_folder("Raw_data_to_convert_format")
    
    if clean_df is not None:
        # Step 2: Store in database
        print("\nStep 2: Storing in database...")
        db = DatabaseManager()
        db.connect()
        db.create_tables()
        db.insert_clean_data(clean_df)
        db.update_item_master()
        db.update_daily_sales()
        
        # Step 3: Show statistics
        print("\nStep 3: Database statistics...")
        stats = db.get_database_stats()
        print(f"Total records: {stats['total_records']:,}")
        print(f"Unique items: {stats['unique_items']:,}")
        print(f"Unique dates: {stats['unique_dates']:,}")
        print(f"Date range: {stats['date_range'][0]} to {stats['date_range'][1]}")
        print(f"Total units sold: {stats['total_units_sold']:,.0f}")
        
        db.disconnect()
        print("\n✓ Data pipeline complete!")
