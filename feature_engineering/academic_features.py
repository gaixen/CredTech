"""
Academic Feature Engineering for CDS Prediction
Das et al. and Tsai et al. methodologies for credit risk assessment
Updated to work with PostgreSQL database instead of CSV files
"""

import pandas as pd
import sys
import os
from typing import Tuple, Optional
import warnings
from datetime import datetime, timedelta
from scipy import stats
from sklearn.preprocessing import StandardScaler, RobustScaler
import logging
warnings.filterwarnings("ignore")

# Add paths for database access
current_dir = os.path.dirname(__file__)
sys.path.append(os.path.join(current_dir, '..', 'data_ingestion', 'structured_data'))

try:
    from storage import SessionLocal
    from models import CompanyFundamentals, StockPrice
    DB_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Database modules not available: {e}")
    DB_AVAILABLE = False

from AcademicFeatureEngineer import AcademicFeatureEngineer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_data_from_database(symbols: Optional[list] = None, min_date: Optional[datetime] = None) -> pd.DataFrame:
    """
    Load financial data directly from PostgreSQL database
    
    Args:
        symbols: List of ticker symbols to filter (None for all)
        min_date: Minimum ingestion date filter
        
    Returns:
        DataFrame with financial data from database
    """
    if not DB_AVAILABLE:
        raise ImportError("Database modules not available. Check your imports.")
    
    logger.info("Loading data from PostgreSQL database")
    
    db = SessionLocal()
    try:
        # Build base query
        query = """
        SELECT 
            cf.symbol,
            cf.sector,
            cf.industry,
            cf.total_revenue,
            cf.net_income,
            cf.total_assets,
            cf.total_liabilities,
            cf.equity,
            cf.debt_short,
            cf.debt_long,
            cf.total_debt,
            cf.cash,
            cf.current_assets,
            cf.current_liabilities,
            cf.revenue_growth,
            cf.current_ratio,
            cf.leverage_ratio,
            cf.risk_score,
            cf.roa,
            cf.roe,
            cf.free_cash_flow,
            cf.ingested_at as date,
            cf.fundamentals
        FROM company_fundamentals cf
        WHERE cf.total_assets IS NOT NULL
        """
        
        params = {}
        
        # Add symbol filter
        if symbols:
            placeholders = ','.join([f"'{s}'" for s in symbols])
            query += f" AND cf.symbol IN ({placeholders})"
        
        # Add date filter
        if min_date:
            query += " AND cf.ingested_at >= :min_date"
            params['min_date'] = min_date
        
        query += " ORDER BY cf.symbol, cf.ingested_at"
        
        # Execute query
        df = pd.read_sql(query, db.bind, params=params)
        
        logger.info(f"Loaded {len(df)} records from database")
        logger.info(f"Symbols: {df['symbol'].nunique()}")
        logger.info(f"Date range: {df['date'].min()} to {df['date'].max()}")
        
        return df
        
    finally:
        db.close()


def load_market_data_from_database(symbols: Optional[list] = None) -> pd.DataFrame:
    """
    Load market price data from database
    
    Args:
        symbols: List of ticker symbols to filter
        
    Returns:
        DataFrame with stock price data
    """
    if not DB_AVAILABLE:
        logger.warning("Database not available, skipping market data")
        return pd.DataFrame()
    
    db = SessionLocal()
    try:
        query = """
        SELECT 
            sp.symbol,
            sp.date,
            sp.close,
            sp.volume
        FROM stock_prices sp
        """
        
        if symbols:
            placeholders = ','.join([f"'{s}'" for s in symbols])
            query += f" WHERE sp.symbol IN ({placeholders})"
        
        query += " ORDER BY sp.symbol, sp.date"
        
        df = pd.read_sql(query, db.bind)
        logger.info(f"Loaded {len(df)} market data records")
        
        return df
        
    except Exception as e:
        logger.warning(f"Could not load market data: {e}")
        return pd.DataFrame()
    finally:
        db.close()


