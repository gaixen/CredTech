from fastapi import FastAPI, Depends, HTTPException, status, Path
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from storage import SessionLocal, init_db
from models import FinancialStatement, StockPrice, CompanyFundamentals, EconomicIndicator, CreditRating, RegulatoryFiling
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, UTC, timezone
from contextlib import asynccontextmanager
from sources.yahoo_finance_features import fetch_credit_features
from sources.sec_edgar import fetch_sec_filings
from config import Config
import uuid
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# New tag metadata for reorganized Swagger UI
TAGS_METADATA = [
    {"name": "Auto Fetch & Store", "description": "Fetch external data (Yahoo, SEC) and store in DB."},
    {"name": "Fetch Only", "description": "Fetch external data without persisting (preview / on-demand)."},
    {"name": "Manual Ingest", "description": "POST raw data you already have; API validates & stores."},
    {"name": "Data Retrieval", "description": "GET stored records from the database."},
    {"name": "System", "description": "Health, statistics, configuration."},
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - initializes database on startup"""
    logger.info("API start")
    try:
        init_db()
        logger.info("DB ready")
    except Exception as e:
        logger.error(f"DB init fail: {e}")
        raise
    yield
    logger.info("API stop")

app = FastAPI(
    title="CredTech Structured Data API",
    description="Structured financial data ingestion & retrieval API (categorized).",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    openapi_tags=TAGS_METADATA
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    """Database dependency injection"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Enhanced Pydantic models with validation
class FinancialStatementIn(BaseModel):
    """Input model for Financial Statement data"""
    company: str = Field(..., min_length=1, max_length=255, description="Company name")
    symbol: str = Field(..., min_length=1, max_length=10, description="Stock symbol")
    fiscal_year: int = Field(..., ge=1900, le=2100, description="Fiscal year")
    fiscal_quarter: str = Field(..., pattern="^Q[1-4]$|^Annual$", description="Fiscal quarter (Q1-Q4 or Annual)")
    statement_type: str = Field(..., description="Type of financial statement")
    data: Dict[str, Any] = Field(..., description="Financial statement data")
    source: str = Field(..., min_length=1, description="Data source")

    @field_validator('data')
    def validate_data(cls, v):
        if not isinstance(v, dict) or not v:
            raise ValueError('Data must be a non-empty dictionary')
        return v

class StockPriceIn(BaseModel):
    """Input model for Stock Price data"""
    symbol: str = Field(..., min_length=1, max_length=10, description="Stock symbol")
    date: datetime = Field(..., description="Date of the stock price")
    open: float = Field(..., ge=0, description="Opening price")
    close: float = Field(..., ge=0, description="Closing price")
    high: float = Field(..., ge=0, description="Highest price")
    low: float = Field(..., ge=0, description="Lowest price")
    volume: float = Field(..., ge=0, description="Trading volume")
    source: str = Field(..., min_length=1, description="Data source")

    @field_validator('high')
    def high_non_negative(cls, v):
        if v < 0:
            raise ValueError('High price must be non-negative')
        return v

    @field_validator('low')
    def low_non_negative(cls, v):
        if v < 0:
            raise ValueError('Low price must be non-negative')
        return v

    # model-level validation for relation
    @classmethod
    def model_validate_high_low(cls, values: 'StockPriceIn'):
        if values.high < values.low:
            raise ValueError('High price must be greater than or equal to low price')
        return values

class CompanyFundamentalsIn(BaseModel):
    """Input model for Company Fundamentals data"""
    company: str = Field(..., min_length=1, max_length=255, description="Company name")
    symbol: str = Field(..., min_length=1, max_length=10, description="Stock symbol")
    fiscal_year: int = Field(..., ge=1900, le=2100, description="Fiscal year")
    fiscal_quarter: str = Field(..., description="Fiscal quarter")
    fundamentals: Dict[str, Any] = Field(..., description="Fundamental metrics")
    source: str = Field(..., min_length=1, description="Data source")

class EconomicIndicatorIn(BaseModel):
    """Input model for Economic Indicator data"""
    indicator_name: str = Field(..., min_length=1, max_length=255, description="Name of the economic indicator")
    value: float = Field(..., description="Indicator value")
    date: datetime = Field(..., description="Date of the indicator")
    country: str = Field(..., min_length=1, max_length=3, description="Country code (ISO)")
    source: str = Field(..., min_length=1, description="Data source")

class CreditRatingIn(BaseModel):
    """Input model for Credit Rating data"""
    entity: str = Field(..., min_length=1, max_length=255, description="Rated entity")
    symbol: str = Field(..., min_length=1, max_length=10, description="Stock symbol")
    rating: str = Field(..., min_length=1, max_length=10, description="Credit rating")
    agency: str = Field(..., min_length=1, max_length=50, description="Rating agency")
    rating_date: datetime = Field(..., description="Date of the rating")
    outlook: str = Field(..., description="Rating outlook")
    source: str = Field(..., min_length=1, description="Data source")

class RegulatoryFilingIn(BaseModel):
    """Input model for Regulatory Filing data"""
    company: str = Field(..., min_length=1, max_length=255, description="Company name")
    symbol: str = Field(..., min_length=1, max_length=10, description="Stock symbol")
    filing_type: str = Field(..., min_length=1, max_length=50, description="Type of filing")
    filing_date: datetime = Field(..., description="Date of filing")
    data: Dict[str, Any] = Field(..., description="Filing data")
    source: str = Field(..., min_length=1, description="Data source")

# Response models
class IngestionResponse(BaseModel):
    """Standard response model for data ingestion operations"""
    status: str = Field(..., description="Operation status")
    message: str = Field(..., description="Operation message")
    records_created: Dict[str, int] = Field(..., description="Count of records created by type")
    ingestion_timestamp: datetime = Field(..., description="When the ingestion occurred")
    source: str = Field(..., description="Data source")

class ErrorResponse(BaseModel):
    """Standard error response model"""
    error: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Type of error")
    timestamp: datetime = Field(..., description="When the error occurred")

def log_ingestion(operation: str, records_count: int, source: str, entity: str = None):
    logger.info(f"INGEST {operation} records={records_count} src={source} entity={entity}")

def handle_database_error(e: Exception, operation: str) -> JSONResponse:
    """Centralized database error handling"""
    if isinstance(e, IntegrityError):
        logger.error(f"Integrity error {operation}: {str(e)}")
        err = ErrorResponse(
                error="Data integrity violation - record may already exist",
                error_type="IntegrityError",
                timestamp=datetime.now(UTC)
            )
        return JSONResponse(status_code=status.HTTP_409_CONFLICT, content=jsonable_encoder(err))
    elif isinstance(e, SQLAlchemyError):
        logger.error(f"DB error {operation}: {str(e)}")
        err = ErrorResponse(
                error="Database operation failed",
                error_type="DatabaseError",
                timestamp=datetime.now(UTC)
            )
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=jsonable_encoder(err))
    else:
        logger.error(f"Unexpected {operation}: {str(e)}")
        err = ErrorResponse(
                error=str(e),
                error_type="UnexpectedError",
                timestamp=datetime.now(UTC)
            )
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=jsonable_encoder(err))

