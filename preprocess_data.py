import pandas as pd

# Read the CSV file
df = pd.read_csv('IntakebyInstitutions.csv')

# Get all unique years
years = df['year'].unique()

# List to store new male rows
male_rows = []

# For each year, calculate M values
for year in years:
    # Get F and MF rows for this year
    f_row = df[(df['year'] == year) & (df['sex'] == 'F')]
    mf_row = df[(df['year'] == year) & (df['sex'] == 'MF')]
    
    if not f_row.empty and not mf_row.empty:
        # Create M row by subtracting F from MF
        m_row = mf_row.copy()
        m_row['sex'] = 'M'
        
        # Calculate M values for all institution columns (skip 'year' and 'sex')
        for col in df.columns:
            if col not in ['year', 'sex']:
                mf_val = mf_row[col].values[0]
                f_val = f_row[col].values[0]
                
                # Handle NaN values
                if pd.isna(mf_val) or pd.isna(f_val):
                    m_row[col] = None
                else:
                    m_row[col] = mf_val - f_val
        
        male_rows.append(m_row)

# Concatenate original dataframe with new male rows
male_df = pd.concat(male_rows, ignore_index=True)
df_updated = pd.concat([df, male_df], ignore_index=True)

# Sort by year and sex for better organization
df_updated = df_updated.sort_values(by=['year', 'sex']).reset_index(drop=True)

# Save to new CSV file
df_updated.to_csv('IntakebyInstitutions_processed.csv', index=False)

print(f"Processing complete!")
print(f"Original rows: {len(df)}")
print(f"New rows added: {len(male_df)}")
print(f"Total rows: {len(df_updated)}")
print(f"\nSample data for year 1982:")
print(df_updated[df_updated['year'] == 1982][['year', 'sex', 'nus', 'ntu', 'smu']])
