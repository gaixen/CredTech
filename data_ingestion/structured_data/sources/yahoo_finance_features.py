import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def fetch_stock_price_data(ticker_symbol: str, period: str = "5y") -> Dict:
    """
    Fetch historical stock price data for candlestick charts
    Args:
        ticker_symbol: Stock ticker
        period: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
    Returns:
        Dict with OHLCV data and metadata
    """
    try:
        ticker = yf.Ticker(ticker_symbol)
        
        # Fetch historical price data
        hist = ticker.history(period=period, interval="1d", auto_adjust=True)
        
        if hist.empty:
            logger.warning(f"No price data found for {ticker_symbol}")
            return {"error": f"No price data for {ticker_symbol}"}
        
        # Convert to list of dictionaries for frontend consumption
        price_data = []
        for date, row in hist.iterrows():
            price_data.append({
                "date": date.isoformat(),
                "open": float(row["Open"]) if pd.notna(row["Open"]) else None,
                "high": float(row["High"]) if pd.notna(row["High"]) else None,
                "low": float(row["Low"]) if pd.notna(row["Low"]) else None,
                "close": float(row["Close"]) if pd.notna(row["Close"]) else None,
                "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else None,
            })
        
        # Get basic company info
        info = ticker.info
        
        return {
            "symbol": ticker_symbol,
            "period": period,
            "data": price_data,
            "company_name": info.get("longName", ticker_symbol),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "market_cap": info.get("marketCap"),
            "current_price": info.get("currentPrice"),
            "fetched_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching price data for {ticker_symbol}: {e}")
        return {"error": str(e)}


def fetch_credit_features(ticker_symbol: str) -> Dict:
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
        "retained_earnings": info.get("retainedEarnings"),  # Added retained earnings
        # Debt & interest
        "debt_short": info.get("shortLongTermDebt") or info.get("shortTermDebt"),
        "debt_long": info.get("longTermDebt"),
        "total_debt": info.get("totalDebt"),
        "interest_expense": info.get("interestExpense"),
        # Liquidity
        "cash": info.get("cash"),
        "current_assets": info.get("totalCurrentAssets"),
        "current_liabilities": info.get("totalCurrentLiabilities"),
        # Ratios / growth - Use Yahoo's pre-calculated values when available
        "debt_to_equity": info.get("debtToEquity"),
        "current_ratio": info.get("currentRatio"),
        "quick_ratio": info.get("quickRatio"),
        "return_on_assets": info.get("returnOnAssets"),  # Pre-calculated ROA
        "return_on_equity": info.get("returnOnEquity"),  # Pre-calculated ROE
        "gross_margins": info.get("grossMargins"),
        "profit_margins": info.get("profitMargins"),
        "revenue_growth": info.get("revenueGrowth"),  # Typically YoY from Yahoo
        "earnings_growth": info.get("earningsGrowth"),  # Added earnings growth
        "net_income_growth": info.get("earningsGrowth"),  # Use earnings growth as proxy for net income growth
        # Classification / geography
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "region": info.get("country"),
        # Timestamp
        "updated_at": datetime.utcnow().isoformat()
    }

    # Compute derived metrics if possible
    try:
        # Calculate missing balance sheet items from available ratios
        market_cap = info.get("marketCap")
        
        # If we have D/E ratio and total debt, we can estimate equity and total assets
        if fundamentals["debt_to_equity"] and fundamentals["total_debt"]:
            # D/E = Total Debt / Equity, so Equity = Total Debt / (D/E / 100)
            estimated_equity = fundamentals["total_debt"] / (fundamentals["debt_to_equity"] / 100)
            if not fundamentals["equity"]:
                fundamentals["equity"] = estimated_equity
        
        # If we have ROA and net income, we can estimate total assets
        if fundamentals["return_on_assets"] and fundamentals["net_income"]:
            # ROA = Net Income / Total Assets, so Total Assets = Net Income / ROA
            estimated_total_assets = fundamentals["net_income"] / fundamentals["return_on_assets"]
            if not fundamentals["total_assets"]:
                fundamentals["total_assets"] = estimated_total_assets
        
        # If we have equity and total debt, we can estimate total assets
        if fundamentals["equity"] and fundamentals["total_debt"] and not fundamentals["total_assets"]:
            # Total Assets = Equity + Total Liabilities (approximated by total debt)
            fundamentals["total_assets"] = fundamentals["equity"] + fundamentals["total_debt"]
        
        # If we have total assets and equity, we can estimate total liabilities
        if fundamentals["total_assets"] and fundamentals["equity"] and not fundamentals["total_liabilities"]:
            fundamentals["total_liabilities"] = fundamentals["total_assets"] - fundamentals["equity"]
        
        # If we have current ratio and current liabilities, estimate current assets
        if fundamentals["current_ratio"] and fundamentals["current_liabilities"]:
            fundamentals["current_assets"] = fundamentals["current_ratio"] * fundamentals["current_liabilities"]
        
        # If we have current assets and current ratio, estimate current liabilities
        if fundamentals["current_assets"] and fundamentals["current_ratio"] and not fundamentals["current_liabilities"]:
            fundamentals["current_liabilities"] = fundamentals["current_assets"] / fundamentals["current_ratio"]
            
        logger.info(f"Enhanced {ticker_symbol} data: assets={fundamentals.get('total_assets')}, equity={fundamentals.get('equity')}")
        
    except Exception as e:
        logger.warning(f"Error calculating derived metrics for {ticker_symbol}: {e}")
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