# FinancialStatement endpoints
@app.post(
    "/financial_statements/",
    response_model=Dict[str, Any],
    summary="Ingest financial statement",
    description="Store one financial statement record.",
    tags=["Manual Ingest"]
)
def create_financial_statement(fs: FinancialStatementIn, db: Session = Depends(get_db)):
    """📊 INGEST: Create and store a financial statement record in PostgreSQL"""
    try:
        statement = FinancialStatement(
            id=str(uuid.uuid4()),
            company=fs.company,
            symbol=fs.symbol,
            fiscal_year=fs.fiscal_year,
            fiscal_quarter=fs.fiscal_quarter,
            statement_type=fs.statement_type,
            data=fs.data,
            source=fs.source,
            ingested_at=datetime.now(UTC)
        )
        db.add(statement)
        db.commit()
        db.refresh(statement)

        # Log successful ingestion
        log_ingestion("CREATE_FINANCIAL_STATEMENT", 1, fs.source, f"{fs.company} ({fs.symbol})")

        return {
            "status": "success",
            "message": f"Financial statement ingested for {fs.company}",
            "record_id": statement.id,
            "ingestion_timestamp": statement.ingested_at,
            "source": fs.source
        }
    except Exception as e:
        db.rollback()
        return handle_database_error(e, "create_financial_statement")

