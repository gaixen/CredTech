import yfinance as yf
import pandas as pd
from datetime import datetime

def fetch_credit_features(ticker_symbol):
    ticker = yf.Ticker(ticker_symbol)
    hist = ticker.history(period="1y", interval="1d", auto_adjust=True)
    hist = hist[["Close", "Volume"]].reset_index()
    info = ticker.info

    # Extract required metrics with safe .get fallback
    fundamentals = {
        "ticker": ticker_symbol,
        # Core profitability & cash flow
        "total_revenue": info.get("totalRevenue"),
        "net_income": info.get("netIncomeToCommon") or info.get("netIncome"),
        "free_cash_flow": info.get("freeCashflow"),
        # Balance sheet structure
        "total_assets": info.get("totalAssets"),
        "total_liabilities": info.get("totalLiab"),
        "equity": info.get("totalStockholderEquity"),
        # Debt & interest
        "debt_short": info.get("shortLongTermDebt") or info.get("shortTermDebt"),
        "debt_long": info.get("longTermDebt"),
        "total_debt": info.get("totalDebt"),
        "interest_expense": info.get("interestExpense"),
        # Liquidity
        "cash": info.get("cash"),
        "current_assets": info.get("totalCurrentAssets"),
        "current_liabilities": info.get("totalCurrentLiabilities"),
        # Ratios / growth
        "debt_to_equity": info.get("debtToEquity"),
        "revenue_growth": info.get("revenueGrowth"),  # Typically YoY from Yahoo
        # Classification / geography
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "region": info.get("country"),
        # Timestamp
        "updated_at": datetime.utcnow().isoformat()
    }

    # Compute derived metrics if possible
    try:
        if fundamentals.get("total_revenue") and fundamentals.get("revenue_growth") is None:
            # No direct growth metric provided; attempt to approximate from trailing figures if available
            pass  # Placeholder: could implement historical revenue pull if needed
    except Exception:
        pass

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
