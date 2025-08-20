"""
Configuration for structured data ingestion
"""
import os

class Config:
    DB_TYPE = os.getenv("DB_TYPE", "postgres")
    DB_URL = os.getenv("DB_URL", "postgresql://credtech:cred123@localhost/credtech_structured")
    SOURCES = [
        "SEC_EDGAR", "YahooFinance", "FRED", "WorldBank", "Morningstar", "Quandl", "S&P", "Moody's", "Fitch"
    ]
    SOCKET_IO_PORT = int(os.getenv("SOCKET_IO_PORT", 5001))
    # Add more config as needed
