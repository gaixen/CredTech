import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Union
import warnings
from datetime import datetime, timedelta
from scipy import stats
from sklearn.preprocessing import StandardScaler, RobustScaler
import logging
warnings.filterwarnings("ignore")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AcademicFeatureEngineer:
    """
    CREDIT DEFAULT SWAP prediction
    Das et al. and Tsai et al.
    """
    
    def __init__(self, winsorize_level: float = 0.01) -> None:
        """
        Initialize the feature engineer
        
        Args:
            winsorize_level:(say 1%)
        """
        self.winsorize_level = winsorize_level
        self.scalers = {}
        
    def calculate_rolling_averages(self, df: pd.DataFrame, window: int = 4) -> pd.DataFrame:
        """
        Calculate rolling 4-quarter averages to reduce seasonal effects
        Das et al.
        
        Args:
            df: DataFrame with financial data
            window: Rolling window size (default 4 quarters)
            
        Returns:
            DataFrame with rolling averages
        """
        logger.info(f"Calculating {window}-quarter rolling averages for ROA and revenue growth")
        
        df_processed = df.copy()
        
        # Rolling averages for key metrics
        rolling_cols = ['roa', 'revenue_growth', 'net_income', 'total_revenue']
        
        for col in rolling_cols:
            if col in df_processed.columns:
                df_processed[f'{col}_rolling_{window}q'] = (
                    df_processed.groupby('symbol')[col]
                    .rolling(window=window, min_periods=2)
                    .mean()
                    .reset_index(level=0, drop=True)
                )
        
        return df_processed
    
    def calculate_naive_distance_to_default(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate naive distance to default following Bharath and Shumway (2008)
        As referenced in the academic paper
        
        Equations:
        naive_σv = (E/(E+F)) * σE + (F/(E+F)) * (0.05 + 0.25*σE)
        naive_dtd = [ln((E+F)/F) + r - 0.5*naive_σv²*T] / (naive_σv * √T)
        
        Args:
            df: DataFrame with market data
            
        Returns:
            DataFrame with distance to default metrics
        """
        logger.info("Calculating naive distance to default metrics")
        
        df_dtd = df.copy()
        
        # Required fields for DTD calculation
        required_fields = ['equity_value', 'debt_value', 'equity_volatility', 'stock_return']
        
        if not all(field in df_dtd.columns for field in required_fields):
            logger.warning(f"Missing required fields for DTD calculation: {required_fields}")
            df_dtd['naive_dtd'] = np.nan
            df_dtd['naive_sigma_v'] = np.nan
            return df_dtd
        
        # Calculate total firm volatility (naive σv) - Equation (1)
        E = df_dtd['equity_value']
        F = df_dtd['debt_value'] 
        sigma_E = df_dtd['equity_volatility']
        
        df_dtd['naive_sigma_v'] = (
            (E / (E + F)) * sigma_E + 
            (F / (E + F)) * (0.05 + 0.25 * sigma_E)
        )
        T = 1.0  
        r = df_dtd['stock_return']
        
        df_dtd['naive_dtd'] = (
            np.log((E + F) / F) + r - 0.5 * (df_dtd['naive_sigma_v'] ** 2) * T
        ) / (df_dtd['naive_sigma_v'] * np.sqrt(T))
        
        return df_dtd
    
    def winsorize_variables(self, df: pd.DataFrame, exclude_cols: List[str] = None) -> pd.DataFrame:
        """
        Winsorize quantitative variables at specified level
        Following the academic paper methodology
        
        Args:
            df: DataFrame to winsorize
            exclude_cols: Columns to exclude from winsorization
            
        Returns:
            Winsorized DataFrame
        """
        logger.info(f"Winsorizing variables at {self.winsorize_level*100}% level")
        
        if exclude_cols is None:
            exclude_cols = ['symbol', 'date', 'company', 'sector', 'industry']
        
        df_winsorized = df.copy()
        numeric_cols = df_winsorized.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            if col not in exclude_cols:
                lower_percentile = df_winsorized[col].quantile(self.winsorize_level)
                upper_percentile = df_winsorized[col].quantile(1 - self.winsorize_level)
                
                df_winsorized[col] = df_winsorized[col].clip(
                    lower=lower_percentile, 
                    upper=upper_percentile
                )
        
        return df_winsorized
    
    def create_accounting_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create accounting-based features following Das et al. specification
        
        Features:
        - ROA: Return on Assets (income after taxes / average total assets)
        - Revenue Growth: Change in TTM revenue
        - Leverage: Total debt to total assets
        - Retained Earnings: Retained earnings to total assets
        - Net Income Growth: Net income growth normalized by total assets
        
        Args:
            df: DataFrame with fundamental data
            
        Returns:
            DataFrame with accounting features
        """
        logger.info("Creating accounting-based features")
        
        df_accounting = df.copy()
        
        # 1. Return on Assets (ROA) - key predictor
        if 'net_income' in df_accounting.columns and 'total_assets' in df_accounting.columns:
            df_accounting['roa'] = (df_accounting['net_income'] / df_accounting['total_assets']) * 100
        
        # 2. Revenue Growth (period-to-period change)
        if 'total_revenue' in df_accounting.columns:
            df_accounting['revenue_growth'] = (
                df_accounting.groupby('symbol')['total_revenue']
                .pct_change(periods=1) * 100
            )
        
        # 3. Leverage (total debt to total assets)
        if 'total_debt' in df_accounting.columns and 'total_assets' in df_accounting.columns:
            df_accounting['leverage'] = df_accounting['total_debt'] / df_accounting['total_assets']
        
        # 4. Retained Earnings ratio
        if 'retained_earnings' in df_accounting.columns and 'total_assets' in df_accounting.columns:
            df_accounting['retained_earnings_ratio'] = (
                df_accounting['retained_earnings'] / df_accounting['total_assets']
            )
        
        # 5. Net Income Growth normalized by total assets
        if 'net_income' in df_accounting.columns and 'total_assets' in df_accounting.columns:
            net_income_growth = (
                df_accounting.groupby('symbol')['net_income']
                .pct_change(periods=1)
            )
            df_accounting['net_income_growth_normalized'] = (
                net_income_growth / df_accounting['total_assets']
            )
        
        return df_accounting
    
    def create_market_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create market-based features following the academic specification
        
        Features:
        - Equity Return: Annualized 100 trading day return
        - Equity Volatility: Annualized 100 trading day volatility
        - Index Return: Prior year S&P 500 return
        - Distance to Default: Naive DTD measure
        
        Args:
            df: DataFrame with market data
            
        Returns:
            DataFrame with market features
        """
        logger.info("Creating market-based features")
        
        df_market = df.copy()
        
        # Calculate equity returns and volatility (if price data available)
        if 'close_price' in df_market.columns:
            # 100-day rolling return
            df_market['daily_return'] = (
                df_market.groupby('symbol')['close_price']
                .pct_change()
            )
            
            # Annualized 100-day return
            df_market['equity_return_100d'] = (
                df_market.groupby('symbol')['daily_return']
                .rolling(window=100, min_periods=50)
                .mean() * 252 * 100  # Annualized percentage // 252 working days
            )
            
            # Annualized 100-day volatility
            df_market['equity_volatility_100d'] = (
                df_market.groupby('symbol')['daily_return']
                .rolling(window=100, min_periods=50)
                .std() * np.sqrt(252) * 100  # Annualized percentage
            )
        
        # Add distance to default if market value data is available
        if all(col in df_market.columns for col in ['equity_value', 'debt_value']):
            df_market = self.calculate_naive_distance_to_default(df_market)
        
        return df_market
    
    def create_macroeconomic_features(self, df: pd.DataFrame, macro_data: pd.DataFrame = None) -> pd.DataFrame:
        """
        Create macroeconomic features
        
        Features:
        - Risk-free Rate: 3-Month Treasury bill rate
        - Credit Rating: S&P rating transformed to 0-1 scale
        
        Args:
            df: DataFrame with company data
            macro_data: DataFrame with macroeconomic indicators
            
        Returns:
            DataFrame with macro features
        """
        logger.info("Creating macroeconomic features")
        
        df_macro = df.copy()
        
        # S&P Credit Rating transformation (following academic paper)
        if 'credit_rating' in df_macro.columns:
            rating_map = {
                'AAA': 0.000, 'AA+': 0.056, 'AA': 0.111, 'AA-': 0.167,
                'A+': 0.222, 'A': 0.278, 'A-': 0.333,
                'BBB+': 0.389, 'BBB': 0.444, 'BBB-': 0.500,
                'BB+': 0.556, 'BB': 0.611, 'BB-': 0.667,
                'B+': 0.722, 'B': 0.778, 'B-': 0.833,
                'CCC+': 0.889, 'CCC': 0.944, 'CCC-': 0.956,
                'CC': 0.972, 'C': 0.989, 'D': 1.000
            }
            df_macro['credit_rating_numeric'] = df_macro['credit_rating'].map(rating_map)
        
        # Add macroeconomic data if provided
        if macro_data is not None and 'date' in df_macro.columns:
            df_macro = pd.merge_asof(
                df_macro.sort_values('date'),
                macro_data.sort_values('date'),
                on='date',
                direction='backward'
            )
        
        return df_macro
    
    def transform_target_variable(self, cds_spreads: pd.Series) -> pd.Series:
        """
        Transform CDS spreads using natural logarithm
        Following theoretical considerations from Das et al.
        
        Args:
            cds_spreads: Series of CDS spread values
            
        Returns:
            Log-transformed CDS spreads
        """
        logger.info("Transforming CDS spreads using natural logarithm")
        
        # Handle zero or negative values
        cds_spreads_positive = cds_spreads.replace(0, np.nan)
        cds_spreads_positive = cds_spreads_positive[cds_spreads_positive > 0]
        
        log_cds = np.log(cds_spreads_positive)
        
        # logger.info(f"Transformed {len(log_cds)} CDS observations")
        return log_cds
    
    def create_interaction_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create interaction features for enhanced model performance
        
        Args:
            df: DataFrame with base features
            
        Returns:
            DataFrame with interaction features
        """
        logger.info("Creating interaction features")
        
        df_interactions = df.copy()
        
        # ROA x Leverage interaction (profitability-risk)
        if 'roa' in df_interactions.columns and 'leverage' in df_interactions.columns:
            df_interactions['roa_leverage_interaction'] = (
                df_interactions['roa'] * df_interactions['leverage']
            )
        
        # Revenue Growth x Market Volatility
        if 'revenue_growth' in df_interactions.columns and 'equity_volatility_100d' in df_interactions.columns:
            df_interactions['growth_volatility_interaction'] = (
                df_interactions['revenue_growth'] * df_interactions['equity_volatility_100d']
            )
        
        # Size effect (log of market cap)
        if 'market_cap' in df_interactions.columns:
            df_interactions['log_market_cap'] = np.log(df_interactions['market_cap'])
        
        return df_interactions
    
    def prepare_model_features(self, df: pd.DataFrame, target_col: str = 'cds_spread') -> Tuple[pd.DataFrame, pd.Series]:
        """
        Complete feature engineering pipeline for CDS prediction model
        Flexible to work with database schema fields
        
        Args:
            df: Raw financial data from database or CSV
            target_col: Name of target variable column
            
        Returns:
            Tuple of (features_df, target_series)
        """
        logger.info("Starting complete feature engineering pipeline")
        logger.info(f"Input data shape: {df.shape}")
        logger.info(f"Available columns: {list(df.columns)}")
        
        # Prepare data for processing
        df_prepared = self._prepare_database_fields(df)
        
        # 1. Create base features
        df_features = self.create_accounting_features(df_prepared)
        df_features = self.create_market_features(df_features)
        df_features = self.create_macroeconomic_features(df_features)
        
        # 2. Calculate rolling averages (only if multiple time periods available)
        if 'date' in df_features.columns and len(df_features['symbol'].unique()) > 1:
            df_features = self.calculate_rolling_averages(df_features)
        
        # 3. Create interaction features
        df_features = self.create_interaction_features(df_features)
        
        # 4. Winsorize variables
        df_features = self.winsorize_variables(df_features)
        
        # 5. Transform target variable or create mock target
        if target_col in df_features.columns:
            log_target = self.transform_target_variable(df_features[target_col])
        else:
            logger.warning(f"Target variable {target_col} not found. Creating mock target based on risk score.")
            # Create mock CDS spreads based on risk score for training purposes
            if 'risk_score' in df_features.columns and df_features['risk_score'].notna().any():
                # Convert risk score to mock CDS spreads (higher risk = higher spread)
                risk_scores = df_features['risk_score'].fillna(0.5)  # Default risk score
                mock_spreads = risk_scores * 50 + np.random.normal(0, 10, len(df_features))
                mock_spreads = np.maximum(mock_spreads, 1.0)  # Ensure positive
                log_target = self.transform_target_variable(pd.Series(mock_spreads, dtype=float))
            else:
                # Default mock spreads if no risk score available
                mock_spreads = np.random.uniform(10, 100, len(df_features))  # Random spreads between 10-100 bps
                log_target = self.transform_target_variable(pd.Series(mock_spreads, dtype=float))
        
        logger.info(f"Feature engineering completed. Output shape: {df_features.shape}")
        
        return df_features, log_target
    
    def _prepare_database_fields(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare database fields to match academic feature engineering expectations
        
        Args:
            df: DataFrame from database
            
        Returns:
            DataFrame with standardized field names
        """
        logger.info("Preparing database fields for feature engineering")
        
        df_prep = df.copy()
        
        # Ensure symbol column exists
        if 'symbol' not in df_prep.columns and 'ticker' in df_prep.columns:
            df_prep['symbol'] = df_prep['ticker']
        
        # Ensure date column exists and is datetime
        if 'date' in df_prep.columns:
            df_prep['date'] = pd.to_datetime(df_prep['date'])
        
        # Map database fields to expected academic fields
        field_mapping = {
            'return_on_assets': 'roa',
            'leverage_ratio': 'leverage',
            'current_ratio': 'current_ratio',
            'revenue_growth': 'revenue_growth'
        }
        
        for db_field, academic_field in field_mapping.items():
            if db_field in df_prep.columns and academic_field not in df_prep.columns:
                df_prep[academic_field] = df_prep[db_field]
        
        # Calculate missing key metrics from database fields
        
        # ROA from database fields
        if 'roa' not in df_prep.columns and 'net_income' in df_prep.columns and 'total_assets' in df_prep.columns:
            df_prep['roa'] = (df_prep['net_income'] / df_prep['total_assets'].replace(0, np.nan)) * 100
        
        # Leverage from database fields  
        if 'leverage' not in df_prep.columns:
            if 'leverage_ratio' in df_prep.columns:
                df_prep['leverage'] = df_prep['leverage_ratio']
            elif 'total_debt' in df_prep.columns and 'total_assets' in df_prep.columns:
                df_prep['leverage'] = df_prep['total_debt'] / df_prep['total_assets'].replace(0, np.nan)
            elif 'total_liabilities' in df_prep.columns and 'total_assets' in df_prep.columns:
                df_prep['leverage'] = df_prep['total_liabilities'] / df_prep['total_assets'].replace(0, np.nan)
        
        # Current ratio from database fields
        if 'current_ratio' not in df_prep.columns and 'current_assets' in df_prep.columns and 'current_liabilities' in df_prep.columns:
            df_prep['current_ratio'] = df_prep['current_assets'] / df_prep['current_liabilities'].replace(0, np.nan)
        
        # Retained earnings ratio
        if 'retained_earnings_ratio' not in df_prep.columns:
            if 'retained_earnings_ratio' in df_prep.columns:
                pass  # Already exists
            elif 'retained_earnings' in df_prep.columns and 'total_assets' in df_prep.columns:
                df_prep['retained_earnings_ratio'] = df_prep['retained_earnings'] / df_prep['total_assets'].replace(0, np.nan)
            else:
                # Default value for missing retained earnings
                df_prep['retained_earnings_ratio'] = 0.1
        
        # Revenue growth calculation
        if 'revenue_growth' not in df_prep.columns and 'total_revenue' in df_prep.columns:
            if len(df_prep['symbol'].unique()) > 1 and 'date' in df_prep.columns:
                # Calculate growth over time per symbol
                df_prep = df_prep.sort_values(['symbol', 'date'])
                df_prep['revenue_growth'] = df_prep.groupby('symbol')['total_revenue'].pct_change() * 100
            else:
                # Single period - assume modest growth
                df_prep['revenue_growth'] = 5.0
        
        # Market-based fields
        if 'equity_value' not in df_prep.columns:
            if 'equity' in df_prep.columns:
                df_prep['equity_value'] = df_prep['equity']
            elif 'total_assets' in df_prep.columns and 'total_liabilities' in df_prep.columns:
                df_prep['equity_value'] = df_prep['total_assets'] - df_prep['total_liabilities']
        
        if 'debt_value' not in df_prep.columns:
            if 'total_debt' in df_prep.columns:
                df_prep['debt_value'] = df_prep['total_debt']
            else:
                df_prep['debt_value'] = df_prep.get('total_liabilities', 0)
        
        # Fill missing values with reasonable defaults
        defaults = {
            'roa': 0.0,
            'leverage': 0.3,
            'current_ratio': 1.2,
            'revenue_growth': 3.0,
            'retained_earnings_ratio': 0.1,
            'equity_value': 1000000,
            'debt_value': 300000
        }
        
        for field, default_value in defaults.items():
            if field in df_prep.columns:
                df_prep[field] = df_prep[field].fillna(default_value)
            else:
                df_prep[field] = default_value
        
        logger.info(f"Database field preparation completed. Available features: {[col for col in df_prep.columns if col in defaults.keys()]}")
        
        return df_prep
    
    def get_feature_categories(self) -> Dict[str, List[str]]:
        """
        Get categorized feature lists for model specification
        Following the academic paper structure
        
        Returns:
            Dictionary of feature categories
        """
        return {
            'accounting': [
                'roa', 'roa_rolling_4q', 'revenue_growth', 'revenue_growth_rolling_4q',
                'leverage', 'retained_earnings_ratio', 'net_income_growth_normalized'
            ],
            'market': [
                'equity_return_100d', 'equity_volatility_100d', 'index_return', 
                'naive_dtd', 'naive_sigma_v'
            ],
            'macroeconomic': [
                'risk_free_rate', 'credit_rating_numeric'
            ],
            'interactions': [
                'roa_leverage_interaction', 'growth_volatility_interaction', 'log_market_cap'
            ]
        }
    
    def export_features_summary(self, df: pd.DataFrame, output_path: str = None) -> pd.DataFrame:
        """
        Export summary of engineered features
        
        Args:
            df: DataFrame with engineered features
            output_path: Optional path to save summary
            
        Returns:
            Summary DataFrame
        """
        feature_categories = self.get_feature_categories()
        all_features = [feat for category in feature_categories.values() for feat in category]
        
        summary_data = []
        
        for category, features in feature_categories.items():
            for feature in features:
                if feature in df.columns:
                    summary_data.append({
                        'feature': feature,
                        'category': category,
                        'count': df[feature].count(),
                        'missing_pct': (df[feature].isnull().sum() / len(df)) * 100,
                        'mean': df[feature].mean() if df[feature].dtype in ['float64', 'int64'] else None,
                        'std': df[feature].std() if df[feature].dtype in ['float64', 'int64'] else None,
                        'min': df[feature].min() if df[feature].dtype in ['float64', 'int64'] else None,
                        'max': df[feature].max() if df[feature].dtype in ['float64', 'int64'] else None
                    })
        
        summary_df = pd.DataFrame(summary_data)
        
        if output_path:
            summary_df.to_csv(output_path, index=False)
            logger.info(f"Feature summary exported to {output_path}")
        
        return summary_df