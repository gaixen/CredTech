import yfinance as yf
from datetime import datetime
from typing import Dict


def fetch_credit_features(ticker_symbol: str) -> Dict:
    ticker = yf.Ticker(ticker_symbol)
    hist = ticker.history(period="1y", interval="1d", auto_adjust=True)
    hist = hist[["Close", "Volume"]].reset_index()
    info = ticker.info
    total_revenue = info.get("totalRevenue")
    total_debt = info.get("totalDebt")
    debt_to_equity = info.get("debtToEquity")
    fundamentals = {
        "ticker": ticker_symbol,
        "total_revenue": total_revenue,
        "total_debt": total_debt,
        "debt_to_equity": debt_to_equity,
        "updated_at": datetime.utcnow().isoformat()
    }
    market_data = []
    for _, row in hist.iterrows():
        market_data.append({
            "date": row["Date"].strftime("%Y-%m-%d"),
            "ticker": ticker_symbol,
            "close_price": round(row["Close"], 2),
            "volume": int(row["Volume"])
        })
    result = {
        "fundamentals": fundamentals,
        "market_data": market_data[-5:]
    }
    return result

