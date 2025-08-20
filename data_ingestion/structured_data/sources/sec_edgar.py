import requests
import feedparser

def fetch_sec_filings(ticker):
    print("Trying to fetch SEC filings for ticker:", ticker)

    rss_url = (
        f"https://www.sec.gov/cgi-bin/browse-edgar"
        f"?action=getcompany&CIK={ticker}&type=&dateb=&owner=exclude&count=10&output=atom"
    )

    headers = {
        # SEC requirement: must identify yourself
        "User-Agent": "CredTech/1.0 (sumitsaw326@gmail.com)",
        "Accept-Encoding": "gzip, deflate",
        "Host": "www.sec.gov",
    }

    response = requests.get(rss_url, headers=headers)
    response.raise_for_status()

    feed = feedparser.parse(response.content)

    filings = []
    for entry in feed.entries:
        filings.append({
            "title": entry.get("title"),
            "summary": entry.get("summary"),
            "filing_date": entry.get("updated"),
            "link": entry.get("link")
        })

    return {
        "ticker": ticker,
        "filings": filings[:5]
    }


if __name__ == "__main__":
    result = fetch_sec_filings("AAPL")
    print(result)
