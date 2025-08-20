"""
Sample Yahoo Finance ingestion script (mocked)
"""
from storage import SessionLocal
from models import StockPrice
import datetime
from datetime import UTC

def ingest_yahoo_finance(symbol: str):
    session = SessionLocal()
    try:
        price = StockPrice(
            symbol=symbol,
            date=datetime.datetime.now(UTC),
            open=150.0,
            close=155.0,
            high=156.0,
            low=149.0,
            volume=1000000,
            source="YahooFinance",
            ingested_at=datetime.datetime.now(UTC)
        )
        session.add(price)
        session.commit()
        print(f"✅ Ingested Yahoo Finance price for {symbol}")
    except Exception as e:
        session.rollback()
        print(f"❌ Error ingesting {symbol}: {e}")
    finally:
        session.close()
