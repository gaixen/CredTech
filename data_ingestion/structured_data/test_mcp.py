import asyncio
import json
import yfinance as yf
from yf import app, fetch_stock_info

async def test_server():

    """MCP SERVER TESTING"""
    
    # fetch stock info properly
    print("Testing stock info fetch...")
    try:
        info = await fetch_stock_info("AAPL")
        print(f"✅ Stock info for AAPL: {info.get('longName', 'N/A')}")
        print(f"   Current Price: ${info.get('currentPrice', 'N/A')}")
        print(f"   Market Cap: ${info.get('marketCap', 'N/A'):,}")
    except Exception as e:
        print(f"❌ Error fetching stock info: {e}")
    
    # Test 2: List resources
    print("\nTesting resources...")
    try:
        stock = yf.Ticker("AAPL")
        info = stock.info
        hist = stock.history(period="5d")
        print(f"✅ Direct yfinance test successful")
        print(f"   Company: {info.get('longName', 'N/A')}")
        print(f"   Sector: {info.get('sector', 'N/A')}")
        print(f"   Recent close price: ${hist['Close'].iloc[-1]:.2f}")
    except Exception as e:
        print(f"❌ Error with direct finance : {e}")
    
    # Test 3: List tools
    print("\nTesting multiple symbols...")
    symbols = ["AAPL", "GOOGL", "MSFT", "TSLA"]
    for symbol in symbols:
        try:
            info = await fetch_stock_info(symbol)
            print(f"✅ {symbol}: {info.get('longName', 'N/A')} - ${info.get('currentPrice', 'N/A')}")
        except Exception as e:
            print(f"❌ Error fetching {symbol}: {e}")
    
    # Test 4: Call a tool
    print("\nTesting credit-relevant metrics...")
    try:
        info = await fetch_stock_info("AAPL")
        metrics = {
            "Debt to Equity": info.get('debtToEquity', 'N/A'),
            "Current Ratio": info.get('currentRatio', 'N/A'),
            "Quick Ratio": info.get('quickRatio', 'N/A'),
            "Total Debt": info.get('totalDebt', 'N/A'),
            "Total Cash": info.get('totalCash', 'N/A'),
            "Return on Equity": info.get('returnOnEquity', 'N/A'),
            "Profit Margins": info.get('profitMargins', 'N/A')
        }
        
        print("✅ Credit metrics for AAPL:")
        for metric, value in metrics.items():
            if isinstance(value, (int, float)) and value > 1000000:
                print(f"   {metric}: ${value:,.0f}")
            else:
                print(f"   {metric}: {value}")
                
    except Exception as e:
        print(f"❌ Error fetching credit metrics: {e}")

if __name__ == "__main__":
    asyncio.run(test_server())