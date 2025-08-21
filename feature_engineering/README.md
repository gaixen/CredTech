# Feature Engineering Module

This module implements academic-grade feature engineering for credit risk modeling, following established methodologies from financial literature.

## Overview

The feature engineering pipeline transforms raw financial data into research-grade variables suitable for CDS spread prediction models, implementing the methodologies from:

- **Das, S. R., Hanouna, P., & Sarin, A. (2009)** - Accounting vs market-based CDS models
- **Bharath, S. T., & Shumway, T. (2008)** - Distance to default calculations
- **Tsai, M. F., Wang, C. J., & Chien, Y. W. (2016)** - News and CDS prediction

## Key Components

### `academic_features.py`

Core feature engineering class that implements the complete pipeline:

#### Main Class: `AcademicFeatureEngineer`

```python
from feature_engineering.academic_features import AcademicFeatureEngineer

# Initialize with winsorization level
engineer = AcademicFeatureEngineer(winsorize_level=0.01)

# Complete feature engineering pipeline
features_df, log_cds_target = engineer.prepare_model_features(raw_data)
```

## Feature Categories

### 1. Accounting Features

Following Das et al. (2009) specification:

- **Return on Assets (ROA)**: `net_income / total_assets * 100`
- **Revenue Growth**: Period-to-period revenue change percentage
- **Leverage Ratio**: `total_debt / total_assets`
- **Retained Earnings Ratio**: `retained_earnings / total_assets`
- **Net Income Growth**: Growth normalized by total assets

### 2. Market Features

Market-based variables for credit risk assessment:

- **Equity Return**: Annualized 100-day stock returns
- **Equity Volatility**: Annualized 100-day return volatility
- **Index Return**: S&P 500 benchmark returns
- **Distance to Default**: Naive DTD following Bharath-Shumway methodology

### 3. Macroeconomic Features

Control variables for economic environment:

- **Risk-Free Rate**: 3-month Treasury bill rate
- **Credit Rating**: S&P rating on 0-1 scale (AAA=0, D=1)

### 4. Interaction Features

Enhanced predictive variables:

- **ROA × Leverage**: Profitability-risk interaction
- **Growth × Volatility**: Growth uncertainty measure
- **Log Market Cap**: Size effect control

## Distance to Default Implementation

### Naive DTD Calculation

Following Bharath & Shumway (2008) methodology:

```python
# Step 1: Calculate naive asset volatility
E = equity_value
F = debt_value
σE = equity_volatility

naive_σv = (E/(E+F)) * σE + (F/(E+F)) * (0.05 + 0.25*σE)

# Step 2: Calculate distance to default
T = 1.0  # One year horizon
r = stock_return

naive_DTD = [ln((E+F)/F) + r - 0.5*naive_σv²*T] / (naive_σv * √T)
```

**Economic Interpretation**:

- Higher DTD → Lower default probability → Lower CDS spreads
- DTD measures how many standard deviations the firm is from default
- Incorporates both market values and volatility

## Data Transformations

### 1. Rolling Averages

Reduce seasonal effects using 4-quarter rolling windows:

```python
# Rolling ROA reduces quarterly noise
roa_rolling_4q = df.groupby('symbol')['roa'].rolling(window=4).mean()
```

### 2. Winsorization

Control for outliers at 1% level (academic standard):

```python
# Winsorize at 1% and 99% percentiles
for variable in numeric_variables:
    lower = variable.quantile(0.01)
    upper = variable.quantile(0.99)
    variable_winsorized = variable.clip(lower=lower, upper=upper)
```

### 3. Log Transformation

Transform CDS spreads for theoretical consistency:

```python
# Natural log transformation
log_cds_spread = np.log(cds_spread)
```

**Rationale**: Log transformation ensures:

- Theoretical consistency with Merton model
- Normal distribution assumption
- Interpretable coefficients (elasticities)

## Feature Engineering Pipeline

### Complete Pipeline Function

