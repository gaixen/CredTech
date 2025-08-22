import json
import os
import subprocess
import sqlite3
import psycopg2
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class NewsDataService:
    """Service to fetch and process news data from the Go backend"""
    
    def __init__(self, db_config: Dict = None):
        self.db_config = db_config or {
            'host': 'localhost',
            'port': 5432,
            'database': 'credtech',
            'user': 'postgres',
            'password': 'password'
        }
        
    def get_latest_news(self, limit: int = 50, category: str = None, symbols: List[str] = None) -> List[Dict]:
        """Fetch latest news articles from the database"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Base query
            query = """
                SELECT id, source, title, content, url, author, published_at, 
                       ingested_at, metadata, tags, category, symbols, summary, image_url
                FROM unstructured_data 
                WHERE type = 'news'
            """
            params = []
            
            # Add filters
            if category and category != 'general':
                query += " AND (category = %s OR %s = ANY(tags))"
                params.extend([category, category])
            
            if symbols:
                query += " AND symbols && %s"
                params.append(symbols)
            
            query += " ORDER BY published_at DESC LIMIT %s"
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            news_articles = []
            for row in rows:
                article = {
                    'id': row[0],
                    'source': row[1],
                    'headline': row[2],
                    'content': row[3],
                    'url': row[4],
                    'author': row[5],
                    'published_at': row[6].isoformat() if row[6] else None,
                    'ingested_at': row[7].isoformat() if row[7] else None,
                    'metadata': row[8] or {},
                    'tags': row[9] or [],
                    'category': row[10] or 'general',
                    'symbols': row[11] or [],
                    'summary': row[12] or '',
                    'image_url': row[13] or '',
                    'timestamp': self._format_timestamp(row[6]) if row[6] else 'Unknown',
                    'severity': self._determine_severity(row[2], row[3])
                }
                news_articles.append(article)
            
            cursor.close()
            conn.close()
            
            return news_articles
            
        except Exception as e:
            logger.error(f"Error fetching news: {e}")
            return self._get_mock_news(limit, category)
    
    def get_company_news(self, symbol: str, limit: int = 20) -> List[Dict]:
        """Get news specifically related to a company symbol"""
        return self.get_latest_news(limit=limit, symbols=[symbol.upper()])
    
    def get_news_by_category(self, category: str, limit: int = 30) -> List[Dict]:
        """Get news by specific category"""
        return self.get_latest_news(limit=limit, category=category)
    
    def search_news(self, query: str, limit: int = 25) -> List[Dict]:
        """Search news by keywords"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            search_query = """
                SELECT id, source, title, content, url, author, published_at, 
                       ingested_at, metadata, tags, category, symbols, summary, image_url
                FROM unstructured_data 
                WHERE type = 'news' 
                AND (title ILIKE %s OR content ILIKE %s OR %s = ANY(tags))
                ORDER BY published_at DESC 
                LIMIT %s
            """
            
            search_term = f"%{query}%"
            cursor.execute(search_query, [search_term, search_term, query, limit])
            rows = cursor.fetchall()
            
            news_articles = []
            for row in rows:
                article = {
                    'id': row[0],
                    'source': row[1],
                    'headline': row[2],
                    'content': row[3],
                    'url': row[4],
                    'author': row[5],
                    'published_at': row[6].isoformat() if row[6] else None,
                    'timestamp': self._format_timestamp(row[6]) if row[6] else 'Unknown',
                    'category': row[10] or 'general',
                    'symbols': row[11] or [],
                    'summary': row[12] or '',
                    'severity': self._determine_severity(row[2], row[3])
                }
                news_articles.append(article)
            
            cursor.close()
            conn.close()
            
            return news_articles
            
        except Exception as e:
            logger.error(f"Error searching news: {e}")
            return []
    
    def get_trending_symbols(self) -> List[Dict]:
        """Get symbols that are trending in news"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            query = """
                SELECT unnest(symbols) as symbol, COUNT(*) as mention_count
                FROM unstructured_data 
                WHERE type = 'news' 
                AND published_at >= %s
                AND symbols IS NOT NULL
                GROUP BY symbol
                ORDER BY mention_count DESC
                LIMIT 10
            """
            
            week_ago = datetime.now() - timedelta(days=7)
            cursor.execute(query, [week_ago])
            rows = cursor.fetchall()
            
            trending = [{'symbol': row[0], 'mentions': row[1]} for row in rows]
            
            cursor.close()
            conn.close()
            
            return trending
            
        except Exception as e:
            logger.error(f"Error getting trending symbols: {e}")
            return []
    
    def _format_timestamp(self, timestamp):
        """Format timestamp for display"""
        if not timestamp:
            return "Unknown"
        
        now = datetime.now()
        if timestamp.tzinfo:
            timestamp = timestamp.replace(tzinfo=None)
        
        diff = now - timestamp
        
        if diff.days > 0:
            return f"{diff.days} days ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hours ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minutes ago"
        else:
            return "Just now"
    
    def _determine_severity(self, title: str, content: str) -> str:
        """Determine news severity based on keywords"""
        high_severity_keywords = ['crisis', 'crash', 'collapse', 'emergency', 'scandal', 'investigation']
        medium_severity_keywords = ['decline', 'drop', 'concern', 'warning', 'volatility']
        
        text = (title + " " + (content or "")).lower()
        
        for keyword in high_severity_keywords:
            if keyword in text:
                return 'high'
        
        for keyword in medium_severity_keywords:
            if keyword in text:
                return 'medium'
        
        return 'low'
    
    def _get_mock_news(self, limit: int, category: str = None) -> List[Dict]:
        """Fallback mock news data when database is not available"""
        mock_articles = [
            {
                'id': '1',
                'source': 'Reuters',
                'headline': 'Federal Reserve Signals Potential Rate Changes Amid Economic Uncertainty',
                'content': 'The Federal Reserve indicated possible monetary policy adjustments as inflation concerns persist.',
                'url': '#',
                'author': 'Financial Reporter',
                'timestamp': '2 hours ago',
                'category': 'Monetary Policy',
                'symbols': ['SPY', 'DXY'],
                'summary': 'Fed considering policy changes due to inflation concerns.',
                'severity': 'high'
            },
            {
                'id': '2',
                'source': 'Bloomberg',
                'headline': 'Major Banks Report Strong Q3 Earnings Despite Credit Concerns',
                'content': 'Leading financial institutions show resilience with solid quarterly results.',
                'url': '#',
                'author': 'Banking Analyst',
                'timestamp': '4 hours ago',
                'category': 'Banking',
                'symbols': ['JPM', 'BAC', 'C'],
                'summary': 'Banks show strong Q3 performance despite market concerns.',
                'severity': 'medium'
            },
            {
                'id': '3',
                'source': 'Financial Times',
                'headline': 'Corporate Bond Spreads Widen as Market Volatility Increases',
                'content': 'Credit risk premiums rise across sectors amid economic uncertainty.',
                'url': '#',
                'author': 'Credit Market Specialist',
                'timestamp': '6 hours ago',
                'category': 'Credit Markets',
                'symbols': ['HYG', 'LQD', 'JNK'],
                'summary': 'Bond spreads widen due to increased market volatility.',
                'severity': 'medium'
            }
        ]
        
        return mock_articles[:limit]