def engineer_features_for_cds_model(symbols: Optional[list] = None, 
                                  min_date: Optional[datetime] = None,
                                  output_path: Optional[str] = None) -> Tuple[pd.DataFrame, Optional[pd.Series]]:
    """
    Main function to engineer features for CDS prediction model using database data
    
    Args:
        symbols: List of ticker symbols to process (None for all)
        min_date: Minimum date for data filtering
        output_path: Optional path to save engineered features
        
    Returns:
        Tuple of (features_df, log_cds_target)
    """
    logger.info("Starting database-based feature engineering for CDS model")
    
    # Load data from database instead of CSV
    df = load_data_from_database(symbols, min_date)
    
    if len(df) == 0:
        logger.warning("No data found in database")
        return pd.DataFrame(), None
    
    # Load market data if available
    market_df = load_market_data_from_database(symbols)
    
    # Merge market data if available
    if not market_df.empty:
        # Calculate returns and volatility
        market_df['date'] = pd.to_datetime(market_df['date'])
        market_df = market_df.sort_values(['symbol', 'date'])
        
        # Calculate rolling returns and volatility
        market_df['return'] = market_df.groupby('symbol')['close'].pct_change()
        market_df['volatility'] = market_df.groupby('symbol')['return'].rolling(30).std().reset_index(level=0, drop=True)
        
        # Get latest market metrics per symbol
        latest_market = market_df.groupby('symbol').last().reset_index()
        latest_market = latest_market[['symbol', 'close', 'return', 'volatility']].rename(columns={
            'close': 'stock_price',
            'return': 'stock_return',
            'volatility': 'equity_volatility'
        })
        
        # Merge with fundamentals
        df = df.merge(latest_market, on='symbol', how='left')
        logger.info(f"Merged market data for {len(latest_market)} symbols")
    
    # Add required fields for academic feature engineering
    df = prepare_data_for_engineering(df)
    
    # Initialize feature engineer
    engineer = AcademicFeatureEngineer(winsorize_level=0.01)
    
    # Engineer features
    try:
        features_df, log_target = engineer.prepare_model_features(df)
        
        # Export summary
        if hasattr(engineer, 'export_features_summary'):
            summary = engineer.export_features_summary(features_df)
            logger.info(f"Total features created: {len(summary)}")
            logger.info(f"Average missing rate: {summary['missing_pct'].mean():.2f}%")
        
        # Save if path provided
        if output_path:
            features_df.to_csv(output_path, index=False)
            logger.info(f"Engineered features saved to {output_path}")
        
        logger.info("Feature engineering completed successfully")
        return features_df, log_target
        
    except Exception as e:
        logger.error(f"Feature engineering failed: {e}")
        return df, None


def prepare_data_for_engineering(df: pd.DataFrame) -> pd.DataFrame:
    """
    Prepare database data for academic feature engineering
    
    Args:
        df: Raw data from database
        
    Returns:
        DataFrame ready for feature engineering
    """
    logger.info("Preparing data for academic feature engineering")
    
    # Ensure required date column
    if 'date' not in df.columns:
        df['date'] = datetime.now()
    df['date'] = pd.to_datetime(df['date'])
    
    # Calculate missing academic metrics
    if 'leverage' not in df.columns:
        df['leverage'] = df['total_debt'] / df['total_assets']
        df['leverage'] = df['leverage'].fillna(0)
    
    if 'current_ratio' not in df.columns and 'current_assets' in df.columns and 'current_liabilities' in df.columns:
        df['current_ratio'] = df['current_assets'] / df['current_liabilities']
        df['current_ratio'] = df['current_ratio'].fillna(1.0)
    
    # Ensure ROA is calculated properly
    if 'roa' not in df.columns or df['roa'].isna().all():
        df['roa'] = (df['net_income'] / df['total_assets']) * 100
        df['roa'] = df['roa'].fillna(0)
    
    # Calculate revenue growth if missing
    if 'revenue_growth' not in df.columns or df['revenue_growth'].isna().all():
        df = df.sort_values(['symbol', 'date'])
        df['revenue_growth'] = df.groupby('symbol')['total_revenue'].pct_change() * 100
        df['revenue_growth'] = df['revenue_growth'].fillna(0)
    
    # Add equity values for distance-to-default calculations
    if 'equity_value' not in df.columns:
        df['equity_value'] = df.get('equity', df.get('total_assets', 0) - df.get('total_liabilities', 0))
    
    if 'debt_value' not in df.columns:
        df['debt_value'] = df.get('total_debt', df.get('total_liabilities', 0))
    
    # Fill missing values with reasonable defaults
    numeric_columns = df.select_dtypes(include=['float64', 'int64']).columns
    df[numeric_columns] = df[numeric_columns].fillna(0)
    
    logger.info(f"Data preparation completed. Shape: {df.shape}")
    return df


def get_latest_features_for_symbols(symbols: list) -> pd.DataFrame:
    """
    Get latest engineered features for specific symbols (for real-time scoring)
    
    Args:
        symbols: List of ticker symbols
        
    Returns:
        DataFrame with latest features for each symbol
    """
    logger.info(f"Getting latest features for {len(symbols)} symbols")
    
    # Get latest data for symbols
    features_df, _ = engineer_features_for_cds_model(symbols=symbols)
    
    if features_df.empty:
        return features_df
    
    # Get most recent features per symbol
    if 'date' in features_df.columns:
        latest_features = features_df.sort_values('date').groupby('symbol').last().reset_index()
    else:
        latest_features = features_df.groupby('symbol').last().reset_index()
    
    logger.info(f"Retrieved latest features for {len(latest_features)} symbols")
    return latest_features


if __name__ == "__main__":
    # Example usage with database
    
    # Test with specific symbols
    test_symbols = ['AAPL', 'MSFT', 'GOOGL']
    
    try:
        features_df, log_cds = engineer_features_for_cds_model(
            symbols=test_symbols,
            output_path='../data/engineered_features_from_db.csv'
        )
        
        print(f"\nFeature engineering completed!")
        print(f"Features shape: {features_df.shape}")
        print(f"Symbols processed: {features_df['symbol'].nunique() if 'symbol' in features_df.columns else 'N/A'}")
        
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure you have data in the database first.")
        print("Run: ./run_realtime_pipeline.sh fetch AAPL,MSFT,GOOGL")
