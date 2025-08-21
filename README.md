# CredTech Structured Data API

A comprehensive credit risk modeling system for Credit Default Swap (CDS) spread prediction, implementing academic methodologies for financial data analysis and machine learning.

## 🚀 Quick Start

### Prerequisites

- Python 3.13 (recommended)
- Docker and Docker Compose
- PostgreSQL (handled via Docker)

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/gaixen/CredTech.git credtech
cd credtech
```

2. **Create Python environment**:
```bash
conda create -n credtech python=3.13 -y
conda activate credtech
```

3. **Install dependencies**:
```bash
uv add -r requirements.txt
# or alternatively:
pip install -r requirements.txt
```

4. **Start PostgreSQL database**:
```bash
docker-compose up -d
```

5. **Configure API keys** - Create `.env` file in `data_ingestion/structured_data/`:
```bash
cd data_ingestion/structured_data
cp sample.env .env
# Edit .env with your API keys (see sample.env for reference)
```

### Running the Application

1. **Start the API server**:
```bash
cd data_ingestion/structured_data
python main.py
# or use the start script:
./start.sh
```

2. **Access the API**:
   - API Documentation: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

3. **Run data ingestion**:
```bash
# Fetch data for a specific company
python -c "from api import get_financial_data; data = get_financial_data('AAPL', start_date='2020-01-01')"
```

4. **Run feature engineering**:
```bash
cd ../../feature_engineering
python academic_features.py
```

5. **Train models**:
```bash
cd ../model_training
python cds_models.py
```

## 📊 Usage Examples

### Data Ingestion
```python
from data_ingestion.structured_data.api import get_financial_data

# Fetch comprehensive financial data
data = get_financial_data("AAPL", start_date="2020-01-01")
```

### Feature Engineering
```python
from feature_engineering.academic_features import AcademicFeatureEngineer

# Initialize feature engineer
engineer = AcademicFeatureEngineer(winsorize_level=0.01)

# Engineer features for CDS model
features_df, log_cds_target = engineer.prepare_model_features(raw_data)
```

### Model Training
```python
from model_training.cds_models import train_cds_prediction_model

# Train panel fixed effects model
model, results = train_cds_prediction_model(
    features_df,
    target_col='log_cds_spread',
    model_type='panel_fe'
)
```

## 📁 Project Structure

```
credtech/
├── data_ingestion/
│   ├── structured_data/        # Yahoo Finance, FRED, SEC data APIs
│   └── unstructured_data/      # News and text data processing
├── feature_engineering/        # Academic feature engineering
├── model_training/             # Panel regression and statistical models
├── NLP_pipeline/               # News sentiment analysis
├── frontend/                   # Web interface
├── research/                   # Academic research notebooks
├── docker-compose.yml          # Database setup
└── requirements.txt           # Project dependencies
```

## 🏗️ Architecture Overview

This project implements a comprehensive credit risk modeling system following academic methodologies from:

- **Das, S. R., Hanouna, P., & Sarin, A. (2009)** - "Accounting-based versus market-based cross-sectional models of CDS spreads"
- **Bharath, S. T., & Shumway, T. (2008)** - "Forecasting default with the Merton distance to default model"
- **Tsai, M. F., Wang, C. J., & Chien, Y. W. (2016)** - "News and CDS spreads prediction"

### 1. Data Ingestion (`data_ingestion/structured_data/`)

**Purpose**: Collect and process financial data from multiple sources

- **Yahoo Finance**: Stock prices, financial statements, market data
- **FRED**: Macroeconomic indicators, risk-free rates
- **SEC EDGAR**: Regulatory filings and fundamental data
- **PostgreSQL**: Data storage with comprehensive financial models

**Key Features**:
- Real-time API data collection
- Academic metric calculations (ROA, leverage, distance to default)
- Market-based risk metrics
- FastAPI endpoints for data access

### 2. Feature Engineering (`feature_engineering/`)

**Purpose**: Transform raw financial data into academic research-grade features

**Accounting Features**:
- Return on Assets (ROA): `net_income / total_assets`
- Revenue Growth: Period-to-period revenue change
- Leverage: `total_debt / total_assets`
- Retained Earnings Ratio: `retained_earnings / total_assets`

**Market Features**:
- Equity Return: Annualized 100-day returns
- Equity Volatility: Annualized 100-day volatility
- Naive Distance to Default: Bharath-Shumway methodology
- Market capitalization and trading metrics

**Transformations**:
- Rolling 4-quarter averages to reduce seasonality
- Winsorization at 1% level to handle outliers
- Logarithmic transformation of CDS spreads
- Interaction terms for enhanced predictive power

### 3. Model Training (`model_training/`)

**Purpose**: Implement academic statistical models for CDS prediction

**Panel Regression with Fixed Effects**:
```python
log(CDS_spread) = α + β₁×ROA + β₂×Leverage + β₃×Market_Volatility +
                  β₄×Distance_to_Default + ... + firm_effects + ε
