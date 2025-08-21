"""
Model Training Module for CDS Spread Prediction
Following Das et al. (2009) and Tsai et al. (2016) methodologies

This module implements the statistical models used in academic literature:
- Panel regression with fixed effects
- Ordinary Least Squares (OLS) with robust standard errors
- Model validation and performance metrics
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Union
import warnings
from datetime import datetime
import logging
from cds_prediction_model import CDSPredictionModel
from ModelValidation import ModelValidation

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





def train_cds_prediction_model(features_df: pd.DataFrame, target_col: str = 'log_cds_spread',
                              model_type: str = 'panel_fe') -> Tuple[CDSPredictionModel, Dict]:
    """
    Main function to train CDS prediction model
    
    Args:
        features_df: DataFrame with engineered features
        target_col: Target variable column name
        model_type: Type of model to train
        
    Returns:
        Tuple of (fitted_model, performance_metrics)
    """
    logger.info(f"Training CDS prediction model: {model_type}")
    
    # Get feature categories
    from feature_engineering.academic_features import AcademicFeatureEngineer
    engineer = AcademicFeatureEngineer()
    feature_categories = engineer.get_feature_categories()
    
    # Select features present in data
    all_features = []
    for category, features in feature_categories.items():
        all_features.extend([f for f in features if f in features_df.columns])
    
    logger.info(f"Training with {len(all_features)} features")
    
    # Initialize and fit model
    model = CDSPredictionModel(model_type)
    
    if model_type == 'panel_fe':
        model.fit_panel_fixed_effects(features_df, target_col, all_features)
    elif model_type == 'pooled_ols':
        model.fit_pooled_ols(features_df, target_col, all_features)
    elif model_type == 'fama_macbeth':
        model.fit_fama_macbeth(features_df, target_col, all_features)
    
    # Extract feature importance
    importance_df = model.extract_feature_importance()
    
    # Calculate performance metrics
    if hasattr(model.results, 'fittedvalues'):
        y_true = features_df[target_col].dropna()
        y_pred = model.results.fittedvalues
        performance_metrics = model.calculate_performance_metrics(y_true, y_pred)
    else:
        performance_metrics = {}
    
    # Conduct diagnostic tests
    diagnostics = model.conduct_diagnostic_tests(features_df, all_features)
    
    results = {
        'performance_metrics': performance_metrics,
        'feature_importance': importance_df,
        'diagnostics': diagnostics,
        'model_summary': model.generate_model_summary()
    }
    
    logger.info("Model training completed successfully")
    
    return model, results

if __name__ == "__main__":
    # Example usage
    logger.info("CDS Prediction Model Training Module initialized")
