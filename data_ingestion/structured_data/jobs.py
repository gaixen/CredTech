"""
Sample scheduled ingestion job
"""
import time
from sources.yahoo_finance import ingest_yahoo_finance

def run_jobs():
    while True:
        ingest_yahoo_finance("AAPL")
        time.sleep(3600)  # Run every hour

if __name__ == "__main__":
    run_jobs()
