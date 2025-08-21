import requests
import feedparser
import os
from datetime import datetime
from typing import List, Dict, Any

SEC_USER_AGENT = os.getenv("SEC_USER_AGENT", "CredTech/1.0 (contact@credtech.com)")

def fetch_sec_filings(symbol: str) -> List[Dict[str, Any]]:
    """
    Fetch SEC EDGAR filings for a given ticker symbol.

    Args:
        symbol: The ticker symbol (e.g., 'GOOGL', 'AAPL')

    Returns:
        List of filing dictionaries with standardized structure
    """
    try:
        print(f"Fetching SEC filings for symbol: {symbol}")

        # SEC EDGAR RSS feed URL
        rss_url = (
            f"https://www.sec.gov/cgi-bin/browse-edgar"
            f"?action=getcompany&CIK={symbol}&type=&dateb=&owner=exclude&count=10&output=atom"
        )

        headers = {
            # SEC requirement: must identify yourself with a descriptive User-Agent including email
            "User-Agent": SEC_USER_AGENT,
            "Accept-Encoding": "gzip, deflate",
            "Host": "www.sec.gov",
        }

        response = requests.get(rss_url, headers=headers, timeout=30)
        response.raise_for_status()

        # Parse the RSS feed
        feed = feedparser.parse(response.content)

        filings = []
        for entry in feed.entries:
            filing_data = {
                "title": entry.get("title", ""),
                "summary": entry.get("summary", ""),
                "link": entry.get("link", ""),
                "filing_date": entry.get("published", ""),
                "company": symbol,
                "filing_type": extract_filing_type(entry.get("title", "")),
                "raw_entry": {
                    "id": entry.get("id", ""),
                    "updated": entry.get("updated", ""),
                    "category": getattr(entry, 'category', ''),
                }
            }
            filings.append(filing_data)

        print(f"Successfully fetched {len(filings)} SEC filings for {symbol}")
        return filings

    except requests.exceptions.RequestException as e:
        print(f"Error fetching SEC filings for {symbol}: {e}")
        return []
    except Exception as e:
        print(f"Unexpected error fetching SEC filings for {symbol}: {e}")
        return []

def extract_filing_type(title: str) -> str:
    """Extract filing type from the title string."""
    if not title:
        return "Unknown"

    # Common SEC filing types
    filing_types = ["10-K", "10-Q", "8-K", "DEF 14A", "13F", "4", "3", "5", "SC 13G", "SC 13D"]

    title_upper = title.upper()
    for filing_type in filing_types:
        if filing_type in title_upper:
            return filing_type

    # Try to extract from common patterns
    if "FORM" in title_upper:
        parts = title_upper.split("FORM")
        if len(parts) > 1:
            form_part = parts[1].strip().split()[0]
            return form_part

    return "Other"

def get_company_cik(symbol: str) -> str:
    """
    Get the CIK (Central Index Key) for a company symbol.
    This is a placeholder - in production you'd want to use SEC's company tickers JSON.
    """
    # For now, just return the symbol - SEC API can handle ticker symbols
    return symbol


if __name__ == "__main__":
    result = fetch_sec_filings("AAPL")
    print(result)
