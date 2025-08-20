from sqlalchemy import Column, String, Integer, Float, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class FinancialStatement(Base):
    __tablename__ = "financial_statements"
    id = Column(String, primary_key=True)
    company = Column(String)
    symbol = Column(String)
    fiscal_year = Column(Integer)
    fiscal_quarter = Column(String)
    statement_type = Column(String)  # e.g., balance_sheet, income_statement
    data = Column(JSON)
    source = Column(String)
    ingested_at = Column(DateTime)

class StockPrice(Base):
    __tablename__ = "stock_prices"
    id = Column(String, primary_key=True)
    symbol = Column(String)
    date = Column(DateTime)
    open = Column(Float)
    close = Column(Float)
    high = Column(Float)
    low = Column(Float)
    volume = Column(Float)
    source = Column(String)
    ingested_at = Column(DateTime)

class CompanyFundamentals(Base):
    __tablename__ = "company_fundamentals"
    id = Column(String, primary_key=True)
    company = Column(String)
    symbol = Column(String)
    fiscal_year = Column(Integer)
    fiscal_quarter = Column(String)
    fundamentals = Column(JSON)
    source = Column(String)
    ingested_at = Column(DateTime)
    # Explicit risk-related fields (nullable for backward compatibility)
    total_revenue = Column(Float)
    net_income = Column(Float)
    free_cash_flow = Column(Float)
    total_assets = Column(Float)
    total_liabilities = Column(Float)
    equity = Column(Float)
    debt_short = Column(Float)
    debt_long = Column(Float)
    total_debt = Column(Float)
    interest_expense = Column(Float)
    cash = Column(Float)
    current_assets = Column(Float)
    current_liabilities = Column(Float)
    revenue_growth = Column(Float)
    sector = Column(String)
    industry = Column(String)
    region = Column(String)
    current_ratio = Column(Float)
    leverage_ratio = Column(Float)
    risk_score = Column(Float)

class EconomicIndicator(Base):
    __tablename__ = "economic_indicators"
    id = Column(String, primary_key=True)
    indicator_name = Column(String)
    value = Column(Float)
    date = Column(DateTime)
    country = Column(String)
    source = Column(String)
    ingested_at = Column(DateTime)

class CreditRating(Base):
    __tablename__ = "credit_ratings"
    id = Column(String, primary_key=True)
    entity = Column(String)
    symbol = Column(String)
    rating = Column(String)
    agency = Column(String)
    rating_date = Column(DateTime)
    outlook = Column(String)
    source = Column(String)
    ingested_at = Column(DateTime)

class RegulatoryFiling(Base):
    __tablename__ = "regulatory_filings"
    id = Column(String, primary_key=True)
    company = Column(String)
    symbol = Column(String)
    filing_type = Column(String)
    filing_date = Column(DateTime)
    data = Column(JSON)
    source = Column(String)
    ingested_at = Column(DateTime)
