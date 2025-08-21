# CredTech Structured Data API

A comprehensive FastAPI application for fetching, storing, and retrieving structured financial data for credit risk assessment.

## Overview

This API provides endpoints to:
- **Fetch** external financial data (Yahoo Finance, SEC EDGAR, FRED)
- **Store** data in PostgreSQL with enhanced academic metrics
- **Retrieve** stored data with risk scoring capabilities
- **Ingest** manual data entries

## Recent Fixes (August 2025)

### Issues Resolved:
1. **"roa is invalid keyword argument" Error**: Fixed by adding missing academic metrics fields (`roa`, `leverage_assets`, `retained_earnings_ratio`, `net_income_growth_normalized`) to the `CompanyFundamentals` model
2. **SEC Endpoint Errors**: Fixed slice indexing errors in SEC filing ingestion
3. **Code Duplication**: Cleaned up duplicated API endpoints and unreachable code
4. **Consistent Terminology**: Updated all endpoints to use "ticker" instead of mixed "symbol/ticker" terminology

### Key Improvements:
- Enhanced academic financial metrics calculation following Das et al. and Tsai et al. methodologies
- Better error handling with centralized database error management
- Improved API organization with clear tag categorization
- Fixed all import and dependency issues

## API Endpoints

### 🔄 Auto Fetch & Store
- `POST /ingest/credit_features/{ticker}` - Fetch Yahoo Finance data and store
- `POST /ingest/sec/{ticker}` - Fetch SEC filings and store  
- `POST /ingest/fred/{series_id}` - Fetch FRED economic data and store

### 👁️ Fetch Only (No Storage)
- `GET /credit_features/{ticker}` - Yahoo Finance data preview
- `GET /sec_filings/{ticker}` - SEC filings preview
- `GET /fred/{series_id}` - FRED data preview

### 📝 Manual Ingest
- `POST /company_fundamentals/` - Manual fundamentals entry
- `POST /manual/fundamentals` - Enhanced manual fundamentals
- `POST /manual/stock-prices` - Manual stock price entry
- `POST /manual/regulatory-filings` - Manual filing entry

### 📊 Data Retrieval
- `GET /risk_scores` - Latest risk scores for all tickers
- `GET /risk_scores/{ticker}` - Risk score for specific ticker
- `GET /company_fundamentals/` - List all fundamentals
- `GET /regulatory_filings/` - List all regulatory filings
- `GET /economic_indicators/` - List all economic indicators

### 🔧 System
- `GET /health` - API and database health check
- `GET /stats` - Database record counts
- `GET /db_creds` - Database configuration info

## Data Models

### CompanyFundamentals (Enhanced)
```python
{
    "id": "uuid",
    "company": "string",
    "symbol": "string",  # Stored as ticker symbol
    "fiscal_year": "integer",
    "fiscal_quarter": "string",
    "fundamentals": "json",  # Complete fundamentals data
    "source": "string",
    "ingested_at": "datetime",
    
    # Extracted fields for queries
    "total_revenue": "float",
    "net_income": "float", 
    "total_assets": "float",
    "total_debt": "float",
    "equity": "float",
    "free_cash_flow": "float",
    "current_ratio": "float",
    "leverage_ratio": "float",
    "risk_score": "float",
    
    # NEW: Academic metrics for CDS modeling
    "roa": "float",  # Return on Assets
    "leverage_assets": "float",  # Total debt / Total assets
    "retained_earnings_ratio": "float",
    "net_income_growth_normalized": "float"
}
```

### Academic Metrics

Following academic literature (Das et al., Tsai et al.), the API now calculates:

1. **ROA (Return on Assets)**: `(net_income / total_assets) * 100`
2. **Leverage**: `total_debt / total_assets`
3. **Retained Earnings Ratio**: `retained_earnings / total_assets`
4. **Net Income Growth Normalized**: `net_income_growth / total_assets`
5. **Current Ratio**: `current_assets / current_liabilities`
6. **Debt-to-Equity**: `total_debt / equity`

