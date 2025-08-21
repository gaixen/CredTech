# Model Training Module

This module implements academic-grade statistical models for Credit Default Swap (CDS) spread prediction, following established econometric methodologies from financial literature.

## Overview

The model training module provides comprehensive statistical modeling capabilities for credit risk assessment, implementing methodologies from:

- **Das, S. R., Hanouna, P., & Sarin, A. (2009)** - Panel regression with fixed effects
- **Bharath, S. T., & Shumway, T. (2008)** - Market-based credit risk models
- **Fama, E. F., & MacBeth, J. D. (1973)** - Time-series of cross-sectional regressions

## Key Components

### `cds_models.py`

Core modeling framework implementing multiple econometric approaches:

#### Main Class: `CDSPredictionModel`

```python
from model_training.cds_models import CDSPredictionModel

# Initialize model
model = CDSPredictionModel(model_type='panel_fe')

# Fit to data
results = model.fit_panel_fixed_effects(data, target_col, feature_cols)
```

## Model Specifications

### 1. Panel Fixed Effects Regression

Primary model following Das et al. (2009):

```
log(CDS_it) = α + β₁×ROA_it + β₂×Leverage_it + β₃×Revenue_Growth_it +
              β₄×Equity_Return_it + β₅×Equity_Volatility_it +
              β₆×Distance_to_Default_it + β₇×Rating_it + μᵢ + εᵢₜ
```

**Where**:

- `log(CDS_it)`: Natural log of CDS spread for firm i at time t
- `μᵢ`: Firm fixed effects (unobserved heterogeneity)
- `εᵢₜ`: Error term with clustered standard errors

**Implementation**:

```python
# Panel fixed effects with entity clustering
model = CDSPredictionModel('panel_fe')
results = model.fit_panel_fixed_effects(
    df=panel_data,
    target_col='log_cds_spread',
    feature_cols=accounting_features + market_features,
    entity_col='symbol'
)
```

### 2. Pooled OLS with Robust Standard Errors

Alternative specification for robustness testing:

```python
# Pooled regression with HC3 robust standard errors
model = CDSPredictionModel('pooled_ols')
results = model.fit_pooled_ols(data, target_col, feature_cols)
```

**Features**:

- Heteroscedasticity-consistent standard errors (HC3)
- White's robust covariance matrix
- Suitable for cross-sectional analysis

### 3. Fama-MacBeth Regression

Time-series of cross-sectional regressions:

```python
# Fama-MacBeth procedure
model = CDSPredictionModel('fama_macbeth')
results = model.fit_fama_macbeth(data, target_col, feature_cols, time_col='date')
```

**Methodology**:

1. Run cross-sectional regression for each time period
2. Calculate time-series average of coefficients
3. Compute Newey-West adjusted standard errors

## Statistical Validation

### Diagnostic Testing Framework

Comprehensive regression diagnostics following econometric best practices:

#### 1. Autocorrelation Testing

```python
# Durbin-Watson test
diagnostics = model.conduct_diagnostic_tests(data, features)
dw_stat = diagnostics['durbin_watson']

# Interpretation:
# DW ≈ 2: No autocorrelation
# DW < 1.5: Positive autocorrelation
# DW > 2.5: Negative autocorrelation
```

#### 2. Heteroscedasticity Testing

```python
# Breusch-Pagan test
bp_stat = diagnostics['breusch_pagan_stat']
bp_p_value = diagnostics['breusch_pagan_p_value']

# H0: Homoscedasticity (constant variance)
# H1: Heteroscedasticity (non-constant variance)
```

#### 3. Normality Testing

```python
# Jarque-Bera test on residuals
jb_stat = diagnostics['jarque_bera_stat']
jb_p_value = diagnostics['jarque_bera_p_value']

# H0: Residuals are normally distributed
# H1: Residuals are not normally distributed
```

## Performance Metrics

### Model Evaluation Framework

```python
# Comprehensive performance assessment
performance = model.calculate_performance_metrics(y_true, y_pred)

metrics = {
    'r_squared': 0.23,           # Typical for CDS models: 15-25%
    'adjusted_r_squared': 0.21,  # Adjusted for number of parameters
    'rmse': 0.45,               # Root mean squared error
    'mae': 0.33,                # Mean absolute error
    'aic': 1250.4,              # Akaike Information Criterion
    'bic': 1285.2               # Bayesian Information Criterion
}
```

### Feature Importance Analysis

```python
# Extract significant predictors
importance_df = model.extract_feature_importance()

# Results format:
#   feature              coefficient  std_error  t_statistic  p_value  significance
#   roa                     -0.045      0.012       -3.75     0.001        ***
#   leverage                 0.234      0.056        4.18     0.000        ***
#   equity_volatility_100d   0.189      0.034        5.56     0.000        ***
```

**Significance Levels**:

- `***`: p < 0.01 (1% level)
- `**`: p < 0.05 (5% level)
- `*`: p < 0.10 (10% level)

## Model Validation

### Time-Series Cross-Validation

Implements rolling window validation for temporal data:

```python
from model_training.cds_models import ModelValidation

# Time-series split validation
validation_results = ModelValidation.time_series_split_validation(
    df=panel_data,
    target_col='log_cds_spread',
    feature_cols=all_features,
    train_years=3,
    test_years=1
)

# Results:
{
    'average_r2': 0.22,
    'average_rmse': 0.41,
    'stability': 0.03,  # Low = stable performance
    'individual_results': [...]  # Period-by-period results
}
```

### Robustness Testing

Multiple specification tests for model robustness:

```python
# Robustness across different specifications
robustness_results = ModelValidation.robustness_tests(
    df=data,
    target_col='log_cds_spread',
    feature_cols=features
)

# Tests include:
# 1. Different winsorization levels (0.5%, 1%, 2.5%)
# 2. Feature subset analysis (accounting vs market features)
# 3. Alternative model specifications
```

## Economic Interpretation

### Coefficient Interpretation

For log-linear models, coefficients represent elasticities:

```python
# ROA coefficient: -0.045
# Interpretation: 1% increase in ROA → 4.5% decrease in CDS spread
# Economic significance: 100 bps improvement in ROA → ~45 bps CDS reduction

# Leverage coefficient: 0.234
# Interpretation: 1% increase in leverage → 23.4% increase in CDS spread
# Economic significance: 10% increase in leverage → ~234 bps CDS increase
```

### Risk Factor Attribution

```python
# Calculate risk factor contributions
feature_contributions = model.calculate_factor_attribution(data)

# Example output:
{
    'accounting_factors': 0.12,     # 12% of spread variation
    'market_factors': 0.08,         # 8% of spread variation
    'macroeconomic_factors': 0.03,  # 3% of spread variation
    'firm_effects': 0.45,           # 45% from unobserved heterogeneity
    'residual': 0.32               # 32% unexplained variation
}
```

## Usage Examples

### Complete Model Training Pipeline

```python
from model_training.cds_models import train_cds_prediction_model

# Train complete model with feature engineering integration
model, results = train_cds_prediction_model(
    features_df=engineered_features,
    target_col='log_cds_spread',
    model_type='panel_fe'
)

# Access results
print(results['model_summary'])
print(results['feature_importance'])
print(results['performance_metrics'])
```

### Custom Model Specification

```python
# Custom feature selection
accounting_features = ['roa', 'leverage', 'revenue_growth']
market_features = ['equity_volatility_100d', 'naive_dtd']
all_features = accounting_features + market_features

# Fit model with selected features
model = CDSPredictionModel('panel_fe')
results = model.fit_panel_fixed_effects(
    df=panel_data,
    target_col='log_cds_spread',
    feature_cols=all_features,
    entity_col='symbol'
)

# Generate comprehensive summary
summary = model.generate_model_summary()
```

### Model Comparison

```python
# Compare different model specifications
models = {}

# Panel fixed effects
models['panel_fe'] = CDSPredictionModel('panel_fe')
models['panel_fe'].fit_panel_fixed_effects(data, target, features)

# Pooled OLS
models['pooled_ols'] = CDSPredictionModel('pooled_ols')
models['pooled_ols'].fit_pooled_ols(data, target, features)

# Fama-MacBeth
models['fama_macbeth'] = CDSPredictionModel('fama_macbeth')
models['fama_macbeth'].fit_fama_macbeth(data, target, features)

# Compare performance
for name, model in models.items():
    print(f"{name}: R² = {model.results.rsquared:.3f}")
```

## Advanced Features

### Panel Data Preparation

```python
# Automatic panel data formatting
panel_data = model.prepare_panel_data(
    df=raw_data,
    entity_col='symbol',
    time_col='date'
)

# Creates proper multi-index for panel regression
# Handles missing data and ensures balanced panels
```

### Prediction and Forecasting

```python
# Make predictions on new data
predictions = model.predict(X_new)

# Calculate prediction intervals
prediction_intervals = model.predict_intervals(X_new, alpha=0.05)
```

## Academic Standards

### Literature Compliance

- **Model Specifications**: Match published academic papers exactly
- **Standard Errors**: Use appropriate clustering and robustness corrections
- **Diagnostic Tests**: Follow econometric best practices

### Reproducibility

- **Random Seeds**: Set for reproducible results
- **Version Control**: Track model specifications and parameters
- **Documentation**: Complete methodology citations

### Statistical Rigor

- **Significance Testing**: Multiple testing corrections when appropriate
- **Model Selection**: Information criteria and cross-validation
- **Assumption Testing**: Comprehensive diagnostic framework

---

This model training module provides the statistical rigor required for academic-quality credit risk research while maintaining practical applicability for real-world credit risk assessment.