```python
def prepare_model_features(df, target_col='cds_spread'):
    """
    Complete feature engineering pipeline

    Returns:
        features_df: Engineered features
        log_target: Log-transformed target variable
    """
    # 1. Create base features
    df = create_accounting_features(df)
    df = create_market_features(df)
    df = create_macroeconomic_features(df)

    # 2. Calculate rolling averages
    df = calculate_rolling_averages(df, window=4)

    # 3. Create interaction terms
    df = create_interaction_features(df)

    # 4. Winsorize variables
    df = winsorize_variables(df, level=0.01)

    # 5. Transform target
    log_target = transform_target_variable(df[target_col])

    return df, log_target
```

## Feature Categories Dictionary

The module provides categorized feature lists for model specification:

```python
feature_categories = engineer.get_feature_categories()

# Returns:
{
    'accounting': ['roa', 'leverage', 'revenue_growth', ...],
    'market': ['equity_return_100d', 'equity_volatility_100d', ...],
    'macroeconomic': ['risk_free_rate', 'credit_rating_numeric'],
    'interactions': ['roa_leverage_interaction', ...]
}
```

## Usage Examples

### Basic Feature Engineering

```python
from feature_engineering.academic_features import AcademicFeatureEngineer

# Load raw financial data
df = pd.read_csv('financial_data.csv')

# Initialize engineer
engineer = AcademicFeatureEngineer(winsorize_level=0.01)

# Engineer features
features_df, log_cds = engineer.prepare_model_features(df)

# Export feature summary
summary = engineer.export_features_summary(features_df)
print(f"Created {len(summary)} features")
```

### Step-by-Step Processing

```python
# Individual feature creation steps
df_accounting = engineer.create_accounting_features(raw_data)
df_market = engineer.create_market_features(df_accounting)
df_macro = engineer.create_macroeconomic_features(df_market)

# Advanced transformations
df_rolling = engineer.calculate_rolling_averages(df_macro, window=4)
df_interactions = engineer.create_interaction_features(df_rolling)
df_final = engineer.winsorize_variables(df_interactions)
```

### Custom Feature Engineering

```python
# Custom winsorization level
engineer_robust = AcademicFeatureEngineer(winsorize_level=0.005)

# Distance to default calculation
df_with_dtd = engineer.calculate_naive_distance_to_default(market_data)

# Export for model training
features_df.to_csv('engineered_features.csv', index=False)
```

## Quality Assurance

### Feature Validation

The module includes comprehensive validation:

- **Missing Value Analysis**: Reports missing percentages
- **Distribution Checks**: Identifies extreme outliers
- **Correlation Analysis**: Detects multicollinearity issues
- **Academic Compliance**: Ensures methodology alignment

### Feature Summary Export

```python
# Comprehensive feature summary
summary_df = engineer.export_features_summary(features_df)

# Includes:
# - Feature name and category
# - Count of non-missing observations
# - Missing percentage
# - Descriptive statistics (mean, std, min, max)
```

## Integration with Model Training

Features are designed for seamless integration with the model training module:

```python
from model_training.cds_models import train_cds_prediction_model

# Direct integration
model, results = train_cds_prediction_model(
    features_df=engineered_features,
    target_col='log_cds_spread',
    model_type='panel_fe'
)
```

## Academic Standards

### Literature Compliance

All features follow established academic methodologies:

- **Variable Definitions**: Match literature specifications exactly
- **Transformation Methods**: Use standard academic practices
- **Statistical Properties**: Ensure proper distributions for modeling

### Reproducibility

- **Deterministic Processing**: Same inputs → same outputs
- **Version Control**: Track feature engineering changes
- **Documentation**: Complete academic citations and methodology

## Performance Considerations

### Computational Efficiency

- **Vectorized Operations**: Uses pandas/numpy optimizations
- **Memory Management**: Efficient data type usage
- **Parallel Processing**: Group operations optimized

### Scalability

- **Large Datasets**: Handles multi-year, multi-company panels
- **Memory Footprint**: Optimized for large financial datasets
- **Processing Time**: Efficient rolling calculations and transformations

---

This feature engineering module provides the foundation for academic-quality credit risk modeling, ensuring compliance with established financial literature while maintaining computational efficiency and scalability.
