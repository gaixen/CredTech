# CredTech Structured Data API

A comprehensive FastAPI-based financial data ingestion and retrieval system for credit risk assessment. This API provides seamless integration with multiple financial data sources including Yahoo Finance, SEC Edgar, and FRED economic data.

## 🚀 Features

- **Multi-Source Data Integration**: Yahoo Finance, SEC Edgar, FRED economic data
- **Dual Operation Modes**: Fetch-only (no storage) and fetch-and-store operations
- **Advanced Risk Scoring**: Automated financial risk assessment with custom algorithms
- **Real-time Data Processing**: WebSocket support for live data updates
- **Comprehensive CRUD Operations**: Full create, read, update, delete functionality
- **RESTful API Design**: Well-structured endpoints with proper HTTP methods
- **Database Agnostic**: Supports PostgreSQL, SQLite, and other SQL databases
- **Auto-Documentation**: Interactive Swagger UI and ReDoc documentation
- **Error Handling**: Robust error handling with detailed logging
- **Data Validation**: Pydantic models for request/response validation

## 📊 Data Sources

### Yahoo Finance
- Company fundamentals (revenue, assets, liabilities, etc.)
- Stock price data (OHLCV)
- Financial ratios and metrics
- Market data and trading volume

### SEC Edgar
- Regulatory filings (10-K, 10-Q, 8-K, etc.)
- Company disclosures
- Filing metadata and dates
- Document links and summaries

### FRED (Federal Reserve Economic Data)
- Economic indicators
- Interest rates
- GDP, inflation, unemployment data
- Macroeconomic time series

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   FastAPI App   │────│   Data Sources   │────│   Database      │
│                 │    │                  │    │                 │
│ • REST Endpoints│    │ • Yahoo Finance  │    │ • PostgreSQL    │
│ • WebSocket     │    │ • SEC Edgar      │    │ • SQLite        │
│ • Validation    │    │ • FRED API       │    │ • Tables        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd CredTech_structuredData/data_ingestion/structured_data

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp sample.env .env

# Edit .env with your configuration
nano .env
```

### 2. Configuration

Update `.env` file with your settings:

```env
# Database Configuration
DB_URL=postgresql://username:password@localhost:5432/database_name

# API Keys
FRED_API_KEY=your_fred_api_key_here
SEC_EDGAR_API_KEY=your_sec_api_key_here

# Server Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true
```

### 3. Start the API

```bash
# Option 1: Using the startup script
./start.sh

# Option 2: Using main.py
python main.py

# Option 3: Using uvicorn directly
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Access Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## 📋 API Endpoints

### Auto Fetch & Store
Fetch external data and store in database:

```bash
# Yahoo Finance data ingestion
POST /ingest/yahoo/{ticker}

# SEC Edgar filings ingestion
POST /ingest/sec/{ticker}?limit=10

# FRED economic series ingestion
POST /ingest/fred/{series_id}?limit=20&api_key=YOUR_KEY
```

### Fetch Only
Fetch external data without storing:

```bash
# Yahoo Finance data (no storage)
GET /fetch/yahoo/{ticker}

# SEC Edgar filings (no storage)
GET /fetch/sec/{ticker}?limit=10

# FRED series data (no storage)
GET /fetch/fred/{series_id}?limit=20
```

### Data Retrieval
Get stored data from database:

```bash
# Get company fundamentals
GET /fundamentals?ticker=AAPL&limit=100

# Get fundamentals for specific ticker
GET /fundamentals/{ticker}

# Get stock prices
GET /stock-prices?ticker=AAPL&limit=100

# Get regulatory filings
GET /regulatory-filings?ticker=AAPL&filing_type=10-K

# Get economic indicators
GET /economic-indicators?indicator_name=GDP&limit=100

# Get risk scores
GET /risk_scores
GET /risk_scores/{ticker}
```

### Manual Data Ingestion
Manually add data:

```bash
# Manual fundamentals ingestion
POST /manual/fundamentals

# Manual stock price ingestion
POST /manual/stock-prices

# Manual regulatory filing ingestion
POST /manual/regulatory-filings
```

### System Endpoints
System information and health:

