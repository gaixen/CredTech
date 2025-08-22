"""
Real-time Candlestick Chart API for Frontend Integration
Provides OHLCV data and real-time updates for financial charts
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker
from storage import SessionLocal, engine
from models import StockPrice, CompanyFundamentals
from sources.yahoo_finance_features import fetch_stock_price_data
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import json
import asyncio
import uvicorn

app = FastAPI(title="CredTech Candlestick API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    """Manage WebSocket connections for real-time updates"""
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.get("/api/candlestick/{symbol}")
async def get_candlestick_data(
    symbol: str, 
    period: str = "1y",
    interval: str = "1d"
):
    """
    Get historical candlestick data for a symbol
    Args:
        symbol: Stock ticker symbol
        period: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y)
        interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)
    """
    try:
        symbol = symbol.upper()
        
        # First try to get data from database
        db = SessionLocal()
        
        # Calculate date range based on period
        end_date = datetime.now()
        if period == "1d":
            start_date = end_date - timedelta(days=1)
        elif period == "5d":
            start_date = end_date - timedelta(days=5)
        elif period == "1mo":
            start_date = end_date - timedelta(days=30)
        elif period == "3mo":
            start_date = end_date - timedelta(days=90)
        elif period == "6mo":
            start_date = end_date - timedelta(days=180)
        elif period == "1y":
            start_date = end_date - timedelta(days=365)
        elif period == "2y":
            start_date = end_date - timedelta(days=730)
        elif period == "5y":
            start_date = end_date - timedelta(days=1825)
        else:
            start_date = end_date - timedelta(days=365)
        
        # Query database
        db_data = db.query(StockPrice).filter(
            StockPrice.symbol == symbol,
            StockPrice.date >= start_date
        ).order_by(StockPrice.date).all()
        
        db.close()
        
        # If we have recent data in database, use it
        if db_data and len(db_data) > 10:
            candlestick_data = []
            for record in db_data:
                candlestick_data.append({
                    "date": record.date.isoformat(),
                    "open": record.open,
                    "high": record.high,
                    "low": record.low,
                    "close": record.close,
                    "volume": record.volume
                })
            
            return {
                "symbol": symbol,
                "period": period,
                "interval": interval,
                "data": candlestick_data,
                "source": "database",
                "last_updated": db_data[-1].ingested_at.isoformat() if db_data else None
            }
        
        # Otherwise fetch fresh data from Yahoo Finance
        fresh_data = fetch_stock_price_data(symbol, period)
        
        if fresh_data.get("error"):
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")
        
        return {
            "symbol": symbol,
            "period": period,
            "interval": interval,
            "data": fresh_data["data"],
            "source": "yahoo_finance",
            "company_name": fresh_data.get("company_name"),
            "sector": fresh_data.get("sector"),
            "market_cap": fresh_data.get("market_cap"),
            "current_price": fresh_data.get("current_price"),
            "last_updated": fresh_data.get("fetched_at")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/companies")
async def get_available_companies():
    """Get list of companies with available data"""
    try:
        db = SessionLocal()
        
        # Get unique symbols from both fundamentals and price data
        fundamentals_symbols = db.query(CompanyFundamentals.symbol).distinct().all()
        price_symbols = db.query(StockPrice.symbol).distinct().all()
        
        # Combine and get company details
        all_symbols = set([s[0] for s in fundamentals_symbols] + [s[0] for s in price_symbols])
        
        companies = []
        for symbol in all_symbols:
            company_info = db.query(CompanyFundamentals).filter_by(symbol=symbol).first()
            if company_info:
                companies.append({
                    "symbol": symbol,
                    "company": company_info.company,
                    "sector": company_info.sector,
                    "has_fundamentals": True,
                    "has_price_data": symbol in [s[0] for s in price_symbols]
                })
        
        db.close()
        return {"companies": companies}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/realtime/{symbol}")
async def websocket_endpoint(websocket: WebSocket, symbol: str):
    """WebSocket endpoint for real-time price updates"""
    symbol = symbol.upper()
    await manager.connect(websocket)
    
    try:
        while True:
            # Fetch latest data every 30 seconds (adjust based on needs)
            fresh_data = fetch_stock_price_data(symbol, period="1d")
            
            if not fresh_data.get("error") and fresh_data.get("data"):
                # Send latest price point
                latest_data = fresh_data["data"][-1] if fresh_data["data"] else None
                if latest_data:
                    await manager.send_personal_message(json.dumps({
                        "symbol": symbol,
                        "latest_price": latest_data,
                        "timestamp": datetime.now().isoformat()
                    }), websocket)
            
            await asyncio.sleep(30)  # Update every 30 seconds
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@app.get("/api/market-overview")
async def get_market_overview():
    """Get market overview with key metrics"""
    try:
        db = SessionLocal()
        
        # Get latest data for all companies
        companies = db.query(CompanyFundamentals.symbol).distinct().all()
        overview = []
        
        for (symbol,) in companies:
            # Get latest fundamentals
            latest_fundamentals = db.query(CompanyFundamentals).filter_by(
                symbol=symbol
            ).order_by(CompanyFundamentals.ingested_at.desc()).first()
            
            # Get latest price
            latest_price = db.query(StockPrice).filter_by(
                symbol=symbol
            ).order_by(StockPrice.date.desc()).first()
            
            if latest_fundamentals:
                overview.append({
                    "symbol": symbol,
                    "company": latest_fundamentals.company,
                    "sector": latest_fundamentals.sector,
                    "current_price": latest_price.close if latest_price else None,
                    "market_cap": latest_fundamentals.fundamentals.get("market_cap") if latest_fundamentals.fundamentals else None,
                    "roa": latest_fundamentals.roa,
                    "roe": latest_fundamentals.roe,
                    "leverage_ratio": latest_fundamentals.leverage_ratio,
                    "last_updated": latest_fundamentals.ingested_at.isoformat()
                })
        
        db.close()
        return {"market_overview": overview}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
