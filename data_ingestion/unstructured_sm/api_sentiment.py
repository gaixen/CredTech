#!/usr/bin/env python3
"""
Simplified sentiment analysis script that can be called from the API
"""
import sys
import json
import os
from main import fetch_and_save_posts_with_entities
from sentiment import process_json_data

def run_sentiment_analysis(symbol):
    """
    Run sentiment analysis for a given symbol and return results
    """
    try:
        # Fetch Reddit posts
        print(f"Fetching Reddit posts for {symbol}...")
        input_file_name = fetch_and_save_posts_with_entities(symbol)
        
        if not input_file_name:
            raise Exception("Failed to fetch Reddit posts")
        
        print(f"Posts saved to: {input_file_name}")
        
        # Run sentiment analysis
        output_file_name = input_file_name.replace('.json', '_sentiment.json')
        print(f"Running sentiment analysis...")
        process_json_data(input_file_name, output_file_name)
        
        # Read and return results
        if os.path.exists(output_file_name):
            with open(output_file_name, 'r', encoding='utf-8') as f:
                sentiment_results = json.load(f)
            
            # Clean up temporary files
            try:
                os.remove(input_file_name)
                os.remove(output_file_name)
            except:
                pass
            
            return sentiment_results
        else:
            raise Exception("Sentiment analysis file not created")
            
    except Exception as e:
        print(f"Error in sentiment analysis: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python api_sentiment.py <SYMBOL>")
        sys.exit(1)
    
    symbol = sys.argv[1].upper()
    result = run_sentiment_analysis(symbol)
    
    if result:
        print("SUCCESS")
        print(json.dumps(result, indent=2))
    else:
        print("FAILED")
        sys.exit(1)
