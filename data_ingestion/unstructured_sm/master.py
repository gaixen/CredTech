import os
from main import fetch_and_save_posts_with_entities
from sentiment import process_json_data

def unstructured_sm():
    """
    Function meant for ingestion of reddit posts and sentiment analysis for the comapny requested by the user
    """
    user_input = input("Enter a primary company name or ticker to search for: ")
    
    try:
        input_file_name = fetch_and_save_posts_with_entities(user_input)
        if input_file_name:
            print(f"Data ingestion complete. Saved to: {input_file_name}")
            output_file_name = input_file_name.replace('.json', '_sentiment.json')
            process_json_data(input_file_name, output_file_name)
            print(f"Final analyzed data saved to: {output_file_name}")
        else:
            print("Data ingestion failed. Aborting.")
    except Exception as e:
        print(f"An error occurred during the pipeline execution: {e}")

if __name__ == "__main__":
    unstructured_sm()