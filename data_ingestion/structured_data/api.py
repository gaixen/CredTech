from fastapi import FastAPI, Depends, HTTPException, status, Path
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
try:
    from .storage import SessionLocal, init_db  # type: ignore
    from .models import CompanyFundamentals, StockPrice, EconomicIndicator, RegulatoryFiling  # type: ignore
    from .sources.yahoo_finance_features import fetch_credit_features  # type: ignore
    from .sources.sec_edgar import fetch_sec_filings  # type: ignore
    from .sources.fred_series import fetch_fred_series, FredFetchError  # type: ignore
    from .config import Config  # type: ignore
    from .socket_server import socket_app as socketio_app  # type: ignore
except ImportError:  # Fallback when run as a script from the structured_data directory
    import sys, pathlib
    _here = pathlib.Path(__file__).resolve().parent
    if str(_here) not in sys.path:
        sys.path.insert(0, str(_here))  # ensure local modules precede site-packages
    from storage import SessionLocal, init_db  # type: ignore
    from models import CompanyFundamentals, StockPrice, EconomicIndicator, RegulatoryFiling  # type: ignore
    from sources.yahoo_finance_features import fetch_credit_features  # type: ignore
    from sources.sec_edgar import fetch_sec_filings  # type: ignore
    from sources.fred_series import fetch_fred_series, FredFetchError  # type: ignore
    from config import Config  # type: ignore
    from socket_server import socket_app as socketio_app  # type: ignore