### Risk Scoring Algorithm

The risk score (0-100, higher = lower risk) considers:
- **ROA component**: Higher profitability increases score
- **Leverage component**: Lower debt-to-assets ratio increases score  
- **Liquidity component**: Higher current ratio increases score
- **Growth component**: Positive revenue growth increases score
- **Cash flow coverage**: Better free cash flow to debt ratio increases score

## Usage Examples

### Ingest Yahoo Finance Data
```bash
curl -X POST "http://localhost:8000/ingest/credit_features/AAPL" \
     -H "accept: application/json"
```

### Ingest SEC Filings (Fixed!)
```bash
curl -X POST "http://localhost:8000/ingest/sec/GOOGL?limit=10" \
     -H "accept: application/json" \
     -d ""
```

### Get Risk Score
```bash
curl -X GET "http://localhost:8000/risk_scores/AAPL" \
     -H "accept: application/json"
```

### Manual Data Entry
```bash
curl -X POST "http://localhost:8000/company_fundamentals/" \
     -H "Content-Type: application/json" \
     -d '{
       "company": "Apple Inc",
       "ticker": "AAPL",
       "fiscal_year": 2024,
       "fiscal_quarter": "Q4",
       "fundamentals": {
         "total_revenue": 394328000000,
         "net_income": 100913000000,
         "total_assets": 364000000000,
         "total_debt": 123000000000,
         "equity": 50672000000,
         "current_assets": 162000000000,
         "current_liabilities": 145000000000
       },
       "source": "manual"
     }'
```

## Installation & Setup

### Prerequisites
```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic python-socketio
```

### Environment Variables
```bash
export DB_URL="postgresql://user:pass@localhost/credtech"
export DB_TYPE="postgresql"
export FRED_API_KEY="your_fred_key"  # Optional for FRED data
```

### Running the API
```bash
# Development
python api.py

# Production
uvicorn api:app --host 0.0.0.0 --port 8000
```

### Database Setup
The API automatically initializes the database schema on startup with the enhanced model including the new academic metrics fields.

## Error Handling

The API now includes comprehensive error handling:

- **409 Conflict**: Data integrity violations (duplicate records)
- **500 Internal Server Error**: Database errors
- **404 Not Found**: Record not found
- **400 Bad Request**: Invalid request parameters

## Development Notes

### Recent Code Changes
1. **Fixed model schema**: Added missing academic metrics fields to prevent "invalid keyword argument" errors
2. **Improved SEC handling**: Fixed slice indexing issues that caused "slice(None, 10, None)" errors  
3. **Consistent naming**: All endpoints now use "ticker" parameter names
4. **Enhanced validation**: Better input validation and error responses
5. **Academic compliance**: Metrics calculation follows established academic methodologies

### Testing
```bash
# Test health endpoint
curl http://localhost:8000/health

# Test SEC endpoint (previously failing)
curl -X POST "http://localhost:8000/ingest/sec/GOOGL?limit=10" -H "accept: application/json" -d ""

# Test risk scoring
curl http://localhost:8000/risk_scores
```

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

The API documentation is organized by categories:
- 🔄 **Auto Fetch & Store**: Automated data ingestion
- 👁️ **Fetch Only**: Data preview without storage
- 📝 **Manual Ingest**: Manual data entry
- 📊 **Data Retrieval**: Query stored data
- 🔧 **System**: Health and configuration

## Credit Risk Assessment

The API supports academic research in credit risk modeling by providing:

1. **Standardized financial metrics** following academic literature
2. **Automated risk scoring** based on fundamental analysis
3. **Time-series data** for longitudinal studies
4. **Multiple data sources** for robust analysis
5. **Academic metric calculations** ready for CDS prediction models

Perfect for implementing models described in academic papers on credit default swap prediction and corporate credit risk assessment.
