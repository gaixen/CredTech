-- Create the credtech role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'credtech') THEN
        CREATE ROLE credtech WITH LOGIN PASSWORD 'cred123';
    END IF;
END
$$;

-- Grant necessary privileges to credtech role
ALTER ROLE credtech CREATEDB;
ALTER ROLE credtech CREATEROLE;

-- Grant all privileges on the database to credtech
GRANT ALL PRIVILEGES ON DATABASE credtech_structured TO credtech;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO credtech;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO credtech;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO credtech;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO credtech;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO credtech;

-- Example table for testing
CREATE TABLE IF NOT EXISTS test_table (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant ownership of the test table to credtech
ALTER TABLE test_table OWNER TO credtech;

-- Create the structured data tables (matching your models.py)
CREATE TABLE IF NOT EXISTS financial_statements (
    id VARCHAR PRIMARY KEY,
    company VARCHAR,
    symbol VARCHAR,
    fiscal_year INTEGER,
    fiscal_quarter VARCHAR,
    statement_type VARCHAR,
    data JSONB,
    source VARCHAR,
    ingested_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS stock_prices (
    id VARCHAR PRIMARY KEY,
    symbol VARCHAR,
    date TIMESTAMP WITH TIME ZONE,
    open REAL,
    close REAL,
    high REAL,
    low REAL,
    volume REAL,
    source VARCHAR,
    ingested_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS company_fundamentals (
    id VARCHAR PRIMARY KEY,
    company VARCHAR,
    symbol VARCHAR,
    fiscal_year INTEGER,
    fiscal_quarter VARCHAR,
    fundamentals JSONB,
    source VARCHAR,
    ingested_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS economic_indicators (
    id VARCHAR PRIMARY KEY,
    indicator_name VARCHAR,
    value REAL,
    date TIMESTAMP WITH TIME ZONE,
    country VARCHAR,
    source VARCHAR,
    ingested_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS credit_ratings (
    id VARCHAR PRIMARY KEY,
    entity VARCHAR,
    symbol VARCHAR,
    rating VARCHAR,
    agency VARCHAR,
    rating_date TIMESTAMP WITH TIME ZONE,
    outlook VARCHAR,
    source VARCHAR,
    ingested_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS regulatory_filings (
    id VARCHAR PRIMARY KEY,
    company VARCHAR,
    symbol VARCHAR,
    filing_type VARCHAR,
    filing_date TIMESTAMP WITH TIME ZONE,
    data JSONB,
    source VARCHAR,
    ingested_at TIMESTAMP WITH TIME ZONE
);

-- Grant ownership of all tables to credtech
ALTER TABLE financial_statements OWNER TO credtech;
ALTER TABLE stock_prices OWNER TO credtech;
ALTER TABLE company_fundamentals OWNER TO credtech;
ALTER TABLE economic_indicators OWNER TO credtech;
ALTER TABLE credit_ratings OWNER TO credtech;
ALTER TABLE regulatory_filings OWNER TO credtech;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_statements_symbol ON financial_statements(symbol);
CREATE INDEX IF NOT EXISTS idx_financial_statements_date ON financial_statements(ingested_at);
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol ON stock_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON stock_prices(date);
CREATE INDEX IF NOT EXISTS idx_company_fundamentals_symbol ON company_fundamentals(symbol);
CREATE INDEX IF NOT EXISTS idx_economic_indicators_country ON economic_indicators(country);
CREATE INDEX IF NOT EXISTS idx_credit_ratings_symbol ON credit_ratings(symbol);
CREATE INDEX IF NOT EXISTS idx_regulatory_filings_symbol ON regulatory_filings(symbol);

-- Insert sample data for testing
INSERT INTO test_table (name) VALUES ('Initial Setup Complete') ON CONFLICT DO NOTHING;

ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS total_revenue REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS net_income REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS free_cash_flow REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS total_assets REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS total_liabilities REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS equity REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS debt_short REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS debt_long REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS total_debt REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS interest_expense REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS cash REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS current_assets REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS current_liabilities REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS revenue_growth REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS sector VARCHAR;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS industry VARCHAR;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS region VARCHAR;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS current_ratio REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS leverage_ratio REAL;
ALTER TABLE company_fundamentals ADD COLUMN IF NOT EXISTS risk_score REAL;