def fetch_historical_fundamentals(ticker_symbol: str, years: int = 5) -> Dict:
    """
    Fetch historical quarterly fundamentals for panel data analysis
    Following academic requirements for panel regression models
    
    Args:
        ticker_symbol: Stock ticker symbol
        years: Number of years of historical data to fetch
        
    Returns:
        Dictionary with quarterly panel data structure
    """
    logger.info(f"Fetching {years} years of historical data for {ticker_symbol}")
    
    try:
        ticker = yf.Ticker(ticker_symbol)
        
        # Get quarterly financial statements
        quarterly_financials = ticker.quarterly_financials.T  # Transpose for time series
        quarterly_balance_sheet = ticker.quarterly_balance_sheet.T
        quarterly_cashflow = ticker.quarterly_cashflow.T
        
        # Get historical market data
        hist = ticker.history(period=f"{years}y", interval="1d")
        
        # Get company info for sector/industry
        info = ticker.info
        
        quarterly_data = []
        
        # Process each quarter's data
        for quarter_date in quarterly_financials.index:
            if pd.isna(quarter_date):
                continue
                
            # Convert timezone-aware datetime to naive for comparison
            if hasattr(quarter_date, 'tz') and quarter_date.tz is not None:
                quarter_date = quarter_date.tz_localize(None)
                
            # Check if this quarter is within our date range
            current_date = pd.Timestamp.now().tz_localize(None)
            years_ago = current_date - pd.DateOffset(years=years)
            
            if quarter_date < years_ago:
                continue
                
            quarter_str = f"{quarter_date.year}Q{quarter_date.quarter}"
            
            # Extract quarterly financials
            qf = quarterly_financials.loc[quarter_date]
            qbs = quarterly_balance_sheet.loc[quarter_date] if quarter_date in quarterly_balance_sheet.index else pd.Series()
            qcf = quarterly_cashflow.loc[quarter_date] if quarter_date in quarterly_cashflow.index else pd.Series()
            
            # Calculate academic metrics for this quarter
            total_assets = qbs.get('Total Assets', qbs.get('TotalAssets'))
            total_revenue = qf.get('Total Revenue', qf.get('TotalRevenue'))
            net_income = qf.get('Net Income', qf.get('NetIncome'))
            total_debt = qbs.get('Total Debt', qbs.get('TotalDebt', 0))
            equity = qbs.get('Total Stockholder Equity', qbs.get('StockholderEquity'))
            retained_earnings = qbs.get('Retained Earnings', qbs.get('RetainedEarnings'))
            current_assets = qbs.get('Current Assets', qbs.get('CurrentAssets'))
            current_liabilities = qbs.get('Current Liabilities', qbs.get('CurrentLiabilities'))
            free_cash_flow = qcf.get('Free Cash Flow', qcf.get('FreeCashFlow'))
            
            # Calculate derived metrics
            roa = (net_income / total_assets * 100) if (net_income and total_assets and total_assets != 0) else None
            leverage = (total_debt / total_assets) if (total_debt and total_assets and total_assets != 0) else None
            retained_earnings_ratio = (retained_earnings / total_assets) if (retained_earnings and total_assets and total_assets != 0) else None
            current_ratio = (current_assets / current_liabilities) if (current_assets and current_liabilities and current_liabilities != 0) else None
            
            # Get market data for this quarter (last day of quarter)
            quarter_end = quarter_date + pd.offsets.QuarterEnd(0)
            
            # Ensure both timestamps are timezone-naive for comparison
            if hasattr(quarter_end, 'tz') and quarter_end.tz is not None:
                quarter_end = quarter_end.tz_localize(None)
            
            # Make sure hist index is also timezone-naive
            hist_index = hist.index
            if hasattr(hist_index, 'tz') and hist_index.tz is not None:
                hist_index = hist_index.tz_localize(None)
                hist_temp = hist.copy()
                hist_temp.index = hist_index
            else:
                hist_temp = hist
                
            quarter_market_data = hist_temp[hist_temp.index <= quarter_end].tail(100)  # Last 100 days for volatility calc
            
            if len(quarter_market_data) > 0:
                # Calculate market-based metrics
                returns = quarter_market_data['Close'].pct_change().dropna()
                equity_return = returns.mean() * 252 * 100 if len(returns) > 0 else None  # Annualized
                equity_volatility = returns.std() * np.sqrt(252) * 100 if len(returns) > 1 else None  # Annualized
                
                # Market value calculations
                shares_outstanding = info.get('sharesOutstanding')
                close_price = quarter_market_data['Close'].iloc[-1]
                equity_value = (shares_outstanding * close_price) if shares_outstanding else None
                debt_value = total_debt if total_debt else 0
            else:
                equity_return = equity_volatility = equity_value = debt_value = None
            
            fundamentals = {
                "ticker": ticker_symbol,
                "date": quarter_date.strftime("%Y-%m-%d"),
                "quarter": quarter_str,
                "fiscal_year": quarter_date.year,
                "fiscal_quarter": quarter_date.quarter,
                
                # Core financial statement items
                "total_revenue": float(total_revenue) if total_revenue and not pd.isna(total_revenue) else None,
                "net_income": float(net_income) if net_income and not pd.isna(net_income) else None,
                "total_assets": float(total_assets) if total_assets and not pd.isna(total_assets) else None,
                "total_debt": float(total_debt) if total_debt and not pd.isna(total_debt) else None,
                "equity": float(equity) if equity and not pd.isna(equity) else None,
                "retained_earnings": float(retained_earnings) if retained_earnings and not pd.isna(retained_earnings) else None,
                "current_assets": float(current_assets) if current_assets and not pd.isna(current_assets) else None,
                "current_liabilities": float(current_liabilities) if current_liabilities and not pd.isna(current_liabilities) else None,
                "free_cash_flow": float(free_cash_flow) if free_cash_flow and not pd.isna(free_cash_flow) else None,
                
                # Academic metrics (Das et al.)
                "roa": roa,
                "leverage": leverage,
                "retained_earnings_ratio": retained_earnings_ratio,
                "current_ratio": current_ratio,
                
                # Market-based features (Bharath & Shumway)
                "equity_return": equity_return,
                "equity_volatility": equity_volatility,
                "equity_value": equity_value,
                "debt_value": debt_value,
                
                # Company classification
                "sector": info.get("sector"),
                "industry": info.get("industry"),
                "region": info.get("country"),
                
                "updated_at": datetime.utcnow().isoformat()
            }
            
            quarterly_data.append(fundamentals)
        
        # Calculate revenue growth for each quarter
        quarterly_data_df = pd.DataFrame(quarterly_data)
        if len(quarterly_data_df) > 1:
            quarterly_data_df = quarterly_data_df.sort_values('date')
            quarterly_data_df['revenue_growth'] = quarterly_data_df['total_revenue'].pct_change() * 100
            quarterly_data_df['net_income_growth'] = quarterly_data_df['net_income'].pct_change() * 100
            
            # Convert back to list of dicts
            quarterly_data = quarterly_data_df.to_dict('records')
        
        logger.info(f"Successfully fetched {len(quarterly_data)} quarters of data for {ticker_symbol}")
        
        return {
            "ticker": ticker_symbol,
            "company_name": info.get("longName", ticker_symbol),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "quarterly_data": quarterly_data,
            "data_points": len(quarterly_data),
            "date_range": {
                "start": quarterly_data[0]["date"] if quarterly_data else None,
                "end": quarterly_data[-1]["date"] if quarterly_data else None
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching historical data for {ticker_symbol}: {e}")
        return {
            "ticker": ticker_symbol,
            "error": str(e),
            "quarterly_data": [],
            "data_points": 0
        }


def build_panel_dataset(symbols: List[str], years: int = 5) -> pd.DataFrame:
    """
    Build panel dataset for academic modeling
    
    Args:
        symbols: List of ticker symbols
        years: Number of years of historical data
        
    Returns:
        Panel DataFrame suitable for academic regression models
    """
    logger.info(f"Building panel dataset for {len(symbols)} companies over {years} years")
    
    panel_data = []
    successful_fetches = 0
    
    for i, symbol in enumerate(symbols):
        logger.info(f"Processing {i+1}/{len(symbols)}: {symbol}")
        
        try:
            hist_data = fetch_historical_fundamentals(symbol, years)
            if hist_data.get('quarterly_data'):
                panel_data.extend(hist_data['quarterly_data'])
                successful_fetches += 1
            else:
                logger.warning(f"No quarterly data found for {symbol}")
                
        except Exception as e:
            logger.error(f"Failed to fetch {symbol}: {e}")
    
    if not panel_data:
        logger.error("No data successfully fetched for any symbol")
        return pd.DataFrame()
    
    panel_df = pd.DataFrame(panel_data)
    
    # Clean and prepare data
    panel_df['date'] = pd.to_datetime(panel_df['date'])
    panel_df = panel_df.sort_values(['ticker', 'date'])
    
    # Add time-based features
    panel_df['year'] = panel_df['date'].dt.year
    panel_df['quarter_num'] = panel_df['date'].dt.quarter
    
    logger.info(f"Panel dataset created: {len(panel_df)} observations from {successful_fetches} companies")
    logger.info(f"Date range: {panel_df['date'].min()} to {panel_df['date'].max()}")
    
    return panel_df


def fetch_multiple_companies_historical(symbols: List[str], years: int = 5) -> Dict:
    """
    Fetch historical data for multiple companies efficiently
    
    Args:
        symbols: List of ticker symbols
        years: Number of years of data
        
    Returns:
        Dictionary with aggregated results
    """
    logger.info(f"Fetching historical data for {len(symbols)} companies")
    
    results = {
        "companies": {},
        "panel_summary": {
            "total_companies": len(symbols),
            "successful_fetches": 0,
            "total_observations": 0,
            "date_range": {"start": None, "end": None}
        }
    }
    
    for symbol in symbols:
        hist_data = fetch_historical_fundamentals(symbol, years)
        results["companies"][symbol] = hist_data
        
        if hist_data.get('quarterly_data'):
            results["panel_summary"]["successful_fetches"] += 1
            results["panel_summary"]["total_observations"] += len(hist_data['quarterly_data'])
            
            # Update date range
            if hist_data.get('date_range'):
                start_date = hist_data['date_range']['start']
                end_date = hist_data['date_range']['end']
                
                if results["panel_summary"]["date_range"]["start"] is None or start_date < results["panel_summary"]["date_range"]["start"]:
                    results["panel_summary"]["date_range"]["start"] = start_date
                    
                if results["panel_summary"]["date_range"]["end"] is None or end_date > results["panel_summary"]["date_range"]["end"]:
                    results["panel_summary"]["date_range"]["end"] = end_date
    
    return results