from pydantic import BaseModel, Field
from datetime import datetime, UTC, timezone
from contextlib import asynccontextmanager
import uuid
import logging
import numpy as np
from typing import Dict, Any, List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# New tag metadata for reorganized Swagger UI
TAGS_METADATA = [
    {"name": "Auto Fetch & Store", "description": "Fetch external data (Yahoo, SEC, FRED) and store in DB."},
    {"name": "Fetch Only", "description": "Fetch external data only (no persistence)."},
    {"name": "Manual Ingest", "description": "POST raw fundamentals data you already have."},
    {"name": "Data Retrieval", "description": "GET stored records from the database (fundamentals, filings, indicators, risk scores)."},
    {"name": "System", "description": "Health, statistics, configuration."},
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup"""
    logger.info("🚀 Starting CredTech Structured Data API")
    init_db()
    logger.info("✅ Database initialized")
    yield
    logger.info("🛑 Shutting down CredTech Structured Data API")

# FastAPI app instance
app = FastAPI(
    title="CredTech Structured Data API",
    description="Fetch, store, and retrieve structured financial data for credit risk assessment",
    version="1.0.0",
    openapi_tags=TAGS_METADATA,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utility functions
def log_ingestion(data_type: str, count: int, source: str, identifier: str = ""):
    logger.info(f"✅ INGESTED {count} {data_type} records from {source} {identifier}")

def handle_database_error(e: Exception, operation: str):
    if isinstance(e, IntegrityError):
        return JSONResponse(status_code=409, content={"error": "Data already exists", "operation": operation})
    return JSONResponse(status_code=500, content={"error": str(e), "operation": operation})

# Enhanced Pydantic models with validation
class FundamentalsCreate(BaseModel):
    company: str = Field(..., description="Company name")
    ticker: str = Field(..., description="Stock ticker symbol")
    fiscal_year: int = Field(..., description="Fiscal year")
    fiscal_quarter: Optional[str] = Field(None, description="Fiscal quarter (Q1, Q2, Q3, Q4)")
    fundamentals: Dict[str, Any] = Field(..., description="Fundamentals data as JSON")
    source: str = Field(default="manual", description="Data source")

class StockPriceCreate(BaseModel):
    ticker: str = Field(..., description="Stock ticker symbol")
    date: datetime = Field(..., description="Price date")
    open: float = Field(..., description="Opening price")
    close: float = Field(..., description="Closing price")
    high: float = Field(..., description="High price")
    low: float = Field(..., description="Low price")
    volume: float = Field(..., description="Trading volume")
    source: str = Field(default="manual", description="Data source")

class FilingCreate(BaseModel):
    company: str = Field(..., description="Company name")
    ticker: str = Field(..., description="Stock ticker symbol")
    filing_type: str = Field(..., description="Filing type (10-K, 10-Q, etc.)")
    filing_date: datetime = Field(..., description="Filing date")
    data: Dict[str, Any] = Field(..., description="Filing data as JSON")
    source: str = Field(default="manual", description="Data source")

class CompanyFundamentalsIn(BaseModel):
    """Input model for Company Fundamentals data"""
    company: str = Field(..., min_length=1, max_length=255, description="Company name")
    ticker: str = Field(..., min_length=1, max_length=10, description="Stock ticker symbol")
    fiscal_year: int = Field(..., ge=1900, le=2100, description="Fiscal year")
    fiscal_quarter: str = Field(..., description="Fiscal quarter")
    fundamentals: Dict[str, Any] = Field(..., description="Fundamental metrics")
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

def compute_financial_metrics(fundamentals_data: Dict[str, Any]) -> Dict[str, Optional[float]]:
    """
    Compute comprehensive financial metrics following academic literature 
    (Das et al., Tsai et al.)
    """
    metrics = {}
    
    try:
        # Return on Assets: Rolling 4-quarter average to reduce seasonal effects and noise
        if fundamentals_data.get("net_income") and fundamentals_data.get("total_assets"):
            try:
                roa = (fundamentals_data["net_income"] / fundamentals_data["total_assets"] ) * 100
                metrics["roa"] = round(roa, 4)
            except (ZeroDivisionError, TypeError):
                metrics["roa"] = None
        else:
            metrics["roa"] = None
            
        #  Revenue Growth (RG) - rolling 4-quarter average
        metrics["revenue_growth"] = fundamentals_data.get("revenue_growth")
        
        # Leverage (LEV) - ratio of total debt to total assets
        if fundamentals_data.get("total_debt") and fundamentals_data.get("total_assets") is not None:
            try:
                leverage = fundamentals_data["total_debt"] / fundamentals_data["total_assets"]
                metrics["leverage"] = round(leverage, 4)
            except (ZeroDivisionError, TypeError):
                metrics["leverage"] = None
        else:
            metrics["leverage"] = None
            
        # Retained Earnings ratio (EARN) - retained earnings to total assets
        if fundamentals_data.get("retained_earnings") and fundamentals_data.get("total_assets"):
            try:
                retained_earnings_ratio = fundamentals_data["retained_earnings"] / fundamentals_data["total_assets"]
                metrics["retained_earnings_ratio"] = round(retained_earnings_ratio, 4)
            except (ZeroDivisionError, TypeError):
                metrics["retained_earnings_ratio"] = None
        else:
            metrics["retained_earnings_ratio"] = None
            
        # Net Income Growth (NIG) - normalized by total assets
        if fundamentals_data.get("net_income_growth") and fundamentals_data.get("total_assets") is not None:
            try:
                nig = fundamentals_data["net_income_growth"] / fundamentals_data["total_assets"]
                metrics["net_income_growth_normalized"] = round(nig, 4)
            except (ZeroDivisionError, TypeError):
                metrics["net_income_growth_normalized"] = None
        else:
            metrics["net_income_growth_normalized"] = None
            
        # Current Ratio (traditional liquidity measure)
        if fundamentals_data.get("current_assets") and fundamentals_data.get("current_liabilities") is not None:
            try:
                current_ratio = fundamentals_data["current_assets"] / fundamentals_data["current_liabilities"]
                metrics["current_ratio"] = round(current_ratio, 4)
            except (ZeroDivisionError, TypeError):
                metrics["current_ratio"] = None
        else:
            metrics["current_ratio"] = None
            
        # Debt-to-Equity ratio (alternative leverage)
        if fundamentals_data.get("total_debt") and fundamentals_data.get("equity"):
            try:
                debt_to_equity = fundamentals_data["total_debt"] / fundamentals_data["equity"]
                metrics["debt_to_equity"] = round(debt_to_equity, 4)
            except (ZeroDivisionError, TypeError):
                metrics["debt_to_equity"] = None
        else:
            metrics["debt_to_equity"] = None
            
        return metrics
        
    except Exception:
        return {key: None for key in ["roa", "revenue_growth", "leverage", "retained_earnings_ratio", 
                                     "net_income_growth_normalized", "current_ratio", "debt_to_equity"]}

def compute_risk_score(fundamentals_data: Dict[str, Any]) -> Optional[float]:
    """
    Compute risk score based on financial metrics. Higher score = lower risk.
    """
    try:
        score = 50.0
        
        metrics = compute_financial_metrics(fundamentals_data)

        # ROA component (key predictor from literature)
        roa = metrics.get("roa")
        if roa is not None:
            if roa > 10: score += 15      # Very high profitability
            elif roa > 5: score += 10     # Good profitability
            elif roa > 0: score += 5      # Positive profitability
            else: score -= 15             # Negative ROA is concerning

        # Leverage component (total debt to total assets)
        leverage = metrics.get("leverage")
        if leverage is not None:
            if leverage < 0.3: score += 10      # Low leverage
            elif leverage < 0.5: score += 5     # Moderate leverage
            elif leverage < 0.7: score -= 5     # High leverage
            else: score -= 15                   # Very high leverage

        # Liquidity: current ratio
        current_ratio = metrics.get("current_ratio")
        if current_ratio is not None:
            if current_ratio >= 2: score += 10
            elif current_ratio >= 1: score += 5
            else: score -= 10

        # Growth component
        revenue_growth = metrics.get("revenue_growth")
        if revenue_growth is not None:
            if revenue_growth > 0.15: score += 8
            elif revenue_growth > 0.05: score += 3
            elif revenue_growth < -0.05: score -= 8

        # Cash flow coverage (if available)
        if fundamentals_data.get("free_cash_flow") and fundamentals_data.get("total_debt"):
            try:
                coverage = fundamentals_data["free_cash_flow"] / fundamentals_data["total_debt"]
                if coverage > 0.3: score += 5
                elif coverage < 0.05: score -= 5
            except (ZeroDivisionError, TypeError):
                pass

        return max(0.0, min(100.0, round(score, 2)))
    except Exception:
        return None

# FRED Series Ingestion Endpoint
@app.post(
    "/ingest/fred/{series_id}",
    summary="Ingest FRED Economic Series",
    description="Fetch and store FRED economic data series in the database.",
    tags=["Auto Fetch & Store"]
)
def ingest_fred_series(
    series_id: str, 
    start: Optional[str] = None, 
    end: Optional[str] = None, 
    limit: int = 20, 
    api_key: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    """Ingest FRED economic series data"""
    start_ts = datetime.now(UTC)
    try:
        data = fetch_fred_series(series_id, api_key=api_key, start=start, end=end)
        observations = data.get("observations", [])[-limit:]
        created = 0
        for obs in observations:
            try:
                dt = datetime.fromisoformat(obs["date"]).replace(tzinfo=UTC)
            except Exception:
                continue
            ei = EconomicIndicator(
                id=str(uuid.uuid4()),
                indicator_name=series_id,
                value=obs.get("value"),
                date=dt,
                country="US",
                source="FRED",
                ingested_at=start_ts
            )
            db.add(ei)
            created += 1
        db.commit()
        log_ingestion("FRED_SERIES", created, "FRED", series_id)
        return {
            "status": "success", 
            "message": f"Ingested FRED series {series_id}", 
            "records_created": {"economic_indicators": created}, 
            "ingestion_timestamp": start_ts, 
            "source": "FRED"
        }
    except FredFetchError as fe:
        return JSONResponse(status_code=400, content={"error": str(fe), "hint": "Provide ?api_key=YOUR_KEY or set FRED_API_KEY env var."})
    except Exception as e:
        db.rollback()
        logger.error(f"❌ INGESTION FAILED: FRED {series_id}: {e}")
        return handle_database_error(e, f"ingest_fred_{series_id}")

# Yahoo Finance Endpoints
@app.post(
    "/ingest/yahoo/{ticker}",
    summary="Ingest Yahoo Finance Data",
    description="Fetch and store company fundamentals from Yahoo Finance.",
    tags=["Auto Fetch & Store"]
)
def ingest_yahoo_fundamentals(ticker: str, db: Session = Depends(get_db)):
    """Ingest Yahoo Finance fundamentals data with enhanced risk scoring"""
    start_ts = datetime.now(UTC)
    try:
        data = fetch_credit_features(ticker.upper())

        if not data or "fundamentals" not in data:
            raise ValueError(f"Invalid data structure received from Yahoo Finance for {ticker}")

        records_created = {"company_fundamentals": 0, "stock_prices": 0}

        # Process fundamentals data
        fundamentals_data = data["fundamentals"]
        if fundamentals_data and fundamentals_data.get("ticker"):
            # Calculate comprehensive financial metrics following academic literature
            academic_metrics = compute_financial_metrics(fundamentals_data)
            
            # Legacy calculations for backward compatibility
            current_ratio = academic_metrics.get("current_ratio")
            leverage_ratio = academic_metrics.get("debt_to_equity")  # Use debt-to-equity as leverage ratio

            # Enrich fundamentals data with all academic metrics
            fundamentals_enriched = {**fundamentals_data}
            fundamentals_enriched.update(academic_metrics)
            
            # Add legacy fields for compatibility
            fundamentals_enriched["current_ratio"] = current_ratio
            fundamentals_enriched["leverage_ratio"] = leverage_ratio
            fundamentals_enriched["risk_score"] = compute_risk_score(fundamentals_enriched)

            # Create CompanyFundamentals record with enhanced fields
            fundamental = CompanyFundamentals(
                id=str(uuid.uuid4()),
                company=fundamentals_data.get("company", ticker.upper()),
                symbol=ticker.upper(),  # Store as symbol in DB but use ticker in API
                fiscal_year=datetime.now().year,
                fiscal_quarter=None,
                fundamentals=fundamentals_enriched,
                source="Yahoo Finance",
                ingested_at=start_ts,

                total_revenue=fundamentals_enriched.get("total_revenue"),
                net_income=fundamentals_enriched.get("net_income"),
                free_cash_flow=fundamentals_enriched.get("free_cash_flow"),
                total_assets=fundamentals_enriched.get("total_assets"),
                total_liabilities=fundamentals_enriched.get("total_liabilities"),
                equity=fundamentals_enriched.get("equity"),
                debt_short=fundamentals_enriched.get("debt_short"),
                debt_long=fundamentals_enriched.get("debt_long"),
                total_debt=fundamentals_enriched.get("total_debt"),
                interest_expense=fundamentals_enriched.get("interest_expense"),
                cash=fundamentals_enriched.get("cash"),
                current_assets=fundamentals_enriched.get("current_assets"),
                current_liabilities=fundamentals_enriched.get("current_liabilities"),
                revenue_growth=fundamentals_enriched.get("revenue_growth"),
                sector=fundamentals_enriched.get("sector"),
                industry=fundamentals_enriched.get("industry"),
                region=fundamentals_enriched.get("region"),
                current_ratio=current_ratio,
                leverage_ratio=leverage_ratio,
                risk_score=fundamentals_enriched.get("risk_score"),
                roa=academic_metrics.get("roa"),
                leverage_assets=academic_metrics.get("leverage"),
                retained_earnings_ratio=academic_metrics.get("retained_earnings_ratio"),
                net_income_growth_normalized=academic_metrics.get("net_income_growth_normalized")
            )

            db.add(fundamental)
            records_created["company_fundamentals"] = 1

        # Process market data
        market_data = data.get("market_data", [])
        for price_data in market_data:
            if price_data.get("ticker") and price_data.get("date"):
                try:
                    sp = StockPrice(
                        id=str(uuid.uuid4()),
                        symbol=price_data["ticker"],  # Store as symbol in DB
                        date=datetime.fromisoformat(price_data["date"]).replace(tzinfo=UTC),
                        open=float(price_data.get("close_price", 0)),
                        close=float(price_data.get("close_price", 0)),
                        high=float(price_data.get("close_price", 0)),
                        low=float(price_data.get("close_price", 0)),
                        volume=float(price_data.get("volume", 0)),
                        source="Yahoo Finance",
                        ingested_at=start_ts
                    )
                    db.add(sp)
                    records_created["stock_prices"] += 1
                except (ValueError, TypeError) as e:
                    logger.warning(f"Skipping invalid price data for {ticker}: {e}")
                    continue

        db.commit()
        log_ingestion("YAHOO_FUNDAMENTALS", sum(records_created.values()), "Yahoo Finance", ticker)

        return {
            "status": "success",
            "message": f"Ingested Yahoo Finance data for {ticker}",
            "records_created": records_created,
            "ingestion_timestamp": start_ts,
            "source": "Yahoo Finance"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"❌ INGESTION FAILED: Yahoo {ticker}: {e}")
        return handle_database_error(e, f"ingest_yahoo_{ticker}")

@app.get(
    "/fetch/yahoo/{ticker}",
    summary="Fetch Yahoo Finance Data (No Storage)",
    description="Fetch company fundamentals from Yahoo Finance without storing to database.",
    tags=["Fetch Only"]
)
def fetch_yahoo_fundamentals(ticker: str):
    """Fetch Yahoo Finance fundamentals data without storing"""
    try:
        data = fetch_credit_features(ticker.upper())
        return {
            "status": "success",
            "ticker": ticker.upper(),
            "data": data,
            "source": "Yahoo Finance",
            "timestamp": datetime.now(UTC)
        }
    except Exception as e:
        logger.error(f"❌ FETCH FAILED: Yahoo {ticker}: {e}")
        return JSONResponse(status_code=500, content={"error": str(e), "ticker": ticker})

# SEC Edgar Endpoints
@app.post(
    "/ingest/sec/{ticker}",
    summary="Ingest SEC Edgar Filings",
    description="Fetch and store regulatory filings from SEC Edgar.",
    tags=["Auto Fetch & Store"]
)
def ingest_sec_filings(ticker: str, limit: int = 10, db: Session = Depends(get_db)):
    """Ingest SEC Edgar filings data"""
    start_ts = datetime.now(UTC)
    try:
        logger.info(f"🚀 Starting SEC Edgar ingestion for {ticker}")

        # Fetch filings data
        filings_data = fetch_sec_filings(ticker.upper())

        # Handle case where fetch_sec_filings returns None or empty
        if not filings_data:
            logger.warning(f"No SEC filings found for {ticker}")
            return {
                "status": "success",
                "message": f"No SEC filings found for {ticker}",
                "records_created": {"regulatory_filings": 0},
                "ingestion_timestamp": start_ts,
                "source": "SEC Edgar"
            }

        # Ensure filings_data is a list and limit the results
        if not isinstance(filings_data, list):
            logger.error(f"Invalid data type from SEC Edgar for {ticker}: {type(filings_data)}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": f"Invalid data format received from SEC Edgar: expected list, got {type(filings_data).__name__}",
                    "operation": f"ingest_sec_{ticker}"
                }
            )

        # Limit the number of filings to process
        filings_to_process = filings_data[:limit] if len(filings_data) > limit else filings_data
        created = 0

        for filing in filings_to_process:
            try:
                # Parse filing date
                filing_date_raw = filing.get("filing_date")
                filing_dt = start_ts  # Default to current time

                if filing_date_raw:
                    try:
                        if filing_date_raw.endswith("Z"):
                            filing_dt = datetime.fromisoformat(filing_date_raw.replace("Z", "+00:00"))
                        else:
                            # Try parsing as ISO format
                            filing_dt = datetime.fromisoformat(filing_date_raw)
                            if filing_dt.tzinfo is None:
                                filing_dt = filing_dt.replace(tzinfo=UTC)
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Could not parse filing date '{filing_date_raw}' for {ticker}: {e}")
                        filing_dt = start_ts

                # Create regulatory filing record
                regulatory_filing = RegulatoryFiling(
                    id=str(uuid.uuid4()),
                    company=filing.get("company", ticker.upper()),
                    symbol=ticker.upper(),  # Store as symbol in DB
                    filing_type=filing.get("filing_type", "Unknown")[:50],
                    filing_date=filing_dt,
                    data=filing,
                    source="SEC Edgar",
                    ingested_at=start_ts
                )
                db.add(regulatory_filing)
                created += 1

            except Exception as filing_error:
                logger.warning(f"Skipping invalid filing for {ticker}: {filing_error}")
                continue

        # Commit all records
        if created > 0:
            db.commit()
            log_ingestion("SEC_FILINGS", created, "SEC Edgar", ticker)

        return {
            "status": "success",
            "message": f"Ingested {created} SEC filings for {ticker}",
            "records_created": {"regulatory_filings": created},
            "ingestion_timestamp": start_ts,
            "source": "SEC Edgar"
        }

    except Exception as e:
        db.rollback()
        logger.error(f"❌ INGESTION FAILED: SEC {ticker}: {e}")
        return handle_database_error(e, f"ingest_sec_{ticker}")

@app.get(
    "/fetch/sec/{ticker}",
    summary="Fetch SEC Edgar Filings (No Storage)",
    description="Fetch regulatory filings from SEC Edgar without storing to database.",
    tags=["Fetch Only"]
)
def fetch_sec_filings_only(ticker: str, limit: int = 10):
    """Fetch SEC Edgar filings without storing"""
    try:
        logger.info(f"🔍 Fetching SEC filings for {ticker} (no storage)")

        filings_data = fetch_sec_filings(ticker.upper())

        # Handle case where fetch returns None or empty
        if not filings_data:
            return {
                "status": "success",
                "ticker": ticker.upper(),
                "filings": [],
                "message": f"No SEC filings found for {ticker}",
                "source": "SEC Edgar",
                "timestamp": datetime.now(UTC)
            }

        # Ensure it's a list and limit results
        if not isinstance(filings_data, list):
            return JSONResponse(
                status_code=500,
                content={
                    "error": f"Invalid data format from SEC Edgar: expected list, got {type(filings_data).__name__}",
                    "ticker": ticker
                }
            )

        limited_filings = filings_data[:limit] if len(filings_data) > limit else filings_data

        return {
            "status": "success",
            "ticker": ticker.upper(),
            "filings": limited_filings,
            "total_available": len(filings_data),
            "returned": len(limited_filings),
            "source": "SEC Edgar",
            "timestamp": datetime.now(UTC)
        }

    except Exception as e:
        logger.error(f"❌ FETCH FAILED: SEC {ticker}: {e}")
        return JSONResponse(status_code=500, content={"error": str(e), "ticker": ticker})

@app.get(
    "/fetch/fred/{series_id}",
    summary="Fetch FRED Series (No Storage)",
    description="Fetch FRED economic data without storing to database.",
    tags=["Fetch Only"]
)
def fetch_fred_series_only(
    series_id: str,
    start: Optional[str] = None,
    end: Optional[str] = None,
    limit: int = 20,
    api_key: Optional[str] = None
):
    """Fetch FRED series data without storing"""
    try:
        data = fetch_fred_series(series_id, api_key=api_key, start=start, end=end)
        observations = data.get("observations", [])[-limit:]
        return {
            "status": "success",
            "series_id": series_id,
            "observations": observations,
            "source": "FRED",
            "timestamp": datetime.now(UTC)
        }
    except FredFetchError as fe:
        return JSONResponse(status_code=400, content={"error": str(fe), "hint": "Provide ?api_key=YOUR_KEY or set FRED_API_KEY env var."})
    except Exception as e:
        logger.error(f"❌ FETCH FAILED: FRED {series_id}: {e}")
        return JSONResponse(status_code=500, content={"error": str(e), "series_id": series_id})

# Legacy endpoints for backward compatibility (using "credit_features" naming)
@app.get(
    "/credit_features/{ticker}",
    summary="Fetch Yahoo Finance (Legacy)",
    description="Fetch credit features from Yahoo Finance API (view-only) - Legacy endpoint",
    tags=["Fetch Only"]
)
def get_credit_features(ticker: str):
    """Legacy endpoint - use /fetch/yahoo/{ticker} instead"""
    return fetch_yahoo_fundamentals(ticker)

@app.get(
    "/sec_filings/{ticker}",
    summary="Fetch SEC filings (Legacy)",
    description="Fetch recent SEC EDGAR filings (no store) - Legacy endpoint",
    tags=["Fetch Only"]
)
def get_sec_filings(ticker: str):
    """Legacy endpoint - use /fetch/sec/{ticker} instead"""
    return fetch_sec_filings_only(ticker)

@app.get(
    "/fred/{series_id}",
    summary="Fetch FRED series (Legacy)",
    description="Fetch macroeconomic time series from FRED (no store) - Legacy endpoint",
    tags=["Fetch Only"]
)
def fetch_fred(series_id: str, start: Optional[str] = None, end: Optional[str] = None, limit: int = 20):
    """Legacy endpoint - use /fetch/fred/{series_id} instead"""
    return fetch_fred_series_only(series_id, start, end, limit)

# Enhanced Data Retrieval Endpoints
@app.get(
    "/fundamentals",
    summary="Get Company Fundamentals",
    description="Retrieve stored company fundamentals data",
    tags=["Data Retrieval"]
)
def get_fundamentals(ticker: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    """Get company fundamentals data"""
    query = db.query(CompanyFundamentals)
    if ticker:
        query = query.filter(CompanyFundamentals.symbol == ticker.upper())
    fundamentals = query.limit(limit).all()
    return {"fundamentals": [jsonable_encoder(f) for f in fundamentals]}

@app.get(
    "/economic-indicators",
    summary="Get Economic Indicators",
    description="Retrieve stored economic indicators",
    tags=["Data Retrieval"]
)
def get_economic_indicators(indicator_name: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    """Get economic indicators data"""
    query = db.query(EconomicIndicator)
    if indicator_name:
        query = query.filter(EconomicIndicator.indicator_name == indicator_name)
    indicators = query.limit(limit).all()
    return {"indicators": [jsonable_encoder(i) for i in indicators]}

@app.get(
    "/stock-prices",
    summary="Get Stock Prices",
    description="Retrieve stored stock price data",
    tags=["Data Retrieval"]
)
def get_stock_prices(ticker: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    """Get stock price data"""
    query = db.query(StockPrice)
    if ticker:
        query = query.filter(StockPrice.symbol == ticker.upper())
    prices = query.limit(limit).all()
    return {"stock_prices": [jsonable_encoder(p) for p in prices]}

@app.get(
    "/regulatory-filings",
    summary="Get Regulatory Filings",
    description="Retrieve stored regulatory filings",
    tags=["Data Retrieval"]
)
def get_regulatory_filings(ticker: Optional[str] = None, filing_type: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    """Get regulatory filings data"""
    query = db.query(RegulatoryFiling)
    if ticker:
        query = query.filter(RegulatoryFiling.symbol == ticker.upper())
    if filing_type:
        query = query.filter(RegulatoryFiling.filing_type == filing_type)
    filings = query.limit(limit).all()
    return {"regulatory_filings": [jsonable_encoder(f) for f in filings]}

@app.get(
    "/fundamentals/{ticker}",
    summary="Get Fundamentals by Ticker",
    description="Retrieve fundamentals data for a specific ticker",
    tags=["Data Retrieval"]
)
def get_fundamentals_by_ticker(ticker: str, db: Session = Depends(get_db)):
    """Get fundamentals for a specific ticker"""
    fundamentals = db.query(CompanyFundamentals).filter(
        CompanyFundamentals.symbol == ticker.upper()
    ).all()

    if not fundamentals:
        raise HTTPException(status_code=404, content={"error": f"No fundamentals found for ticker {ticker}"})

    return {"ticker": ticker.upper(), "fundamentals": [jsonable_encoder(f) for f in fundamentals]}

# Enhanced risk score endpoints
@app.get(
    "/risk_scores",
    summary="List latest risk scores",
    description="Get latest risk scores for all tickers",
    tags=["Data Retrieval"]
)
def list_risk_scores(db: Session = Depends(get_db)):
    """Get latest risk scores for all tickers"""
    records = db.query(CompanyFundamentals).order_by(
        CompanyFundamentals.symbol,
        CompanyFundamentals.ingested_at.desc()
    ).all()

    latest = {}
    for r in records:
        if r.symbol not in latest:
            latest[r.symbol] = {
                "ticker": r.symbol,
                "company": r.company,
                "risk_score": r.risk_score,
                "ingested_at": r.ingested_at,
                "revenue": r.total_revenue,
                "net_income": r.net_income,
                "free_cash_flow": r.free_cash_flow
            }

    return {"count": len(latest), "items": list(latest.values())}

@app.get(
    "/academic-metrics/{ticker}",
    summary="Get Academic Financial Metrics",
    description="Retrieve academic financial metrics (ROA, leverage, etc.) for CDS prediction models",
    tags=["Data Retrieval"]
)
def get_academic_metrics(ticker: str, db: Session = Depends(get_db)):
    """Get academic financial metrics for a specific ticker following Das et al. and Tsai et al."""
    rec = db.query(CompanyFundamentals).filter(
        CompanyFundamentals.symbol == ticker.upper()
    ).order_by(CompanyFundamentals.ingested_at.desc()).first()

    if not rec:
        raise HTTPException(status_code=404, detail="Ticker not found")

    # Extract academic metrics from fundamentals JSON
    fundamentals = rec.fundamentals or {}
    
    return {
        "ticker": rec.symbol,
        "company": rec.company,
        "fiscal_year": rec.fiscal_year,
        "ingested_at": rec.ingested_at,
        "academic_metrics": {
            # Accounting measures (following Das et al.)
            "roa": fundamentals.get("roa"),  # Return on Assets
            "revenue_growth": fundamentals.get("revenue_growth"),  # Revenue growth
            "leverage": fundamentals.get("leverage"),  # Total debt to total assets
            "retained_earnings_ratio": fundamentals.get("retained_earnings_ratio"),  # Retained earnings to total assets
            "net_income_growth_normalized": fundamentals.get("net_income_growth_normalized"),  # Net income growth normalized by assets
            
            # Additional metrics for model
            "current_ratio": fundamentals.get("current_ratio"),
            "debt_to_equity": fundamentals.get("debt_to_equity"),
            
            # Risk score
            "risk_score": rec.risk_score
        },
        "raw_data": {
            "total_revenue": rec.total_revenue,
            "net_income": rec.net_income,
            "total_assets": rec.total_assets,
            "total_debt": rec.total_debt,
            "equity": rec.equity,
            "retained_earnings": fundamentals.get("retained_earnings"),
            "free_cash_flow": rec.free_cash_flow
        },
        "data_quality": {
            "missing_fields": [
                field for field in ["roa", "revenue_growth", "leverage", "retained_earnings_ratio"]
                if fundamentals.get(field) is None
            ],
            "completeness_score": len([
                field for field in ["roa", "revenue_growth", "leverage", "retained_earnings_ratio"]
                if fundamentals.get(field) is not None
            ]) / 4 * 100
        }
    }

@app.get(
    "/academic-metrics",
    summary="Bulk Academic Financial Metrics",
    description="Retrieve academic financial metrics for multiple tickers for CDS modeling",
    tags=["Data Retrieval"]
)
def get_bulk_academic_metrics(limit: int = 100, db: Session = Depends(get_db)):
    """Get academic financial metrics for multiple tickers"""
    # Get latest record for each ticker
    records = db.query(CompanyFundamentals).order_by(
        CompanyFundamentals.symbol,
        CompanyFundamentals.ingested_at.desc()
    ).all()

    latest = {}
    for r in records:
        if r.symbol not in latest:
            fundamentals = r.fundamentals or {}
            latest[r.symbol] = {
                "ticker": r.symbol,
                "company": r.company,
                "fiscal_year": r.fiscal_year,
                "ingested_at": r.ingested_at,
                "academic_metrics": {
                    "roa": fundamentals.get("roa"),
                    "revenue_growth": fundamentals.get("revenue_growth"),
                    "leverage": fundamentals.get("leverage"),
                    "retained_earnings_ratio": fundamentals.get("retained_earnings_ratio"),
                    "net_income_growth_normalized": fundamentals.get("net_income_growth_normalized"),
                    "current_ratio": fundamentals.get("current_ratio"),
                    "debt_to_equity": fundamentals.get("debt_to_equity"),
                    "risk_score": r.risk_score
                },
                "data_completeness": len([
                    field for field in ["roa", "revenue_growth", "leverage", "retained_earnings_ratio"]
                    if fundamentals.get(field) is not None
                ]) / 4 * 100
            }

    result_list = list(latest.values())[:limit]
    
    return {
        "count": len(result_list),
        "items": result_list,
        "summary": {
            "avg_completeness": sum(item["data_completeness"] for item in result_list) / len(result_list) if result_list else 0,
            "complete_records": len([item for item in result_list if item["data_completeness"] == 100]),
            "sectors": list(set(item.get("sector", "Unknown") for item in result_list if "sector" in item))
        }
    }

@app.get(
    "/risk_scores/{ticker}",
    summary="Get latest risk score",
    description="Get latest risk score for a specific ticker",
    tags=["Data Retrieval"]
)
def get_risk_score(ticker: str, db: Session = Depends(get_db)):
    """Get latest risk score for a specific ticker with enhanced academic metrics"""
    rec = db.query(CompanyFundamentals).filter(
        CompanyFundamentals.symbol == ticker.upper()
    ).order_by(CompanyFundamentals.ingested_at.desc()).first()

    if not rec:
        raise HTTPException(status_code=404, detail="Ticker not found")

    fundamentals = rec.fundamentals or {}
    
    return {
        "ticker": rec.symbol,
        "company": rec.company,
        "risk_score": rec.risk_score,
        "ingested_at": rec.ingested_at,
        "metrics": {
            # Core financial metrics
            "total_revenue": rec.total_revenue,
            "net_income": rec.net_income,
            "free_cash_flow": rec.free_cash_flow,
            "total_assets": rec.total_assets,
            "total_liabilities": rec.total_liabilities,
            "equity": rec.equity,
            "total_debt": rec.total_debt,
            "interest_expense": rec.interest_expense,
            "cash": rec.cash,
            "current_assets": rec.current_assets,
            "current_liabilities": rec.current_liabilities,
            "revenue_growth": rec.revenue_growth,
            "current_ratio": rec.current_ratio,
            "leverage_ratio": rec.leverage_ratio,
            
            # Academic metrics for CDS prediction
            "roa": fundamentals.get("roa"),
            "leverage_assets": fundamentals.get("leverage"),
            "retained_earnings_ratio": fundamentals.get("retained_earnings_ratio"),
            "net_income_growth_normalized": fundamentals.get("net_income_growth_normalized"),
            "debt_to_equity": fundamentals.get("debt_to_equity")
        }
    }

# Market-based metrics calculation (following academic literature)
def calculate_naive_distance_to_default(equity_value: float, debt_value: float, 
                                        equity_volatility: float, stock_return: float) -> Optional[float]:
    """
    Calculate naive distance to default following Bharath and Shumway methodology
    Referenced in the academic paper for credit risk assessment
    """
    try:
        if not all([equity_value, debt_value, equity_volatility]) or any(x <= 0 for x in [equity_value, debt_value]):
            return None
            
        # Total firm volatility (naive σv) - Equation (1) from the paper
        E = equity_value
        F = debt_value
        sigma_E = equity_volatility
        
        naive_sigma_v = (E / (E + F)) * sigma_E + (F / (E + F)) * (0.05 + 0.25 * sigma_E)
        
        # Naive distance to default - Equation (2) from the paper
        T = 1.0  # One year forecasting horizon
        
        naive_dtd = (
            np.log((E + F) / F) + stock_return - 0.5 * (naive_sigma_v ** 2) * T
        ) / (naive_sigma_v * np.sqrt(T))
        
        return round(naive_dtd, 6)
        
    except Exception:
        return None

@app.post(
    "/market-metrics/{ticker}",
    summary="Calculate Market-Based Metrics",
    description="Calculate market-based risk metrics including naive distance to default",
    tags=["Auto Fetch & Store"]
)
def calculate_market_metrics(
    ticker: str,
    equity_value: float,
    debt_value: float,
    equity_volatility: float,
    stock_return: float,
    sp500_return: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """Calculate and store market-based metrics for credit risk assessment"""
    try:
        # Calculate naive distance to default
        dtd = calculate_naive_distance_to_default(equity_value, debt_value, equity_volatility, stock_return)
        
        market_metrics = {
            "equity_return": stock_return,
            "equity_volatility": equity_volatility,
            "index_return": sp500_return,
            "distance_to_default": dtd,
            "equity_value": equity_value,
            "debt_value": debt_value,
            "calculation_date": datetime.now(UTC).isoformat()
        }
        
        # Try to update existing record or create new one
        existing = db.query(CompanyFundamentals).filter(
            CompanyFundamentals.symbol == ticker.upper()
        ).order_by(CompanyFundamentals.ingested_at.desc()).first()
        
        if existing:
            # Update existing record with market metrics
            existing_fundamentals = existing.fundamentals or {}
            existing_fundamentals.update(market_metrics)
            existing.fundamentals = existing_fundamentals
            db.commit()
            
            return {
                "status": "success",
                "message": f"Updated market metrics for {ticker}",
                "ticker": ticker.upper(),
                "market_metrics": market_metrics,
                "distance_to_default": dtd
            }
        else:
            return {
                "status": "warning",
                "message": f"No existing fundamentals found for {ticker}. Use /ingest/yahoo/{ticker} first.",
                "ticker": ticker.upper(),
                "calculated_metrics": market_metrics
            }
            
    except Exception as e:
        logger.error(f"Market metrics calculation failed for {ticker}: {e}")
        return handle_database_error(e, f"market_metrics_{ticker}")

# Manual data ingestion endpoints
@app.post(
    "/manual/fundamentals",
    summary="Manual Fundamentals Ingestion",
    description="Manually add company fundamentals data",
    tags=["Manual Ingest"]
)
def manual_ingest_fundamentals(fundamentals_data: FundamentalsCreate, db: Session = Depends(get_db)):
    """Manually ingest company fundamentals with enhanced academic metrics"""
    try:
        # Calculate comprehensive financial metrics following academic literature
        fjson = fundamentals_data.fundamentals or {}
        academic_metrics = compute_financial_metrics(fjson)
        
        # Legacy calculations for backward compatibility
        current_ratio = academic_metrics.get("current_ratio")
        leverage_ratio = academic_metrics.get("debt_to_equity")  # Use debt-to-equity as leverage ratio

        # Enrich fundamentals data with all academic metrics
        enriched = dict(fjson)
        enriched.update(academic_metrics)
        
        # Add legacy fields for compatibility
        enriched["current_ratio"] = current_ratio
        enriched["leverage_ratio"] = leverage_ratio
        enriched["risk_score"] = compute_risk_score(enriched)

        fundamental = CompanyFundamentals(
            id=str(uuid.uuid4()),
            company=fundamentals_data.company,
            symbol=fundamentals_data.ticker.upper(),  # Store ticker as symbol in DB
            fiscal_year=fundamentals_data.fiscal_year,
            fiscal_quarter=fundamentals_data.fiscal_quarter,
            fundamentals=enriched,
            source=fundamentals_data.source,
            ingested_at=datetime.now(UTC),
            # Map specific fields including academic metrics
            total_revenue=fjson.get("total_revenue"),
            net_income=fjson.get("net_income"),
            free_cash_flow=fjson.get("free_cash_flow"),
            total_assets=fjson.get("total_assets"),
            total_liabilities=fjson.get("total_liabilities"),
            equity=fjson.get("equity"),
            debt_short=fjson.get("debt_short"),
            debt_long=fjson.get("debt_long"),
            total_debt=fjson.get("total_debt"),
            interest_expense=fjson.get("interest_expense"),
            cash=fjson.get("cash"),
            current_assets=fjson.get("current_assets"),
            current_liabilities=fjson.get("current_liabilities"),
            revenue_growth=fjson.get("revenue_growth"),
            sector=fjson.get("sector"),
            industry=fjson.get("industry"),
            region=fjson.get("region"),
            current_ratio=current_ratio,
            leverage_ratio=leverage_ratio,
            risk_score=enriched.get("risk_score"),
            # Academic metrics from the paper
            roa=academic_metrics.get("roa"),
            leverage_assets=academic_metrics.get("leverage"),
            retained_earnings_ratio=academic_metrics.get("retained_earnings_ratio"),
            net_income_growth_normalized=academic_metrics.get("net_income_growth_normalized")
        )
        db.add(fundamental)
        db.commit()
        log_ingestion("FUNDAMENTALS", 1, fundamentals_data.source, fundamentals_data.ticker)
        
        return {
            "status": "success",
            "message": f"Successfully ingested fundamentals for {fundamentals_data.ticker}",
            "id": fundamental.id,
            "risk_score": enriched.get("risk_score"),
            "academic_metrics": {
                "roa": academic_metrics.get("roa"),
                "leverage": academic_metrics.get("leverage"),
                "revenue_growth": academic_metrics.get("revenue_growth"),
                "retained_earnings_ratio": academic_metrics.get("retained_earnings_ratio"),
                "net_income_growth_normalized": academic_metrics.get("net_income_growth_normalized")
            }
        }
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Manual ingestion failed: {e}")
        return handle_database_error(e, "manual_fundamentals")

@app.post(
    "/manual/stock-prices",
    summary="Manual Stock Price Ingestion",
    description="Manually add stock price data",
    tags=["Manual Ingest"]
)
def manual_ingest_stock_price(price_data: StockPriceCreate, db: Session = Depends(get_db)):
    """Manually ingest stock price data"""
    try:
        stock_price = StockPrice(
            id=str(uuid.uuid4()),
            symbol=price_data.ticker.upper(),  # Store ticker as symbol in DB
            date=price_data.date,
            open=price_data.open,
            close=price_data.close,
            high=price_data.high,
            low=price_data.low,
            volume=price_data.volume,
            source=price_data.source,
            ingested_at=datetime.now(UTC)
        )
        db.add(stock_price)
        db.commit()
        log_ingestion("STOCK_PRICE", 1, price_data.source, price_data.ticker)
        return {
            "status": "success",
            "message": f"Successfully ingested stock price for {price_data.ticker}",
            "id": stock_price.id
        }
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Manual stock price ingestion failed: {e}")
        return handle_database_error(e, "manual_stock_price")

@app.post(
    "/manual/regulatory-filings",
    summary="Manual Filing Ingestion",
    description="Manually add regulatory filing data",
    tags=["Manual Ingest"]
)
def manual_ingest_filing(filing_data: FilingCreate, db: Session = Depends(get_db)):
    """Manually ingest regulatory filing data"""
    try:
        filing = RegulatoryFiling(
            id=str(uuid.uuid4()),
            company=filing_data.company,
            symbol=filing_data.ticker.upper(),  # Store ticker as symbol in DB
            filing_type=filing_data.filing_type,
            filing_date=filing_data.filing_date,
            data=filing_data.data,
            source=filing_data.source,
            ingested_at=datetime.now(UTC)
        )
        db.add(filing)
        db.commit()
        log_ingestion("REGULATORY_FILING", 1, filing_data.source, filing_data.ticker)
        return {
            "status": "success",
            "message": f"Successfully ingested filing for {filing_data.ticker}",
            "id": filing.id
        }
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Manual filing ingestion failed: {e}")
        return handle_database_error(e, "manual_filing")

# Legacy endpoints for backward compatibility
@app.post(
    "/company_fundamentals/",
    summary="Ingest fundamentals (Legacy)",
    description="Store company fundamentals JSON + populate risk columns - Legacy endpoint",
    tags=["Manual Ingest"]
)
def create_company_fundamentals(cf: CompanyFundamentalsIn, db: Session = Depends(get_db)):
    """Legacy endpoint - use /manual/fundamentals instead"""
    fundamentals_data = FundamentalsCreate(
        company=cf.company,
        ticker=cf.ticker,
        fiscal_year=cf.fiscal_year,
        fiscal_quarter=cf.fiscal_quarter,
        fundamentals=cf.fundamentals,
        source=cf.source
    )
    return manual_ingest_fundamentals(fundamentals_data, db)

@app.get("/company_fundamentals/", summary="List fundamentals (Legacy)", tags=["Data Retrieval"])
def list_company_fundamentals(db: Session = Depends(get_db)):
    """Legacy endpoint - use /fundamentals instead"""
    return db.query(CompanyFundamentals).all()

@app.get("/company_fundamentals/{fundamentals_id}", summary="Get fundamentals (Legacy)", tags=["Data Retrieval"])
def get_company_fundamentals(fundamentals_id: str, db: Session = Depends(get_db)):
    """Legacy endpoint - use /fundamentals/{ticker} instead"""
    fundamentals = db.query(CompanyFundamentals).filter(CompanyFundamentals.id == fundamentals_id).first()
    if not fundamentals:
        raise HTTPException(status_code=404, detail="Company fundamentals not found")
    return fundamentals

# Advanced ingestion endpoints from old file
@app.post(
    "/ingest/credit_features/{ticker}",
    response_model=IngestionResponse,
    summary="Ingest Yahoo credit data (Legacy)",
    description="Fetch + store fundamentals & recent prices - Legacy endpoint",
    tags=["Auto Fetch & Store"]
)
def ingest_credit_features(ticker: str = Path(..., min_length=1, max_length=10, description="Stock ticker symbol"),
                          db: Session = Depends(get_db)):
    """Legacy endpoint - use /ingest/yahoo/{ticker} instead"""
    return ingest_yahoo_fundamentals(ticker, db)

# System Status and Health Check Endpoints
@app.get(
    "/health",
    summary="Health Check",
    description="API and database status check.",
    tags=["System"]
)
def health_check():
    """System health check endpoint"""
    db = None
    try:
        # Open a DB session
        db = SessionLocal()

        # Execute a simple query to test database connectivity
        result = db.execute(text("SELECT 1")).fetchone()

        return {
            "status": "healthy",
            "timestamp": datetime.now(UTC),
            "database": "connected",
            "api": "running"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "timestamp": datetime.now(UTC),
                "database": "disconnected" if db is None else "error",
                "api": "running",
                "error": str(e)
            }
        )
    finally:
        if db:
            db.close()

# System Statistics and Configuration Endpoints
@app.get(
    "/stats",
    summary="Database Statistics",
    description="Get statistics about stored data",
    tags=["System"]
)
def get_stats(db: Session = Depends(get_db)):
    """Get database statistics"""
    try:
        stats = {
            "fundamentals_count": db.query(CompanyFundamentals).count(),
            "stock_prices_count": db.query(StockPrice).count(),
            "economic_indicators_count": db.query(EconomicIndicator).count(),
            "regulatory_filings_count": db.query(RegulatoryFiling).count(),
            "unique_tickers": db.query(CompanyFundamentals.symbol).distinct().count(),
            "data_sources": Config.SOURCES,
            "timestamp": datetime.now(UTC)
        }
        return stats
    except Exception as e:
        logger.error(f"❌ Stats retrieval failed: {e}")
        return handle_database_error(e, "get_stats")

@app.get(
    "/config",
    summary="API Configuration",
    description="Get API configuration information",
    tags=["System"]
)
def get_config():
    """Get API configuration"""
    return {
        "db_type": Config.DB_TYPE,
        "sources": Config.SOURCES,
        "socket_io_port": Config.SOCKET_IO_PORT,
        "version": "1.0.0",
        "timestamp": datetime.now(UTC)
    }

@app.get("/db_creds", tags=["System"])
def get_db_creds():
    """Get database credentials info"""
    return {
        "db_url": Config.DB_URL,
        "db_type": Config.DB_TYPE
    }

# Additional legacy endpoints
@app.get("/regulatory_filings/", summary="List regulatory filings (Legacy)", tags=["Data Retrieval"])
def list_reg_filings(db: Session = Depends(get_db)):
    """Legacy endpoint - use /regulatory-filings instead"""
    return db.query(RegulatoryFiling).all()

@app.get("/regulatory_filings/{filing_id}", summary="Get regulatory filing (Legacy)", tags=["Data Retrieval"])
def get_reg_filing(filing_id: str, db: Session = Depends(get_db)):
    """Legacy endpoint - use /regulatory-filings instead"""
    rf = db.query(RegulatoryFiling).filter(RegulatoryFiling.id == filing_id).first()
    if not rf:
        raise HTTPException(status_code=404, detail="Filing not found")
    return rf

@app.get("/economic_indicators/", summary="List economic indicators (Legacy)", tags=["Data Retrieval"])
def list_economic_indicators(db: Session = Depends(get_db)):
    """Legacy endpoint - use /economic-indicators instead"""
    return db.query(EconomicIndicator).all()

@app.get("/economic_indicators/{indicator_id}", summary="Get economic indicator (Legacy)", tags=["Data Retrieval"])
def get_economic_indicator(indicator_id: str, db: Session = Depends(get_db)):
    """Legacy endpoint - use /economic-indicators instead"""
    ei = db.query(EconomicIndicator).filter(EconomicIndicator.id == indicator_id).first()
    if not ei:
        raise HTTPException(status_code=404, detail="Indicator not found")
    return ei

# Mount the Socket.IO app
app.mount("/socket.io", socketio_app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
