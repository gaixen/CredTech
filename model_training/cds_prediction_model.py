import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Union
import warnings
from datetime import datetime
import logging

# Statistics and econometrics
from scipy import stats
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.linear_model import LinearRegression
import statsmodels.api as sm
from statsmodels.regression.linear_model import RegressionResultsWrapper
from statsmodels.stats.diagnostic import het_breuschpagan
from statsmodels.stats.stattools import durbin_watson

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



class CDSPredictionModel:
    """
    Credit Default Swap prediction model following academic literature
    
    Implements the methodology from:
    - Das, S. R., Hanouna, P., & Sarin, A. (2009)
    - Bharath, S. T., & Shumway, T. (2008) for distance to default
    """
    
    def __init__(self, model_type: str = 'panel_fe')-> None:
        """
        Initialize the CDS prediction model
        
        Args:
            model_type: Type of model ('panel_fe', 'pooled_ols', 'fama_macbeth')
        """
        self.model_type = model_type
        self.model = None
        self.results = None
        self.feature_importance = None
        
    def prepare_panel_data(self, df: pd.DataFrame, entity_col: str = 'symbol', 
                          time_col: str = 'date') -> pd.DataFrame:
        """
        Prepare data for panel regression analysis
        
        Args:
            df: DataFrame with features and target
            entity_col: Column name for entity identifier
            time_col: Column name for time identifier
            
        Returns:
            DataFrame prepared for panel analysis
        """
        logger.info("Preparing data for panel regression")
        
        df_panel = df.copy()
        
        # Ensure datetime index for time
        if time_col in df_panel.columns:
            df_panel[time_col] = pd.to_datetime(df_panel[time_col])
        
        # Set multi-index for panel data
        if PANEL_AVAILABLE:
            df_panel = df_panel.set_index([entity_col, time_col])
        
        # Remove observations with missing target
        initial_obs = len(df_panel)
        df_panel = df_panel.dropna(subset=['log_cds_spread'])
        final_obs = len(df_panel)
        
        logger.info(f"Panel data prepared: {final_obs} observations ({initial_obs - final_obs} dropped)")
        
        return df_panel
    
    def fit_panel_fixed_effects(self, df: pd.DataFrame, target_col: str, 
                               feature_cols: List[str], entity_col: str = 'symbol') -> RegressionResultsWrapper:
        """
        Args:
            df: Panel data DataFrame
            target_col: Target variable column name
            feature_cols: List of feature column names
            entity_col: Entity identifier column
            
        Returns:
            Regression results
        """
        logger.info(f"Fitting panel fixed effects model with {len(feature_cols)} features")
        
        if PANEL_AVAILABLE:
            # Use linearmodels for proper panel regression
            model = PanelOLS(
                dependent=df[target_col],
                exog=df[feature_cols],
                entity_effects=True,
                time_effects=False,  # Following Das et al. specification
                drop_absorbed=True
            )
            results = model.fit(cov_type='clustered', cluster_entity=True)
        else:
            # Alternative implementation using statsmodels
            logger.warning("Using alternative fixed effects implementation")
            
            # Create entity dummies
            entity_dummies = pd.get_dummies(df[entity_col], prefix='entity')
            X = pd.concat([df[feature_cols], entity_dummies.iloc[:, :-1]], axis=1)  # Drop one dummy
            X = sm.add_constant(X)
            
            y = df[target_col]
            
            # Fit OLS with entity fixed effects
            model = sm.OLS(y, X, missing='drop')
            results = model.fit(cov_type='cluster', cov_kwds={'groups': df[entity_col]})
        
        self.model = model
        self.results = results
        
        logger.info("Panel fixed effects model fitted successfully")
        return results
    
    def fit_pooled_ols(self, df: pd.DataFrame, target_col: str, 
                       feature_cols: List[str]) -> RegressionResultsWrapper:
        """
        Fit pooled OLS regression with robust standard errors
        
        Args:
            df: DataFrame with features and target
            target_col: Target variable column name
            feature_cols: List of feature column names
            
        Returns:
            Regression results
        """
        logger.info(f"Fitting pooled OLS model with {len(feature_cols)} features")
        
        # Prepare data
        df_clean = df[feature_cols + [target_col]].dropna()
        X = sm.add_constant(df_clean[feature_cols])
        y = df_clean[target_col]
        
        # Fit OLS with robust standard errors
        model = sm.OLS(y, X)
        results = model.fit(cov_type='HC3')  # Robust standard errors
        
        self.model = model
        self.results = results
        
        logger.info("Pooled OLS model fitted successfully")
        return results
    
    def fit_fama_macbeth(self, df: pd.DataFrame, target_col: str, 
                        feature_cols: List[str], time_col: str = 'date') -> Dict:
        """
        Fit Fama-MacBeth regression (cross-sectional regressions for each time period)
        
        Args:
            df: DataFrame with features and target
            target_col: Target variable column name
            feature_cols: List of feature column names
            time_col: Time column name
            
        Returns:
            Dictionary with Fama-MacBeth results
        """
        logger.info("Fitting Fama-MacBeth regression")
        
        # Get unique time periods
        time_periods = df[time_col].unique()
        coefficients = []
        
        for period in time_periods:
            period_data = df[df[time_col] == period]
            
            if len(period_data) < 10:  # Minimum observations for stable regression
                continue
                
            # Fit cross-sectional regression
            X = sm.add_constant(period_data[feature_cols].dropna())
            y = period_data[target_col].dropna()
            
            if len(X) == len(y) and len(X) > len(feature_cols):
                try:
                    model = sm.OLS(y, X).fit()
                    coef_dict = {'period': period}
                    coef_dict.update(model.params.to_dict())
                    coefficients.append(coef_dict)
                except:
                    continue
        
        # Calculate time-series averages and t-statistics
        coef_df = pd.DataFrame(coefficients)
        fama_macbeth_results = {}
        
        for feature in ['const'] + feature_cols:
            if feature in coef_df.columns:
                coeffs = coef_df[feature].dropna()
                if len(coeffs) > 1:
                    mean_coeff = coeffs.mean()
                    std_coeff = coeffs.std()
                    t_stat = mean_coeff / (std_coeff / np.sqrt(len(coeffs)))
                    
                    fama_macbeth_results[feature] = {
                        'coefficient': mean_coeff,
                        'std_error': std_coeff / np.sqrt(len(coeffs)),
                        't_statistic': t_stat,
                        'p_value': 2 * (1 - stats.t.cdf(abs(t_stat), len(coeffs) - 1)),
                        'observations': len(coeffs)
                    }
        
        self.results = fama_macbeth_results
        logger.info(f"Fama-MacBeth regression completed with {len(time_periods)} time periods")
        
        return fama_macbeth_results
    
    def calculate_performance_metrics(self, y_true: np.ndarray, y_pred: np.ndarray) -> Dict:
        """
        Calculate comprehensive model performance metrics
        
        Args:
            y_true: True target values
            y_pred: Predicted target values
            
        Returns:
            Dictionary of performance metrics
        """
        # Basic metrics
        r2 = r2_score(y_true, y_pred)
        adj_r2 = 1 - (1 - r2) * (len(y_true) - 1) / (len(y_true) - len(self.results.params) - 1)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        mae = mean_absolute_error(y_true, y_pred)
        
        # Additional metrics
        residuals = y_true - y_pred
        mean_residual = np.mean(residuals)
        
        # Information criteria (if available)
        aic = self.results.aic if hasattr(self.results, 'aic') else None
        bic = self.results.bic if hasattr(self.results, 'bic') else None
        
        metrics = {
            'r_squared': r2,
            'adjusted_r_squared': adj_r2,
            'rmse': rmse,
            'mae': mae,
            'mean_residual': mean_residual,
            'aic': aic,
            'bic': bic,
            'observations': len(y_true)
        }
        
        return metrics
    
    def conduct_diagnostic_tests(self, df: pd.DataFrame, feature_cols: List[str]) -> Dict:
        """
        Conduct regression diagnostic tests
        
        Args:
            df: DataFrame with model data
            feature_cols: List of feature columns
            
        Returns:
            Dictionary of diagnostic test results
        """
        logger.info("Conducting regression diagnostic tests")
        
        diagnostics = {}
        
        if hasattr(self.results, 'resid') and hasattr(self.results, 'fittedvalues'):
            residuals = self.results.resid
            fitted_values = self.results.fittedvalues
            
            # Durbin-Watson test for autocorrelation
            dw_stat = durbin_watson(residuals)
            diagnostics['durbin_watson'] = dw_stat
            
            # Breusch-Pagan test for heteroscedasticity
            try:
                X = sm.add_constant(df[feature_cols].dropna())
                bp_stat, bp_p_value, _, _ = het_breuschpagan(residuals, X)
                diagnostics['breusch_pagan_stat'] = bp_stat
                diagnostics['breusch_pagan_p_value'] = bp_p_value
            except:
                logger.warning("Could not perform Breusch-Pagan test")
            
            # Normality test of residuals
            jarque_bera_stat, jarque_bera_p = stats.jarque_bera(residuals)
            diagnostics['jarque_bera_stat'] = jarque_bera_stat
            diagnostics['jarque_bera_p_value'] = jarque_bera_p
        
        return diagnostics
    
    def extract_feature_importance(self) -> pd.DataFrame:
        """
        Extract feature importance from model results
        
        Returns:
            DataFrame with feature importance metrics
        """
        if self.results is None:
            logger.warning("No model results available")
            return pd.DataFrame()
        
        if isinstance(self.results, dict):  # Fama-MacBeth results
            importance_data = []
            for feature, stats in self.results.items():
                if feature != 'const':
                    importance_data.append({
                        'feature': feature,
                        'coefficient': stats['coefficient'],
                        'std_error': stats['std_error'],
                        't_statistic': stats['t_statistic'],
                        'p_value': stats['p_value'],
                        'significance': '***' if stats['p_value'] < 0.01 else 
                                     '**' if stats['p_value'] < 0.05 else 
                                     '*' if stats['p_value'] < 0.10 else ''
                    })
        else:  # OLS or Panel results
            importance_data = []
            params = self.results.params
            pvalues = self.results.pvalues
            std_errors = self.results.bse
            
            for feature in params.index:
                if feature != 'const' and not feature.startswith('entity_'):
                    importance_data.append({
                        'feature': feature,
                        'coefficient': params[feature],
                        'std_error': std_errors[feature],
                        't_statistic': params[feature] / std_errors[feature],
                        'p_value': pvalues[feature],
                        'significance': '***' if pvalues[feature] < 0.01 else 
                                     '**' if pvalues[feature] < 0.05 else 
                                     '*' if pvalues[feature] < 0.10 else ''
                    })
        
        importance_df = pd.DataFrame(importance_data)
        importance_df = importance_df.sort_values('p_value')
        
        self.feature_importance = importance_df
        return importance_df
    
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Make predictions using fitted model
        
        Args:
            X: Features for prediction
            
        Returns:
            Array of predictions
        """
        if self.model is None:
            raise ValueError("Model must be fitted before making predictions")
        
        if hasattr(self.model, 'predict'):
            return self.model.predict(X)
        else:
            logger.warning("Direct prediction not available for this model type")
            return np.array([])
    
    def generate_model_summary(self) -> str:
        """
        Generate comprehensive model summary
        
        Returns:
            Formatted model summary string
        """
        if self.results is None:
            return "No model results available"
        
        summary = f"\n{'='*60}\n"
        summary += f"CDS SPREAD PREDICTION MODEL SUMMARY\n"
        summary += f"Model Type: {self.model_type}\n"
        summary += f"{'='*60}\n\n"
        
        if isinstance(self.results, dict):  # Fama-MacBeth
            summary += "FAMA-MACBETH REGRESSION RESULTS\n"
            summary += f"{'='*40}\n"
            for feature, stats in self.results.items():
                if feature != 'const':
                    summary += f"{feature:20} {stats['coefficient']:10.4f} "
                    summary += f"({stats['std_error']:8.4f}) "
                    summary += f"t={stats['t_statistic']:6.2f} "
                    summary += f"p={stats['p_value']:6.3f}\n"
        else:
            summary += str(self.results.summary())
        
        return summary