```bash
# Health check
GET /health

# Database statistics
GET /stats

# API configuration
GET /config
```

## 📝 Usage Examples

### 1. Ingest Yahoo Finance Data

```bash
curl -X POST "http://localhost:8000/ingest/yahoo/AAPL" \
     -H "accept: application/json"
```

**Response:**
```json
{
  "status": "success",
  "message": "Ingested Yahoo Finance data for AAPL",
  "records_created": {
    "company_fundamentals": 1,
    "stock_prices": 5
  },
  "ingestion_timestamp": "2025-08-20T15:30:00Z",
  "source": "Yahoo Finance"
}
```

### 2. Fetch SEC Filings

```bash
curl -X GET "http://localhost:8000/fetch/sec/GOOGL?limit=5" \
     -H "accept: application/json"
```

**Response:**
```json
{
  "status": "success",
  "ticker": "GOOGL",
  "filings": [
    {
      "title": "Form 10-Q - Quarterly Report",
      "filing_type": "10-Q",
      "filing_date": "2025-08-15T00:00:00Z",
      "link": "https://www.sec.gov/..."
    }
  ],
  "total_available": 10,
  "returned": 5,
  "source": "SEC Edgar"
}
```

### 3. Get Risk Scores

```bash
curl -X GET "http://localhost:8000/risk_scores/TSLA" \
     -H "accept: application/json"
```

**Response:**
```json
{
  "ticker": "TSLA",
  "company": "Tesla Inc",
  "risk_score": 72.5,
  "ingested_at": "2025-08-20T15:30:00Z",
  "metrics": {
    "total_revenue": 96773000000,
    "net_income": 15000000000,
    "current_ratio": 1.8,
    "leverage_ratio": 0.4
  }
}
```

### 4. Manual Data Ingestion

```bash
curl -X POST "http://localhost:8000/manual/fundamentals" \
     -H "Content-Type: application/json" \
     -d '{
       "company": "Apple Inc",
       "ticker": "AAPL",
       "fiscal_year": 2025,
       "fiscal_quarter": "Q2",
       "fundamentals": {
         "total_revenue": 365817000000,
         "net_income": 94680000000,
         "total_assets": 352755000000
       },
       "source": "manual"
     }'
```

## 🎯 Risk Scoring Algorithm

The API includes an advanced risk scoring system that evaluates companies based on:

### Scoring Factors:
- **Liquidity (Current Ratio)**: Ability to meet short-term obligations
- **Leverage (Debt-to-Equity)**: Financial leverage and debt burden
- **Profitability (Net Margin)**: Operational efficiency and profitability
- **Growth (Revenue Growth)**: Business expansion and market performance
- **Cash Flow Coverage**: Ability to service debt with cash flow

### Risk Score Scale:
- **0-30**: High Risk
- **31-50**: Medium-High Risk
- **51-70**: Medium Risk
- **71-85**: Low-Medium Risk
- **86-100**: Low Risk

## 🗄️ Database Schema

### Core Tables:

#### company_fundamentals
```sql
- id (VARCHAR, PK)
- company (VARCHAR)
- symbol (VARCHAR)
- fiscal_year (INTEGER)
- fiscal_quarter (VARCHAR)
- fundamentals (JSON)
- source (VARCHAR)
- ingested_at (TIMESTAMP)
- total_revenue (FLOAT)
- net_income (FLOAT)
- [... other financial metrics]
- risk_score (FLOAT)
```

#### stock_prices
```sql
- id (VARCHAR, PK)
- symbol (VARCHAR)
- date (TIMESTAMP)
- open/close/high/low (FLOAT)
- volume (FLOAT)
- source (VARCHAR)
- ingested_at (TIMESTAMP)
```

#### regulatory_filings
```sql
- id (VARCHAR, PK)
- company (VARCHAR)
- symbol (VARCHAR)
- filing_type (VARCHAR)
- filing_date (TIMESTAMP)
- data (JSON)
- source (VARCHAR)
- ingested_at (TIMESTAMP)
```

