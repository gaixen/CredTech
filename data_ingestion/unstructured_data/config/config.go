package config

import (
	"os"
	"fmt"
	"time"
)

type Config struct {
	Database   DatabaseConfig
	DataSources DataSourcesConfig
	Processing ProcessingConfig
}

type DatabaseConfig struct {
	Type        string
	URL         string
	MaxRetries  int
	RetryDelay  time.Duration
}

type DataSourcesConfig struct {
	Finnhub    FinnhubConfig
	Reuters    ReutersConfig
	Yahoo      YahooConfig
	NewsAPI    NewsAPIConfig
	MarketWatch MarketWatchConfig
	Bloomberg   BloombergConfig
	Kofin      KofinConfig
	FedNews    FedNewsConfig
}

type FinnhubConfig struct {
	APIKey      string
	WebSocketURL string
	RestAPIURL  string
	Enabled     bool
	Symbols     []string
	UpdateInterval time.Duration
}

type ReutersConfig struct {
	RSSFeedURL     string
	Enabled        bool
	UpdateInterval time.Duration
	Categories     []string
}

type YahooConfig struct {
	BaseURL        string
	Enabled        bool
	UpdateInterval time.Duration
	Symbols        []string
}

type NewsAPIConfig struct {
	APIKey         string
	BaseURL        string
	Enabled        bool
	UpdateInterval time.Duration
	Keywords       []string
	Sources        []string
}

type MarketWatchConfig struct {
	BaseURL        string
	Enabled        bool
	UpdateInterval time.Duration
	Sections       []string
}

type BloombergConfig struct {
	RSSFeedURL     string
	Enabled        bool
	UpdateInterval time.Duration
}

type KofinConfig struct {
	BaseURL        string
	Enabled        bool
	UpdateInterval time.Duration
	Categories     []string
}

type FedNewsConfig struct {
	BaseURL        string
	Enabled        bool
	UpdateInterval time.Duration
}

type ProcessingConfig struct {
	MaxWorkers     int
	QueueSize      int
	BatchSize      int
	ProcessTimeout time.Duration
}

func Load() *Config {
	return &Config{
		Database: DatabaseConfig{
			Type:       getEnv("DB_TYPE", "postgres"),
			URL:        getEnv("DB_URL", "postgres://user:password@localhost/credtech?sslmode=disable"),
			MaxRetries: 3,
			RetryDelay: 5 * time.Second,
		},
		DataSources: DataSourcesConfig{
			Finnhub: FinnhubConfig{
				APIKey:         getEnv("FINNHUB_API_KEY", ""),
				WebSocketURL:   "wss://ws.finnhub.io",
				RestAPIURL:     "https://finnhub.io/api/v1",
				Enabled:        getEnv("FINNHUB_ENABLED", "true") == "true",
				Symbols:        []string{"AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "JPM", "BAC", "WFC", "GS", "MS"},
				UpdateInterval: 30 * time.Second,
			},
			Reuters: ReutersConfig{
				RSSFeedURL:     "https://www.reuters.com/rssfeed/businessNews",
				Enabled:        getEnv("REUTERS_ENABLED", "true") == "true",
				UpdateInterval: 5 * time.Minute,
				Categories:     []string{"business", "markets", "finance", "economics"},
			},
			Yahoo: YahooConfig{
				BaseURL:        "https://finance.yahoo.com",
				Enabled:        getEnv("YAHOO_ENABLED", "true") == "true",
				UpdateInterval: 2 * time.Minute,
				Symbols:        []string{"AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "SPY", "QQQ", "IWM"},
			},
			NewsAPI: NewsAPIConfig{
				APIKey:         getEnv("NEWSAPI_KEY", ""),
				BaseURL:        "https://newsapi.org/v2",
				Enabled:        getEnv("NEWSAPI_ENABLED", "false") == "true",
				UpdateInterval: 10 * time.Minute,
				Keywords:       []string{"credit rating", "debt", "bankruptcy", "financial crisis", "earnings", "revenue"},
				Sources:        []string{"reuters", "bloomberg", "financial-times", "the-wall-street-journal"},
			},
			MarketWatch: MarketWatchConfig{
				BaseURL:        "https://www.marketwatch.com",
				Enabled:        getEnv("MARKETWATCH_ENABLED", "true") == "true",
				UpdateInterval: 5 * time.Minute,
				Sections:       []string{"markets", "economy", "personal-finance"},
			},
			Bloomberg: BloombergConfig{
				RSSFeedURL:     "https://feeds.bloomberg.com/markets/news.rss",
				Enabled:        getEnv("BLOOMBERG_ENABLED", "true") == "true",
				UpdateInterval: 3 * time.Minute,
			},
			Kofin: KofinConfig{
				BaseURL:        "https://kofin.com",
				Enabled:        getEnv("KOFIN_ENABLED", "true") == "true",
				UpdateInterval: 10 * time.Minute,
				Categories:     []string{"market-news", "corporate-finance", "macro-economics"},
			},
			FedNews: FedNewsConfig{
				BaseURL:        "https://www.federalreserve.gov",
				Enabled:        getEnv("FED_NEWS_ENABLED", "true") == "true",
				UpdateInterval: 30 * time.Minute,
			},
		},
		Processing: ProcessingConfig{
			MaxWorkers:     10,
			QueueSize:      1000,
			BatchSize:      50,
			ProcessTimeout: 30 * time.Second,
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// debugging to check if module working or not
// print the FINNHUB_API_KEY from .env using the getEnv function
func debugPrintEnv() {
	key := getEnv("FINNHUB_API_KEY", "")
	fmt.Println(key)
}

