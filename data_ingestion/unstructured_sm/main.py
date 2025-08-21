import praw
import json
import re
from datetime import datetime
from dotenv import load_dotenv
import os
load_dotenv()
reddit = praw.Reddit(
    client_id=os.getenv("CLIENT_ID"),
    client_secret=os.getenv("CLIENT_SECRET"),
    user_agent=os.getenv("USER_AGENT"),
    username=os.getenv("REDDIT_USERNAME"),
    password=os.getenv("REDDIT_PASSWORD")
)

def find_related_companies(text, company_list):
    """
    Return the name of the company from text
    """
    found_companies = []

    pattern = re.compile(r'\b(' + '|'.join(re.escape(company) for company in company_list) + r')\b', re.IGNORECASE)
    
    matches = pattern.findall(text)

    for match in matches:
        for company in company_list:
            if company.lower() == match.lower() and company not in found_companies:
                found_companies.append(company)

    return found_companies

def fetch_and_save_posts_with_entities(user_input_company):
    """
    Fetches posts from popular finance subreddit for the companies and stores them in the JON file.
    """

    company_tickers = {
        "TSLA": "Tesla",
        "AAPL": "Apple",
        "GOOGL": "Google",
        "MSFT": "Microsoft",
        "AMZN": "Amazon"
    }
    
    subreddits = ["stocks", "investing", "personalfinance","wallstreetbets"]
    all_posts_data = []

    print(f"Authenticated as: {reddit.user.me()}")

    for subreddit_name in subreddits:
        print(f"Fetching posts from r/{subreddit_name}...")
        try:
            for submission in reddit.subreddit(subreddit_name).search(query=user_input_company, limit=100):
                all_company_names = list(company_tickers.keys()) + list(company_tickers.values())
                related_entities = find_related_companies(submission.title, all_company_names)
                primary_symbol = ""
                for ticker, name in company_tickers.items():
                    if user_input_company.lower() in [ticker.lower(), name.lower()]:
                        primary_symbol = ticker
                        break
                related_tickers = [e for e in related_entities if e.lower() != user_input_company.lower()]
                post_data = {
                    "id": submission.id,
                    "source": "Reddit",
                    "type": "social_media_post",
                    "title": submission.title,
                    "content": submission.selftext if submission.is_self else "Link post",
                    "url": submission.url,
                    "author": submission.author.name if submission.author else "Deleted",
                    "published_at": datetime.fromtimestamp(submission.created_utc).isoformat(),
                    "ingested_at": datetime.now().isoformat(),
                    "metadata": {
                        "primary_symbol": primary_symbol,
                        "publisher": f"r/{submission.subreddit.display_name}",
                        "related_tickers": related_tickers
                    },
                    "tags": [],
                    "entities": []
                }
                all_posts_data.append(post_data)

        except Exception as e:
            print(f"An error occurred while fetching from r/{subreddit_name}: {e}")
            return None
    file_name = f"{user_input_company.replace(' ', '_')}_reddit_posts.json"
    try:
        with open(file_name, 'w', encoding='utf-8') as f:
            json.dump(all_posts_data, f, ensure_ascii=False, indent=4)
        
        print(f"Successfully fetched {len(all_posts_data)} posts and saved them to {file_name}")
        return file_name
    except Exception as e:
        print(f"An error occurred while saving the file: {e}")
        return None

if __name__ == "__main__":
    user_input = input("Enter a primary company name or ticker to search for: ")
    fetch_and_save_posts_with_entities(user_input)