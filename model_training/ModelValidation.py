import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Union
import warnings
from datetime import datetime
import logging
from cds_prediction_model import CDSPredictionModel
import statsmodels.api as sm

# Panel data analysis
try:
    from linearmodels import PanelOLS
    PANEL_AVAILABLE = True
except ImportError:
    PANEL_AVAILABLE = False
    warnings.warn("linearmodels not available.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelValidation:
    """
    Model validation and robustness testing
    """
    
    @staticmethod
    def time_series_split_validation(df: pd.DataFrame, target_col: str, 
                                   feature_cols: List[str], time_col: str = 'date',
                                   train_years: int = 3, test_years: int = 1) -> Dict:
        """
        Perform time series cross-validation
        
        Args:
            df: DataFrame with time series data
            target_col: Target variable column
            feature_cols: Feature columns
            time_col: Time column
            train_years: Years for training
            test_years: Years for testing
            
        Returns:
            Validation results
        """
        logger.info("Performing time series cross-validation")
        
        df_sorted = df.sort_values(time_col)
        df_sorted[time_col] = pd.to_datetime(df_sorted[time_col])
        
        # Split into time periods
        min_date = df_sorted[time_col].min()
        max_date = df_sorted[time_col].max()
        
        validation_results = []
        current_date = min_date + pd.DateOffset(years=train_years)
        
        while current_date + pd.DateOffset(years=test_years) <= max_date:
            # Define train and test periods
            train_end = current_date
            test_start = current_date
            test_end = current_date + pd.DateOffset(years=test_years)
            
            # Split data
            train_data = df_sorted[df_sorted[time_col] < train_end]
            test_data = df_sorted[
                (df_sorted[time_col] >= test_start) & 
                (df_sorted[time_col] < test_end)
            ]
            
            if len(train_data) > 100 and len(test_data) > 20:
                # Fit model
                model = CDSPredictionModel('pooled_ols')
                model.fit_pooled_ols(train_data, target_col, feature_cols)
                
                # Make predictions
                X_test = sm.add_constant(test_data[feature_cols].dropna())
                y_test = test_data[target_col].dropna()
                
                if len(X_test) == len(y_test) and len(y_test) > 0:
                    y_pred = model.model.predict(model.results.params, X_test)
                    
                    # Calculate metrics
                    metrics = model.calculate_performance_metrics(y_test, y_pred)
                    metrics['train_period'] = f"{min_date.strftime('%Y-%m')} to {train_end.strftime('%Y-%m')}"
                    metrics['test_period'] = f"{test_start.strftime('%Y-%m')} to {test_end.strftime('%Y-%m')}"
                    
                    validation_results.append(metrics)
            
            # Move to next period
            current_date += pd.DateOffset(years=1)
        
        return {
            'individual_results': validation_results,
            'average_r2': np.mean([r['r_squared'] for r in validation_results]),
            'average_rmse': np.mean([r['rmse'] for r in validation_results]),
            'stability': np.std([r['r_squared'] for r in validation_results])
        }
    
    @staticmethod
    def robustness_tests(df: pd.DataFrame, target_col: str, 
                        feature_cols: List[str]) -> Dict:
        """
        Conduct robustness tests for model specification
        
        Args:
            df: DataFrame with model data
            target_col: Target variable
            feature_cols: Feature columns
            
        Returns:
            Robustness test results
        """
        logger.info("Conducting robustness tests")
        
        results = {}
        
        # 1. Test with different winsorization levels
        winsorization_levels = [0.005, 0.01, 0.025]
        winsor_results = []
        
        for level in winsorization_levels:
            import sys
            import os
            sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'feature_engineering'))
            from feature_engineering.AcademicFeatureEngineer import AcademicFeatureEngineer
            engineer = AcademicFeatureEngineer(winsorize_level=level)
            df_winsorized = engineer.winsorize_variables(df)
            
            model = CDSPredictionModel('pooled_ols')
            model.fit_pooled_ols(df_winsorized, target_col, feature_cols)
            
            winsor_results.append({
                'winsorization_level': level,
                'r_squared': model.results.rsquared,
                'aic': model.results.aic
            })
        
        results['winsorization_tests'] = winsor_results
        
        # 2. Test feature subsets
        feature_subsets = {
            'accounting_only': [f for f in feature_cols if f in ['roa', 'leverage', 'revenue_growth']],
            'market_only': [f for f in feature_cols if 'volatility' in f or 'return' in f],
            'full_model': feature_cols
        }
        
        subset_results = []
        for subset_name, subset_features in feature_subsets.items():
            if len(subset_features) > 0:
                model = CDSPredictionModel('pooled_ols')
                model.fit_pooled_ols(df, target_col, subset_features)
                
                subset_results.append({
                    'subset': subset_name,
                    'features': len(subset_features),
                    'r_squared': model.results.rsquared,
                    'aic': model.results.aic
                })
        
        results['feature_subset_tests'] = subset_results
        
        return results