```

**Model Types**:
- **Panel Fixed Effects**: Controls for unobserved firm heterogeneity
- **Pooled OLS**: Cross-sectional regression with robust standard errors
- **Fama-MacBeth**: Time-series of cross-sectional regressions

## 🔬 Academic Methodology

### Distance to Default Calculation

Following Bharath & Shumway (2008) naive DTD:

```python
# Naive volatility
naive_σv = (E/(E+F)) × σE + (F/(E+F)) × (0.05 + 0.25×σE)

# Distance to default
naive_DTD = [ln((E+F)/F) + r - 0.5×naive_σv²×T] / (naive_σv × √T)
```

Where:
- E = Market value of equity
- F = Face value of debt
- σE = Equity volatility
- r = Stock return
- T = Time horizon (1 year)

### Model Specification

Following Das et al. (2009) empirical model:

```
log(CDS_it) = α + β₁×ROA_it + β₂×Leverage_it + β₃×Revenue_Growth_it +
              β₄×Equity_Return_it + β₅×Equity_Volatility_it +
              β₆×Distance_to_Default_it + β₇×Rating_it + μᵢ + εᵢₜ
```

## 🎯 Key Features

### Academic Rigor
- **Literature-Based**: Follows established academic methodologies
- **Statistical Validation**: Comprehensive diagnostic testing
- **Robust Design**: Handles typical econometric issues

### Comprehensive Data Integration
- **Multi-Source**: Yahoo Finance, FRED, SEC data
- **Real-Time**: Live API data feeds
- **Historical**: Extensive time-series coverage

### Advanced Analytics
- **Panel Data Methods**: Controls for unobserved heterogeneity
- **Time-Series Validation**: Rolling window testing
- **Feature Engineering**: Academic-grade transformations

## 📈 Model Performance

Based on academic literature, expected performance metrics:

- **R-squared**: 15-25% (typical for CDS prediction models)
- **Significant Variables**: ROA, leverage, volatility, distance to default
- **Economic Significance**: 1% increase in ROA → ~10 bps decrease in CDS spread

## 🔍 Research Applications

This framework supports:

- **Credit Risk Assessment**: CDS spread prediction
- **Portfolio Management**: Credit exposure analysis
- **Academic Research**: Replication and extension of CDS literature
- **Risk Management**: Early warning systems for credit deterioration

## 📚 Academic References

1. Das, S. R., Hanouna, P., & Sarin, A. (2009). Accounting-based versus market-based cross-sectional models of CDS spreads. _Journal of Banking & Finance_, 33(4), 719-730.

2. Bharath, S. T., & Shumway, T. (2008). Forecasting default with the Merton distance to default model. _The Review of Financial Studies_, 21(3), 1339-1369.

3. Tsai, M. F., Wang, C. J., & Chien, Y. W. (2016). A study of news coverage and CDS spreads prediction using machine learning approach. _Expert Systems with Applications_, 55, 85-94.

## 📄 License

This project is licensed under the APACHE License - see the LICENSE file for details.

---

_This project implements academic research methodologies for educational and research purposes. Users should validate results independently before making financial decisions._