#### economic_indicators
```sql
- id (VARCHAR, PK)
- indicator_name (VARCHAR)
- value (FLOAT)
- date (TIMESTAMP)
- country (VARCHAR)
- source (VARCHAR)
- ingested_at (TIMESTAMP)
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_URL` | Database connection URL | `postgresql://...` |
| `API_HOST` | API server host | `0.0.0.0` |
| `API_PORT` | API server port | `8000` |
| `API_RELOAD` | Enable auto-reload | `true` |
| `FRED_API_KEY` | FRED API key | Required for FRED data |
| `SEC_EDGAR_API_KEY` | SEC API key | Optional |
| `SOCKET_IO_PORT` | WebSocket port | `5001` |

### Database Configuration

**PostgreSQL (Recommended for Production):**
```env
DB_URL=postgresql://username:password@localhost:5432/credtech_db
```

**SQLite (Development):**
```env
DB_URL=sqlite:///./credtech.db
```

## 🔌 WebSocket Integration

Real-time data updates via WebSocket:

```javascript
// Connect to WebSocket
const socket = io('http://localhost:8000/socket.io');

// Listen for data updates
socket.on('data_update', (data) => {
    console.log('New data received:', data);
});
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8000/health
```

### Database Statistics
```bash
curl http://localhost:8000/stats
```

### API Configuration
```bash
curl http://localhost:8000/config
```

## 🚨 Error Handling

The API provides comprehensive error handling:

### HTTP Status Codes:
- **200**: Success
- **400**: Bad Request (invalid parameters)
- **404**: Not Found (ticker/data not found)
- **409**: Conflict (data already exists)
- **500**: Internal Server Error
- **503**: Service Unavailable (database connection issues)

### Error Response Format:
```json
{
  "error": "Detailed error message",
  "operation": "operation_that_failed",
  "timestamp": "2025-08-20T15:30:00Z"
}
```

## 📚 Development

### Project Structure
```
structured_data/
├── api.py              # Main FastAPI application
├── main.py             # Application entry point
├── config.py           # Configuration management
├── models.py           # Database models
├── storage.py          # Database operations
├── socket_server.py    # WebSocket server
├── requirements.txt    # Python dependencies
├── .env               # Environment configuration
├── sample.env         # Environment template
└── sources/           # Data source implementations
    ├── yahoo_finance_features.py
    ├── sec_edgar.py
    └── fred_series.py
```

### Adding New Data Sources

1. Create a new file in `sources/` directory
2. Implement fetch functions following the existing pattern
3. Add the new source to `api.py` endpoints
4. Update the configuration in `config.py`

### Custom Risk Scoring

Modify the `compute_risk_score()` function in `api.py` to implement custom risk assessment logic:

```python
def compute_risk_score(fundamentals_data: Dict[str, Any]) -> Optional[float]:
    # Your custom risk scoring logic here
    score = 50.0
    # ... scoring algorithm
    return max(0.0, min(100.0, round(score, 2)))
```

## 🔐 Security Considerations

- **API Keys**: Store sensitive API keys in environment variables
- **Database**: Use strong passwords and connection encryption
- **CORS**: Configure appropriate CORS settings for production
- **Rate Limiting**: Implement rate limiting for production deployments
- **Authentication**: Add authentication middleware for secured endpoints

## 📈 Performance Optimization

- **Database Indexing**: Create indexes on frequently queried columns
- **Connection Pooling**: Configure database connection pooling
- **Caching**: Implement Redis caching for frequently accessed data
- **Async Operations**: Use async operations for I/O bound tasks

## 🐛 Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Check database URL in `.env`
   - Verify database server is running
   - Check network connectivity

2. **API Key Errors**
   - Verify API keys in `.env` file
   - Check API key permissions and quotas
   - Ensure keys are properly formatted

3. **Import Errors**
   - Install all dependencies: `pip install -r requirements.txt`
   - Check Python path configuration
   - Verify module imports

4. **Port Already in Use**
   - Change API_PORT in `.env`
   - Kill existing processes: `pkill -f uvicorn`

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the API documentation at `/docs`
- Review logs for detailed error information

## 🔄 API Versioning

Current API version: **v1.0.0**

The API follows semantic versioning for backward compatibility.

---

**Built with ❤️ for financial data analysis and credit risk assessment**
