"""
Academic Feature Engineering for CDS Prediction
Das et al. and Tsai et al. 
methodologies for credit risk assessment
"""

import pandas as pd
from typing import Tuple
import warnings
from datetime import datetime, timedelta
from scipy import stats
from sklearn.preprocessing import StandardScaler, RobustScaler
import logging
warnings.filterwarnings("ignore")
from AcademicFeatureEngineer import AcademicFeatureEngineer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



# Usage example
def engineer_features_for_cds_model(data_path: str, output_path: str = None) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Main function to engineer features for CDS prediction model
    
    Args:
        data_path: Path to raw financial data CSV
        output_path: Optional path to save engineered features
        
    Returns:
        Tuple of (features_df, log_cds_target)
    """
    # Load data
    df = pd.read_csv(data_path)
    
    # Initialize feature engineer
    engineer = AcademicFeatureEngineer(winsorize_level=0.01)
    
    # Engineer features
    features_df, log_target = engineer.prepare_model_features(df)
    
    # Export summary
    summary = engineer.export_features_summary(features_df)
    print("\nFeature Engineering Summary:")
    print(f"Total features created: {len(summary)}")
    print(f"Average missing rate: {summary['missing_pct'].mean():.2f}%")
    
    # Save if path provided
    if output_path:
        features_df.to_csv(output_path, index=False)
        logger.info(f"Engineered features saved to {output_path}")
    
    return features_df, log_target

if __name__ == "__main__":

    data_path = "..."
    features_df, log_cds = engineer_features_for_cds_model(data_path)
