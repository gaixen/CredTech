import pandas as pd
import numpy as np
import requests
import nltk
import json
import os
import glob
from nltk.sentiment import SentimentIntensityAnalyzer
import re, string, glob

nltk.download('vader_lexicon')
nltk.download('stopwords')

sia = SentimentIntensityAnalyzer()

def load_data_from_directory(directory_path):
    data_list = []
    
    json_files = glob.glob(os.path.join(directory_path, "*.json"))
    
    for file_path in json_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            data_list.append(data)
    
    return data_list

data_dir = r'C:\Users\DELL\credtech\data_ingestion\unstructured_data\data\yahoo_finance'
all_data = load_data_from_directory(data_dir)

df = pd.DataFrame(all_data)

def convert_tweets_to_dataframe(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        tweets = f.readlines()
    tweets = [tweet.strip() for tweet in tweets if tweet.strip()]

    df = pd.DataFrame(tweets, columns=['text'])
    return df


chat_words = {
    'AFAIK':'As Far As I Know',
    'AFK':'Away From Keyboard',
    'ASAP':'As Soon As Possible',
    'FYI': 'For Your Information',
    'ASAP': 'As Soon As Possible',
    'BRB': 'Be Right Back',
    'BTW': 'By The Way',
    'OMG': 'Oh My God',
    'IMO': 'In My Opinion',
    'LOL': 'Laugh Out Loud',
    'TTYL': 'Talk To You Later',
    'GTG': 'Got To Go',
    'TTYT': 'Talk To You Tomorrow',
    'IDK': 'I do not Know',
    'TMI': 'Too Much Information',
    'IMHO': 'In My Humble Opinion',
    'ICYMI': 'In Case You Missed It',
    'AFAIK': 'As Far As I Know',
    'BTW': 'By The Way',
    'FAQ': 'Frequently Asked Questions',
    'TGIF': 'Thank God It is Friday',
    'FYA': 'For Your Action',
    'ICYMI': 'In Case You Missed It',
}

def replace_chat_words(text):
    for word, replacement in chat_words.items():
        text = text.replace(word, replacement)
    return text

df['title'] = df['title'].apply(replace_chat_words)

def remove_html_tags(text):
    pattern = re.compile('<.*?>')
    return pattern.sub(r'', text)

df['title'] = df['title'].apply(remove_html_tags)

def remove_url(text):
    pattern = re.compile(r'https?://\S+|www\.\S+')
    return pattern.sub(r'', text)

df['title'] = df['title'].apply(remove_url)

exclude = string.punctuation
def remove_punc(text):
    for char in exclude:
        text = text.replace(char , '')
    return text

df['title'] = df['title'].apply(remove_punc)

def remove_emoji(text):
    emoji_pattern = re.compile("["
                        u"\U0001F600-\U0001F64F" 
                        u"\U0001F300-\U0001F5FF"  
                        u"\U0001F680-\U0001F6FF"  
                        u"\U0001F1E0-\U0001F1FF" 
                        u"\U00002702-\U000027B0"
                        u"\U000024C2-\U0001F251"
                        "]+", flags=re.UNICODE)
    return emoji_pattern.sub(r'', text)

df['title'] = df['title'].apply(remove_emoji)


def remove_stopwords(text):
    new_text = []
    for word in text.split():
        if word in stopwords.words('english'):
            new_text.append('')
        else:
            new_text.append(word)
    x = new_text[:]
    new_text.clear()
    return " ".join(x)

df['title'] = df['title'].apply(remove_stopwords)



df[['neg', 'neu', 'pos', 'compound']] = df['title'].apply(
    lambda x: pd.Series(sia.polarity_scores(x)) if pd.notna(x) else pd.Series([0, 0, 0, 0])
)

df['sentiment'] = df['compound'].apply(
    lambda x: 'positive' if x >= 0.05 else ('negative' if x <= -0.05 else 'neutral')
)


positive_news = df[df['sentiment'] == 'positive'].nlargest(3, 'compound')
for idx, row in positive_news.iterrows():
    print(f"{row['compound']:.3f} | {row['title']}\n")

negative_news = df[df['sentiment'] == 'negative'].nsmallest(3, 'compound')
for idx, row in negative_news.iterrows():
    print(f"{row['compound']:.3f} | {row['title']}")



