"""
Data Cleaning Pipeline
Converts messy Excel files to standardized clean format
"""

import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

class DataCleaner:
    """Clean and standardize retail inventory data"""
    
    REQUIRED_COLUMNS = [
        "S.No", "GP_Index_No", "pluno", "Item_Name", "W_Rate", "R_Rate",
        "Qty", "Refund_Qty", "Net_Qty", "R_Amt", "W_Amt", "Profit",
        "O_B", "Closing_Stock", "Net_Tax"
    ]
    
    NUMERIC_COLUMNS = [
        "W_Rate", "R_Rate", "Qty", "Refund_Qty", "Net_Qty",
        "R_Amt", "W_Amt", "Profit", "O_B", "Closing_Stock", "Net_Tax"
    ]
    
    def __init__(self):
        self.stats = {
            'rows_before': 0,
            'rows_after': 0,
            'rows_removed': 0,
            'invalid_numeric': 0,
            'null_items': 0
        }
    
    def clean_number(self, x):
        """Convert messy number to float"""
        if pd.isna(x):
            return 0.0
        
        x = str(x).strip()
        
        # Remove commas, quotes, hash symbols
        x = x.replace(",", "")
        x = x.replace("'", "")
        x = x.replace("#", "")
        x = x.strip()
        
        try:
            return float(x) if x else 0.0
        except:
            return 0.0
    
    def is_invalid_row(self, row):
        """Check if row is invalid (total, summary, etc.)"""
        item_name = str(row.get('Item_Name', '')).upper()
        
        invalid_keywords = [
            'TOTAL', 'GROUP TOTAL', 'REPORT TOTAL', 'SUMMARY',
            'BILL', 'REFUND', 'GRAND TOTAL', 'SUB TOTAL',
            'CLOSING', 'OPENING', 'BALANCE'
        ]
        
        for keyword in invalid_keywords:
            if keyword in item_name:
                return True
        
        return False
    
    def clean_dataframe(self, df, year, month, category):
        """Clean a single dataframe"""
        
        self.stats['rows_before'] += len(df)
        
        # Step 1: Remove rows with null Item_Name
        df = df.dropna(subset=['Item_Name'])
        df = df[df['Item_Name'].astype(str).str.strip() != '']
        self.stats['null_items'] += self.stats['rows_before'] - len(df)
        
        # Step 2: Remove invalid rows (totals, summaries)
        df = df[~df.apply(self.is_invalid_row, axis=1)]
        self.stats['rows_removed'] += self.stats['rows_before'] - len(df)
        
        # Step 3: Clean numeric columns
        for col in self.NUMERIC_COLUMNS:
            if col in df.columns:
                df[col] = df[col].apply(self.clean_number)
        
        # Step 4: Clean text columns
        df['Item_Name'] = df['Item_Name'].astype(str).str.strip().str.upper()
        df['GP_Index_No'] = df['GP_Index_No'].astype(str).str.strip()
        df['pluno'] = df['pluno'].astype(str).str.strip()
        
        # Step 5: Fill missing values
        for col in self.NUMERIC_COLUMNS:
            if col in df.columns:
                df[col] = df[col].fillna(0)
        
        # Step 6: Add metadata
        df['Year'] = year
        df['Month'] = month
        df['Category'] = category
        df['Date'] = pd.to_datetime(f"{year}-{month:02d}-01")
        
        # Step 7: Enforce column order
        cols_to_keep = self.REQUIRED_COLUMNS + ['Year', 'Month', 'Category', 'Date']
        df = df[[col for col in cols_to_keep if col in df.columns]]
        
        # Step 8: Remove duplicates (same date, item, pluno)
        df = df.drop_duplicates(subset=['Date', 'Item_Name', 'pluno'], keep='first')
        
        self.stats['rows_after'] += len(df)
        
        return df
    
    def clean_excel_file(self, file_path, year, month, category):
        """Clean a single Excel file"""
        
        try:
            df = None
            
            # Try to read as Excel first
            try:
                if str(file_path).endswith('.xls'):
                    df = pd.read_excel(file_path, sheet_name=0, engine='xlrd')
                else:
                    df = pd.read_excel(file_path, sheet_name=0)
            except:
                # If Excel fails, try as tab-separated text
                try:
                    df = pd.read_csv(file_path, sep='\t')
                except:
                    # Try comma-separated
                    df = pd.read_csv(file_path, sep=',')
            
            if df is None:
                return None
            
            # Find header row if it's not the first row
            if 'Item_Name' not in df.columns:
                # Search for row containing Item_Name
                for idx, row in df.iterrows():
                    if any('Item_Name' in str(val).upper() for val in row):
                        try:
                            if str(file_path).endswith('.xls'):
                                df = pd.read_excel(file_path, sheet_name=0, header=idx, engine='xlrd')
                            else:
                                df = pd.read_excel(file_path, sheet_name=0, header=idx)
                        except:
                            try:
                                df = pd.read_csv(file_path, sep='\t', header=idx)
                            except:
                                df = pd.read_csv(file_path, sep=',', header=idx)
                        break
            
            # Clean the dataframe
            df = self.clean_dataframe(df, year, month, category)
            
            return df
            
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return None
    
    def process_raw_data_folder(self, raw_data_path):
        """Process entire Raw_data_to_convert_format folder"""
        
        raw_path = Path(raw_data_path)
        all_data = []
        
        print("\n" + "="*80)
        print("DATA CLEANING PIPELINE - PROCESSING RAW DATA")
        print("="*80)
        
        # Iterate through years
        for year_folder in sorted(raw_path.iterdir()):
            if not year_folder.is_dir():
                continue
            
            year = int(year_folder.name)
            print(f"\nProcessing {year}...")
            
            # Iterate through categories
            for category_folder in sorted(year_folder.iterdir()):
                if not category_folder.is_dir():
                    continue
                
                category = category_folder.name.split()[0]  # "Grocery 2024" -> "Grocery"
                print(f"  {category}:")
                
                # Process Excel files
                excel_files = list(category_folder.glob("*.xls")) + list(category_folder.glob("*.xlsx"))
                
                if not excel_files:
                    print(f"    No Excel files found")
                    continue
                
                for excel_file in sorted(excel_files):
                    # Extract month from filename
                    month = self._extract_month(excel_file.stem)
                    
                    if month is None:
                        print(f"    ⚠ Skipping {excel_file.name} (cannot determine month)")
                        continue
                    
                    print(f"    Processing {excel_file.name}...", end=" ", flush=True)
                    
                    df = self.clean_excel_file(excel_file, year, month, category)
                    
                    if df is not None and len(df) > 0:
                        all_data.append(df)
                        print(f"OK {len(df)} rows")
                    else:
                        print("FAILED")
        
        # Combine all data
        if all_data:
            combined_df = pd.concat(all_data, ignore_index=True)
            print(f"\n" + "="*80)
            print(f"CLEANING COMPLETE")
            print(f"="*80)
            print(f"Total rows processed: {self.stats['rows_before']:,}")
            print(f"Rows removed (invalid): {self.stats['rows_removed']:,}")
            print(f"Rows removed (null items): {self.stats['null_items']:,}")
            print(f"Final clean rows: {len(combined_df):,}")
            print(f"Unique items: {combined_df['Item_Name'].nunique():,}")
            print(f"Date range: {combined_df['Date'].min().date()} to {combined_df['Date'].max().date()}")
            
            return combined_df
        else:
            print("No data processed!")
            return None
    
    def _extract_month(self, filename):
        """Extract month from filename"""
        
        month_map = {
            'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
            'JUL': 7, 'JULY': 7, 'AUG': 8, 'SEP': 9, 'SEPT': 9, 'OCT': 10,
            'NOV': 11, 'DEC': 12
        }
        
        filename_upper = filename.upper()
        
        # Try numeric month first (01, 02, etc.)
        parts = filename_upper.split()
        if parts and parts[0].isdigit():
            month = int(parts[0])
            if 1 <= month <= 12:
                return month
        
        # Try month name
        for month_name, month_num in month_map.items():
            if month_name in filename_upper:
                return month_num
        
        return None

# Usage
if __name__ == "__main__":
    cleaner = DataCleaner()
    clean_df = cleaner.process_raw_data_folder("Raw_data_to_convert_format")
    
    if clean_df is not None:
        # Save to CSV for verification
        clean_df.to_csv("converted_dataset/cleaned_data.csv", index=False)
        print(f"\n✓ Cleaned data saved to converted_dataset/cleaned_data.csv")
