import asyncio
import logging
import yfinance as yf
from datetime import datetime
from typing import Any, Sequence
from collections.abc import Sequence as SequenceABC
from mcp.server import Server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
    LoggingLevel
)
from pydantic import AnyUrl
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("yfinance-server")

# Default settings
DEFAULT_SYMBOL = "AAPL"

app = Server("yfinance-server")

async def fetch_stock_info(symbol: str) -> dict[str, Any]:
    """Fetch current stock information."""
    try:
        stock = yf.Ticker(symbol)
        info = stock.info
        return info
    except Exception as e:
        logger.error(f"Error fetching stock info for {symbol}: {e}")
        return {}

async def fetch_historical_data(symbol: str, period: str = "1mo") -> dict:
    """Fetch historical stock data."""
    try:
        stock = yf.Ticker(symbol)
        hist = stock.history(period=period)
        
        # Convert to JSON-serializable format
        return {
            "symbol": symbol,
            "period": period,
            "data": hist.to_dict('records'),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching historical data for {symbol}: {e}")
        return {}

@app.list_resources()
async def list_resources() -> list[Resource]:
    """List available financial resources."""
    uri = AnyUrl(f"finance://{DEFAULT_SYMBOL}/info")
    return [
        Resource(
            uri=uri,
            name=f"Current stock information for {DEFAULT_SYMBOL}",
            mimeType="application/json",
            description="Real-time stock market data"
        )
    ]

@app.read_resource()
async def read_resource(uri: AnyUrl) -> str:
    """Read current stock information."""
    symbol = DEFAULT_SYMBOL
    if str(uri).startswith("finance://") and str(uri).endswith("/info"):
        # Extract symbol from URI like finance://AAPL/info
        parts = str(uri).split("://")[1].split("/")
        if len(parts) >= 1:
            symbol = parts[0]
    
    try:
        info = await fetch_stock_info(symbol)
        return json.dumps(info, indent=2)
    except Exception as e:
        logger.error(f"Error reading resource for {symbol}: {e}")
        return json.dumps({"error": str(e)})

@app.list_tools()
async def list_tools() -> list[Tool]:
    """List available financial tools."""
    return [
        Tool(
            name="get_stock_metric",
            description="Get specific metric for a stock symbol",
            inputSchema={
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol (e.g., AAPL, GOOGL)"
                    },
                    "metric": {
                        "type": "string",
                        "description": "Metric to retrieve",
                        "enum": ["currentPrice", "marketCap", "debtToEquity", "currentRatio", "totalDebt", "totalCash", "sector", "industry"]
                    }
                },
                "required": ["symbol", "metric"]
            }
        ),
        Tool(
            name="get_historical_data",
            description="Get historical stock data for a symbol",
            inputSchema={
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol"
                    },
                    "period": {
                        "type": "string",
                        "description": "Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)",
                        "enum": ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"]
                    }
                },
                "required": ["symbol", "period"]
            }
        ),
        Tool(
            name="get_credit_metrics",
            description="Get credit-relevant financial metrics for a company",
            inputSchema={
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol"
                    }
                },
                "required": ["symbol"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: Any) -> Sequence[TextContent | ImageContent | EmbeddedResource]:
    """Handle tool calls."""
    try:
        if name == "get_stock_metric":
            symbol = arguments.get("symbol", "AAPL")
            metric = arguments.get("metric", "currentPrice")
            
            info = await fetch_stock_info(symbol)
            value = info.get(metric, "Not available")
            
            result = f"{metric} for {symbol}: {value}"
            return [TextContent(type="text", text=result)]
        
        elif name == "get_historical_data":
            symbol = arguments.get("symbol", "AAPL")
            period = arguments.get("period", "1mo")
            
            data = await fetch_historical_data(symbol, period)
            result = json.dumps(data, indent=2)
            return [TextContent(type="text", text=result)]
        
        elif name == "get_credit_metrics":
            symbol = arguments.get("symbol", "AAPL")
            info = await fetch_stock_info(symbol)
            
            credit_metrics = {
                "symbol": symbol,
                "company": info.get("longName", "N/A"),
                "sector": info.get("sector", "N/A"),
                "debtToEquity": info.get("debtToEquity", "N/A"),
                "currentRatio": info.get("currentRatio", "N/A"),
                "quickRatio": info.get("quickRatio", "N/A"),
                "totalDebt": info.get("totalDebt", "N/A"),
                "totalCash": info.get("totalCash", "N/A"),
                "profitMargins": info.get("profitMargins", "N/A"),
                "returnOnEquity": info.get("returnOnEquity", "N/A"),
                "overallRisk": info.get("overallRisk", "N/A")
            }
            
            result = json.dumps(credit_metrics, indent=2)
            return [TextContent(type="text", text=result)]
        
        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]
            
    except Exception as e:
        logger.error(f"Error in tool call {name}: {e}")
        return [TextContent(type="text", text=f"Error: {str(e)}")]

async def main():
    """Run the MCP server."""
    from mcp.server.stdio import stdio_server

    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream, 
            write_stream, 
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())