@app.get("/financial_statements/", summary="List financial statements", tags=["Data Retrieval"])
def list_financial_statements(db: Session = Depends(get_db)):
    """Retrieve all financial statements from the database"""
    return db.query(FinancialStatement).all()

@app.get("/financial_statements/{statement_id}", summary="Get financial statement", tags=["Data Retrieval"])
def get_financial_statement(statement_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific financial statement by ID"""
    statement = db.query(FinancialStatement).filter(FinancialStatement.id == statement_id).first()
    if not statement:
        raise HTTPException(status_code=404, detail="Financial statement not found")
    return statement

# StockPrice endpoints
@app.post(
    "/stock_prices/",
    response_model=Dict[str, Any],
    summary="Ingest stock price",
    description="Store one OHLCV row.",
    tags=["Manual Ingest"]
)
def create_stock_price(sp: StockPriceIn, db: Session = Depends(get_db)):
    """📈 INGEST: Create and store a stock price record in PostgreSQL"""
    try:
        price = StockPrice(
            id=str(uuid.uuid4()),
            symbol=sp.symbol,
            date=sp.date,
            open=sp.open,
            close=sp.close,
            high=sp.high,
            low=sp.low,
            volume=sp.volume,
            source=sp.source,
            ingested_at=datetime.now(UTC)
        )
        db.add(price)
        db.commit()
        db.refresh(price)

        # Log successful ingestion
        log_ingestion("CREATE_STOCK_PRICE", 1, sp.source, sp.symbol)

        return {
            "status": "success",
            "message": f"Stock price ingested for {sp.symbol}",
            "record_id": price.id,
            "ingestion_timestamp": price.ingested_at,
            "source": sp.source
        }
    except Exception as e:
        db.rollback()
        return handle_database_error(e, "create_stock_price")

@app.get("/stock_prices/", summary="List stock prices", tags=["Data Retrieval"])
def list_stock_prices(db: Session = Depends(get_db)):
    """Retrieve all stock prices from the database"""
    return db.query(StockPrice).all()

@app.get("/stock_prices/{price_id}", summary="Get stock price", tags=["Data Retrieval"])
def get_stock_price(price_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific stock price by ID"""
    price = db.query(StockPrice).filter(StockPrice.id == price_id).first()
    if not price:
        raise HTTPException(status_code=404, detail="Stock price not found")
    return price

# CompanyFundamentals endpoints
@app.post(
    "/company_fundamentals/",
    response_model=Dict[str, Any],
    summary="Ingest fundamentals",
    description="Store company fundamentals JSON.",
    tags=["Manual Ingest"]
)
def create_company_fundamentals(cf: CompanyFundamentalsIn, db: Session = Depends(get_db)):
    """🏢 INGEST: Create and store company fundamentals record in PostgreSQL"""
    try:
        fundamentals = CompanyFundamentals(
            id=str(uuid.uuid4()),
            company=cf.company,
            symbol=cf.symbol,
            fiscal_year=cf.fiscal_year,
            fiscal_quarter=cf.fiscal_quarter,
            fundamentals=cf.fundamentals,
            source=cf.source,
            ingested_at=datetime.now(UTC)
        )
        db.add(fundamentals)
        db.commit()
        db.refresh(fundamentals)

        # Log successful ingestion
        log_ingestion("CREATE_COMPANY_FUNDAMENTALS", 1, cf.source, f"{cf.company} ({cf.symbol})")

        return {
            "status": "success",
            "message": f"Company fundamentals ingested for {cf.company}",
            "record_id": fundamentals.id,
            "ingestion_timestamp": fundamentals.ingested_at,
            "source": cf.source
        }
    except Exception as e:
        db.rollback()
        return handle_database_error(e, "create_company_fundamentals")

@app.get("/company_fundamentals/", summary="List fundamentals", tags=["Data Retrieval"])
def list_company_fundamentals(db: Session = Depends(get_db)):
    """Retrieve all company fundamentals from the database"""
    return db.query(CompanyFundamentals).all()

@app.get("/company_fundamentals/{fundamentals_id}", summary="Get fundamentals", tags=["Data Retrieval"])
def get_company_fundamentals(fundamentals_id: str, db: Session = Depends(get_db)):
    """Retrieve specific company fundamentals by ID"""
    fundamentals = db.query(CompanyFundamentals).filter(CompanyFundamentals.id == fundamentals_id).first()
    if not fundamentals:
        raise HTTPException(status_code=404, detail="Company fundamentals not found")
    return fundamentals

# EconomicIndicator endpoints
@app.post(
    "/economic_indicators/",
    response_model=Dict[str, Any],
    summary="Ingest economic indicator",
    description="Store one indicator value.",
    tags=["Manual Ingest"]
)
def create_economic_indicator(ei: EconomicIndicatorIn, db: Session = Depends(get_db)):
    """🌍 INGEST: Create and store economic indicator record in PostgreSQL"""
    try:
        indicator = EconomicIndicator(
            id=str(uuid.uuid4()),
            indicator_name=ei.indicator_name,
            value=ei.value,
            date=ei.date,
            country=ei.country,
            source=ei.source,
            ingested_at=datetime.now(UTC)
        )
        db.add(indicator)
        db.commit()
        db.refresh(indicator)

        # Log successful ingestion
        log_ingestion("CREATE_ECONOMIC_INDICATOR", 1, ei.source, f"{ei.indicator_name} ({ei.country})")

        return {
            "status": "success",
            "message": f"Economic indicator '{ei.indicator_name}' ingested for {ei.country}",
            "record_id": indicator.id,
            "ingestion_timestamp": indicator.ingested_at,
            "source": ei.source
        }
    except Exception as e:
        db.rollback()
        return handle_database_error(e, "create_economic_indicator")

@app.get("/economic_indicators/", summary="List indicators", tags=["Data Retrieval"])
def list_economic_indicators(db: Session = Depends(get_db)):
    """Retrieve all economic indicators from the database"""
    return db.query(EconomicIndicator).all()

@app.get("/economic_indicators/{indicator_id}", summary="Get indicator", tags=["Data Retrieval"])
def get_economic_indicator(indicator_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific economic indicator by ID"""
    indicator = db.query(EconomicIndicator).filter(EconomicIndicator.id == indicator_id).first()
    if not indicator:
        raise HTTPException(status_code=404, detail="Economic indicator not found")
    return indicator

# CreditRating endpoints
@app.post(
    "/credit_ratings/",
    response_model=Dict[str, Any],
    summary="Ingest credit rating",
    description="Store one credit rating.",
    tags=["Manual Ingest"]
)
def create_credit_rating(cr: CreditRatingIn, db: Session = Depends(get_db)):
    """⭐ INGEST: Create and store credit rating record in PostgreSQL"""
    try:
        rating = CreditRating(
            id=str(uuid.uuid4()),
            entity=cr.entity,
            symbol=cr.symbol,
            rating=cr.rating,
            agency=cr.agency,
            rating_date=cr.rating_date,
            outlook=cr.outlook,
            source=cr.source,
            ingested_at=datetime.now(UTC)
        )
        db.add(rating)
        db.commit()
        db.refresh(rating)

        # Log successful ingestion
        log_ingestion("CREATE_CREDIT_RATING", 1, cr.source, f"{cr.entity} ({cr.symbol}) - {cr.rating}")

        return {
            "status": "success",
            "message": f"Credit rating {cr.rating} ingested for {cr.entity} by {cr.agency}",
            "record_id": rating.id,
            "ingestion_timestamp": rating.ingested_at,
            "source": cr.source
        }
    except Exception as e:
        db.rollback()
        return handle_database_error(e, "create_credit_rating")

@app.get("/credit_ratings/", summary="List credit ratings", tags=["Data Retrieval"])
def list_credit_ratings(db: Session = Depends(get_db)):
    """Retrieve all credit ratings from the database"""
    return db.query(CreditRating).all()

@app.get("/credit_ratings/{rating_id}", summary="Get credit rating", tags=["Data Retrieval"])
def get_credit_rating(rating_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific credit rating by ID"""
    rating = db.query(CreditRating).filter(CreditRating.id == rating_id).first()
    if not rating:
        raise HTTPException(status_code=404, detail="Credit rating not found")
    return rating

# RegulatoryFiling endpoints
@app.post(
    "/regulatory_filings/",
    response_model=Dict[str, Any],
    summary="Ingest filing",
    description="Store one regulatory filing.",
    tags=["Manual Ingest"]
)
def create_regulatory_filing(rf: RegulatoryFilingIn, db: Session = Depends(get_db)):
    """📄 INGEST: Create and store regulatory filing record in PostgreSQL"""
    try:
        filing = RegulatoryFiling(
            id=str(uuid.uuid4()),
            company=rf.company,
            symbol=rf.symbol,
            filing_type=rf.filing_type,
            filing_date=rf.filing_date,
            data=rf.data,
            source=rf.source,
            ingested_at=datetime.now(UTC)
        )
        db.add(filing)
        db.commit()
        db.refresh(filing)

        # Log successful ingestion
        log_ingestion("CREATE_REGULATORY_FILING", 1, rf.source, f"{rf.company} ({rf.symbol}) - {rf.filing_type}")

        return {
            "status": "success",
            "message": f"Regulatory filing {rf.filing_type} ingested for {rf.company}",
            "record_id": filing.id,
            "ingestion_timestamp": filing.ingested_at,
            "source": rf.source
        }
    except Exception as e:
        db.rollback()
        return handle_database_error(e, "create_regulatory_filing")

@app.get("/regulatory_filings/", summary="List filings", tags=["Data Retrieval"])
def list_regulatory_filings(db: Session = Depends(get_db)):
    """Retrieve all regulatory filings from the database"""
    return db.query(RegulatoryFiling).all()

@app.get("/regulatory_filings/{filing_id}", summary="Get filing", tags=["Data Retrieval"])
def get_regulatory_filing(filing_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific regulatory filing by ID"""
    filing = db.query(RegulatoryFiling).filter(RegulatoryFiling.id == filing_id).first()
    if not filing:
        raise HTTPException(status_code=404, detail="Regulatory filing not found")
    return filing

# Data Source Endpoints (view-only, no ingestion)
@app.get(
    "/credit_features/{ticker}",
    summary="Fetch Yahoo Finance",
    description="Fetch credit features (no store).",
    tags=["Fetch Only"]
)
def get_credit_features(ticker: str):
    """Fetch credit features from Yahoo Finance API (view-only)"""
    try:
        result = fetch_credit_features(ticker)
        logger.info(f"📈 FETCH: Yahoo Finance data for {ticker}")
        return result  # Let FastAPI handle encoding
    except Exception as e:
        logger.error(f"❌ FETCH ERROR: Yahoo Finance for {ticker}: {str(e)}")
        return {"error": str(e)}

@app.get(
    "/sec_filings/{ticker}",
    summary="Fetch SEC filings",
    description="Fetch SEC filings (no store).",
    tags=["Fetch Only"]
)
def get_sec_filings(ticker: str):
    try:
        result = fetch_sec_filings(ticker)
        logger.info(f"📄 FETCH: SEC EDGAR data for {ticker}")
        return result
    except Exception as e:
        logger.error(f"❌ FETCH ERROR: SEC EDGAR for {ticker}: {str(e)}")
        return {"error": str(e)}

# Advanced Data Ingestion Endpoints (Fetch + Store)
@app.post(
    "/ingest/credit_features/{ticker}",
    response_model=IngestionResponse,
    summary="Ingest Yahoo credit data",
    description="Fetch + store fundamentals & recent prices.",
    tags=["Auto Fetch & Store"]
)
def ingest_credit_features(ticker: str = Path(..., min_length=1, max_length=10, description="Stock ticker symbol"),
                          db: Session = Depends(get_db)):
    """🚀 INGEST: Fetch Yahoo Finance data and store in PostgreSQL"""
    operation_start = datetime.now(UTC)

    try:
        logger.info(f"🚀 STARTING INGESTION: Yahoo Finance credit features for {ticker}")

        # Fetch data from Yahoo Finance
        result = fetch_credit_features(ticker)

        if not result or "fundamentals" not in result or "market_data" not in result:
            raise ValueError(f"Invalid data structure received from Yahoo Finance for {ticker}")

        records_created = {"company_fundamentals": 0, "stock_prices": 0}

        # Save fundamentals to database
        fundamentals_data = result["fundamentals"]
        if fundamentals_data and fundamentals_data.get("ticker"):
            cf = CompanyFundamentals(
                id=str(uuid.uuid4()),
                company=fundamentals_data["ticker"],
                symbol=fundamentals_data["ticker"],
                fiscal_year=datetime.now(UTC).year,
                fiscal_quarter="Current",
                fundamentals={
                    "total_revenue": fundamentals_data.get("total_revenue"),
                    "total_debt": fundamentals_data.get("total_debt"),
                    "debt_to_equity": fundamentals_data.get("debt_to_equity"),
                    "updated_at": fundamentals_data.get("updated_at")
                },
                source="YahooFinance",
                ingested_at=operation_start
            )
            db.add(cf)
            records_created["company_fundamentals"] = 1

        # Save stock prices to database
        market_data = result.get("market_data", [])
        for price_data in market_data:
            if price_data.get("ticker") and price_data.get("date"):
                try:
                    sp = StockPrice(
                        id=str(uuid.uuid4()),
                        symbol=price_data["ticker"],
                        date=datetime.fromisoformat(price_data["date"]).replace(tzinfo=UTC),
                        open=float(price_data.get("close_price", 0)),
                        close=float(price_data.get("close_price", 0)),
                        high=float(price_data.get("close_price", 0)),
                        low=float(price_data.get("close_price", 0)),
                        volume=float(price_data.get("volume", 0)),
                        source="YahooFinance",
                        ingested_at=operation_start
                    )
                    db.add(sp)
                    records_created["stock_prices"] += 1
                except (ValueError, TypeError) as e:
                    logger.warning(f"⚠️ Skipping invalid price data for {ticker}: {e}")
                    continue

        # Commit all records
        db.commit()

        # Log successful ingestion
        total_records = sum(records_created.values())
        log_ingestion("YAHOO_FINANCE_CREDIT_FEATURES", total_records, "YahooFinance", ticker)

        return IngestionResponse(
            status="success",
            message=f"Successfully ingested credit features for {ticker}",
            records_created=records_created,
            ingestion_timestamp=operation_start,
            source="YahooFinance"
        )

    except Exception as e:
        db.rollback()
        logger.error(f"❌ INGESTION FAILED: Yahoo Finance for {ticker}: {str(e)}")
        return handle_database_error(e, f"ingest_credit_features_{ticker}")

@app.post(
    "/ingest/sec_filings/{ticker}",
    response_model=IngestionResponse,
    summary="Ingest SEC filings",
    description="Fetch + store recent SEC filings.",
    tags=["Auto Fetch & Store"]
)
def ingest_sec_filings(ticker: str = Path(..., min_length=1, max_length=10, description="Stock ticker symbol or CIK"),
                      db: Session = Depends(get_db)):
    """🚀 INGEST: Fetch SEC EDGAR filings and store in PostgreSQL"""
    operation_start = datetime.now(UTC)

    try:
        logger.info(f"🚀 STARTING INGESTION: SEC EDGAR filings for {ticker}")

        # Fetch data from SEC EDGAR
        result = fetch_sec_filings(ticker)

        if not result or "filings" not in result:
            raise ValueError(f"Invalid data structure received from SEC EDGAR for {ticker}")

        # Save filings to database
        records_created = 0
        filings = result.get("filings", [])

        for filing in filings:
            if filing.get("title") and filing.get("filing_date"):
                try:
                    # Parse filing date safely
                    filing_date_str = filing.get("filing_date")
                    if filing_date_str:
                        if filing_date_str.endswith("Z"):
                            filing_date = datetime.fromisoformat(filing_date_str.replace("Z", "+00:00"))
                        else:
                            filing_date = datetime.fromisoformat(filing_date_str)
                    else:
                        filing_date = operation_start

                    rf = RegulatoryFiling(
                        id=str(uuid.uuid4()),
                        company=ticker,  # Using ticker as company identifier
                        symbol=ticker,
                        filing_type=filing.get("title", "Unknown")[:50],  # Truncate to fit field limit
                        filing_date=filing_date,
                        data={
                            "title": filing.get("title"),
                            "summary": filing.get("summary"),
                            "link": filing.get("link"),
                            "raw_filing_date": filing.get("filing_date")
                        },
                        source="SEC_EDGAR",
                        ingested_at=operation_start
                    )
                    db.add(rf)
                    records_created += 1

                except (ValueError, TypeError) as e:
                    logger.warning(f"⚠️ Skipping invalid filing data for {ticker}: {e}")
                    continue

        # Commit all records
        db.commit()

        # Log successful ingestion
        log_ingestion("SEC_EDGAR_FILINGS", records_created, "SEC_EDGAR", ticker)

        return IngestionResponse(
            status="success",
            message=f"Successfully ingested SEC filings for {ticker}",
            records_created={"regulatory_filings": records_created},
            ingestion_timestamp=operation_start,
            source="SEC_EDGAR"
        )

    except Exception as e:
        db.rollback()
        logger.error(f"❌ INGESTION FAILED: SEC EDGAR for {ticker}: {str(e)}")
        return handle_database_error(e, f"ingest_sec_filings_{ticker}")

# System Status and Health Check Endpoints
@app.get(
    "/health",
    summary="Health",
    description="API + DB status.",
    tags=["System"]
)
def health_check():
    """System health check endpoint"""
    db = None
    try:
        # Open a DB session
        db = SessionLocal()

        # Execute a simple query to test connectivity
        db.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "database": "connected",
            "api_version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"❌ Health check failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "database": "disconnected",
                "error": str(e)
            }
        )

@app.get(
    "/stats",
    summary="Stats",
    description="Record counts.",
    tags=["System"]
)
def get_stats(db: Session = Depends(get_db)):
    """Get database statistics and record counts"""
    try:
        stats = {
            "financial_statements": db.query(FinancialStatement).count(),
            "stock_prices": db.query(StockPrice).count(),
            "company_fundamentals": db.query(CompanyFundamentals).count(),
            "economic_indicators": db.query(EconomicIndicator).count(),
            "credit_ratings": db.query(CreditRating).count(),
            "regulatory_filings": db.query(RegulatoryFiling).count(),
            "last_updated": datetime.now(UTC)
        }

        logger.info(f"📊 STATS: Database statistics retrieved")
        return stats

    except Exception as e:
        logger.error(f"❌ STATS ERROR: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/db_creds", tags=["System"])
def get_db_creds():
    return {
        "db_url": Config.DB_URL,
        "db_type": Config.DB_TYPE
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
