import os
import warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', category=UserWarning)
import json
import re
from transformers import pipeline
import torch

try:
    # Load FinBERT on GPU
    if torch.cuda.is_available():
        device = 0
    else: 
        device = -1
    sentiment_pipeline = pipeline("sentiment-analysis", model="ProsusAI/finbert", device=device)
    print(f"FinBERT model loaded successfully on {'GPU' if device == 0 else 'CPU'}.")
except Exception as e:
    print(f"Failed to load model. Error: {e}")
    sentiment_pipeline = None

def extract_keywords(text):
    """Positive and Negative word extraction from the titles"""
    positive_words = [
        'up', 'growth', 'gain', 'rise', 'soar', 'bullish', 'profit', 'beat', 'outperform', 
        'strong', 'record', 'high', 'increase', 'buy', 'long', 'rally', 'surpass', 
        'optimistic', 'back', 'recover', 'trillion', 'positive', 'good'
    ]
    negative_words = [
        'down', 'loss', 'drop', 'fall', 'tanking', 'bearish', 'miss', 'underperform', 
        'weak', 'low', 'decrease', 'sell', 'short', 'crash', 'plunge', 'pessimistic', 
        'demise', 'bubble', 'tanking', 'negative', 'bad'
    ]
    found_positive = re.findall(r'\b(' + '|'.join(positive_words) + r')\b', text, re.IGNORECASE)
    found_negative = re.findall(r'\b(' + '|'.join(negative_words) + r')\b', text, re.IGNORECASE)
    return {
        "positive_keywords": sorted(list(set(w.lower() for w in found_positive))),
        "negative_keywords": sorted(list(set(w.lower() for w in found_negative)))
    }

def analyze_sentiment_with_finbert(text):
    """Analysis of the sentiment"""
    if not sentiment_pipeline or not text or not text.strip():
        return {"label": "neutral", "score": 0.0, "full_text": "No text provided or model not loaded."}
    try:
        result = sentiment_pipeline(text, truncation=True, max_length=512)[0]
        return {
            "label": result['label'],
            "score": round(result['score'], 4),
            "full_text": text.strip()
        }
    except Exception as e:
        return {"label": "error", "score": 0.0, "full_text": "Failed to analyze text."}

def get_aggregate_sentiment(posts):
    """Aggregate sentiments"""
    opinionated_posts = [
        p for p in posts if 'metadata' in p and p['metadata'].get('sentiment') in ['positive', 'negative']
    ]
    if not opinionated_posts:
        return {
            "overall_sentiment": "Neutral", "weighted_score": 0, "positive_reasons": [],
            "negative_reasons": [{"reason": "No strong positive or negative posts were found.", "keywords": []}]
        }
    total_score = 0
    for post in opinionated_posts:
        score = post['metadata']['sentiment_score']
        label = post['metadata']['sentiment']
        if label == 'positive': total_score += score
        elif label == 'negative': total_score -= score      
    weighted_score = round(total_score / len(opinionated_posts), 4)

    if weighted_score > 0.1: overall_sentiment = "Positive"
    elif weighted_score < -0.1: overall_sentiment = "Negative"
    else: overall_sentiment = "Neutral / Mixed"

    opinionated_posts.sort(key=lambda p: p['metadata']['sentiment_score'], reverse=True)
    positive_posts = [p for p in opinionated_posts if p['metadata']['sentiment'] == 'positive']
    negative_posts = [p for p in opinionated_posts if p['metadata']['sentiment'] == 'negative']
    positive_reasons = [{"reason": p['metadata']['full_text'], "keywords": p['metadata']['positive_keywords']} for p in positive_posts[:3]]
    negative_reasons = [{"reason": p['metadata']['full_text'], "keywords": p['metadata']['negative_keywords']} for p in negative_posts[:3]]
    return {
        "overall_sentiment": overall_sentiment, "weighted_score": weighted_score,
        "positive_reasons": positive_reasons, "negative_reasons": negative_reasons
    }

def process_json_data(input_file, output_file):
    """Saving Aggregates"""
    try:
        with open(input_file, 'r', encoding='utf-8') as f: posts = json.load(f)
        if not posts: print("The input JSON file is empty."); return
        print(f"\nAnalyzing sentiment for {len(posts)} posts...")
        for i, post in enumerate(posts):
            title = post.get('title', '')
            content = post.get('content', '')
            full_text = title + ". " + content
            if 'metadata' not in post: post['metadata'] = {}
            if content == "Link post" or len(full_text.split()) < 5:
                post['metadata'].update({"sentiment": "not_applicable", "sentiment_score": 0.0, "full_text": "Post is a link or too short to analyze.", "positive_keywords": [], "negative_keywords": []})
            else:
                print(f"Processing post {i+1}/{len(posts)}...")
                sentiment_result = analyze_sentiment_with_finbert(full_text)
                keywords = extract_keywords(full_text)
                post['metadata'].update({"sentiment": sentiment_result['label'], "sentiment_score": sentiment_result['score'], "full_text": sentiment_result['full_text'], "positive_keywords": keywords['positive_keywords'], "negative_keywords": keywords['negative_keywords']})

        aggregate_result = get_aggregate_sentiment(posts)
        with open(output_file, 'w', encoding='utf-8') as f: json.dump(aggregate_result, f, ensure_ascii=False, indent=4)
        print(f"\nAggregate sentiment analysis complete. Results saved to {output_file}")
    except FileNotFoundError:
        print(f"Error: The file '{input_file}' was not found.")
    except Exception as e:
        print(f"An unexpected error occurred during processing: {e}")