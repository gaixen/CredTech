package ingestion

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/config"
	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/models"
	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/storage"
	"github.com/google/uuid"
)

type YahooSource struct {
	storage storage.Storage
	config  config.YahooConfig
	client  *http.Client
	enabled bool
}

type YahooNewsResponse struct {
	Items struct {
		Result []YahooNewsItem `json:"result"`
	} `json:"items"`
}

type YahooNewsItem struct {
	UUID      string `json:"uuid"`
	Title     string `json:"title"`
	Summary   string `json:"summary"`
	Publisher string `json:"publisher"`
	Link      string `json:"link"`
	ProviderPublishTime int64 `json:"providerPublishTime"`
	Type      string `json:"type"`
	Thumbnail struct {
		Resolutions []struct {
			URL    string `json:"url"`
			Width  int    `json:"width"`
			Height int    `json:"height"`
		} `json:"resolutions"`
	} `json:"thumbnail"`
	RelatedTickers []string `json:"relatedTickers"`
}

type YahooQuoteResponse struct {
	QuoteResponse struct {
		Result []YahooQuote `json:"result"`
		Error  interface{}  `json:"error"`
	} `json:"quoteResponse"`
}

type YahooQuote struct {
	Symbol                     string  `json:"symbol"`
	ShortName                  string  `json:"shortName"`
	LongName                   string  `json:"longName"`
	RegularMarketPrice         float64 `json:"regularMarketPrice"`
	RegularMarketChange        float64 `json:"regularMarketChange"`
	RegularMarketChangePercent float64 `json:"regularMarketChangePercent"`
	RegularMarketTime          int64   `json:"regularMarketTime"`
	RegularMarketVolume        int64   `json:"regularMarketVolume"`
	MarketCap                  int64   `json:"marketCap"`
	TrailingPE                 float64 `json:"trailingPE"`
	ForwardPE                  float64 `json:"forwardPE"`
	DividendYield              float64 `json:"dividendYield"`
	EpsTrailingTwelveMonths    float64 `json:"epsTrailingTwelveMonths"`
	PriceToBook                float64 `json:"priceToBook"`
	BookValue                  float64 `json:"bookValue"`
}

func NewYahooSource(store storage.Storage, cfg config.YahooConfig) *YahooSource {
	return &YahooSource{
		storage: store,
		config:  cfg,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		enabled: cfg.Enabled,
	}
}

func (y *YahooSource) Start(ctx context.Context) error {
	if !y.enabled {
		log.Println("Yahoo Finance source is disabled")
		return nil
	}

	log.Println("Starting Yahoo Finance data source...")

	// Start news ingestion
	go y.ingestNews(ctx)

	// Start financial data ingestion
	go y.ingestFinancialData(ctx)

	return nil
}

func (y *YahooSource) Stop(ctx context.Context) error {
	log.Println("Stopping Yahoo Finance source...")
	return nil
}

func (y *YahooSource) GetName() string {
	return "yahoo"
}

func (y *YahooSource) IsEnabled() bool {
	return y.enabled
}

func (y *YahooSource) ingestNews(ctx context.Context) {
	// Initial fetch
	if err := y.fetchNews(ctx); err != nil {
		log.Printf("Error in initial Yahoo news fetch: %v", err)
	}

	ticker := time.NewTicker(y.config.UpdateInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := y.fetchNews(ctx); err != nil {
				log.Printf("Error fetching Yahoo news: %v", err)
			}
		}
	}
}

func (y *YahooSource) ingestFinancialData(ctx context.Context) {
	// Financial data has a longer interval
	ticker := time.NewTicker(y.config.UpdateInterval * 2)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := y.fetchFinancialData(ctx); err != nil {
				log.Printf("Error fetching Yahoo financial data: %v", err)
			}
		}
	}
}

func (y *YahooSource) fetchNews(ctx context.Context) error {
	// Yahoo Finance news is typically accessed through their search API
	// This is a simplified approach - in production, you'd use official APIs
	
	for _, symbol := range y.config.Symbols {
		if err := y.fetchNewsForSymbol(ctx, symbol); err != nil {
			log.Printf("Error fetching news for symbol %s: %v", symbol, err)
		}
		
		// Rate limiting
		time.Sleep(1 * time.Second)
	}

	return nil
}

func (y *YahooSource) fetchNewsForSymbol(ctx context.Context, symbol string) error {
	// Construct news URL - this is a simplified approach
	newsURL := fmt.Sprintf("https://query2.finance.yahoo.com/v1/finance/search?q=%s&lang=en-US&region=US&quotesCount=1&newsCount=10", 
		url.QueryEscape(symbol))

	req, err := http.NewRequestWithContext(ctx, "GET", newsURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := y.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch news: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	// Parse JSON response
	var searchResponse map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&searchResponse); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	// Extract news items
	if news, ok := searchResponse["news"].([]interface{}); ok {
		for _, item := range news {
			if newsItem, ok := item.(map[string]interface{}); ok {
				if err := y.processYahooNewsItem(ctx, newsItem, symbol); err != nil {
					log.Printf("Error processing news item for %s: %v", symbol, err)
				}
			}
		}
	}

	return nil
}

func (y *YahooSource) processYahooNewsItem(ctx context.Context, item map[string]interface{}, symbol string) error {
	title, _ := item["title"].(string)
	link, _ := item["link"].(string)
	publisher, _ := item["publisher"].(string)
	
	if title == "" || link == "" {
		return nil // Skip incomplete items
	}

	// Create unique ID
	hash := md5.Sum([]byte(link + title))
	dataID := fmt.Sprintf("yahoo-%x", hash[:8])

	// Extract publish time
	var publishTime time.Time
	if providerTime, ok := item["providerPublishTime"].(float64); ok {
		publishTime = time.Unix(int64(providerTime), 0)
	} else {
		publishTime = time.Now()
	}

	// Extract summary
	summary, _ := item["summary"].(string)

	// Extract related tickers
	var relatedTickers []string
	if tickers, ok := item["relatedTickers"].([]interface{}); ok {
		for _, ticker := range tickers {
			if tickerStr, ok := ticker.(string); ok {
				relatedTickers = append(relatedTickers, tickerStr)
			}
		}
	}

	entities := y.extractEntities(title + " " + summary)

	data := &models.UnstructuredData{
		ID:          dataID,
		Source:      "yahoo_finance",
		Type:        "news",
		Title:       title,
		Content:     summary,
		URL:         link,
		Author:      publisher,
		PublishedAt: publishTime,
		IngestedAt:  time.Now(),
		Metadata: map[string]interface{}{
			"primary_symbol":   symbol,
			"related_tickers": relatedTickers,
			"publisher":       publisher,
		},
		Tags:     y.generateTags(title, summary, symbol),
		Entities: entities,
	}

	return y.storage.SaveUnstructuredData(ctx, data)
}

func (y *YahooSource) fetchFinancialData(ctx context.Context) error {
	// Join symbols for batch request
	symbolsStr := strings.Join(y.config.Symbols, ",")
	
	quoteURL := fmt.Sprintf("https://query1.finance.yahoo.com/v7/finance/quote?symbols=%s", 
		url.QueryEscape(symbolsStr))

	req, err := http.NewRequestWithContext(ctx, "GET", quoteURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := y.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch quotes: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var quoteResponse YahooQuoteResponse
	if err := json.NewDecoder(resp.Body).Decode(&quoteResponse); err != nil {
		return fmt.Errorf("failed to decode quote response: %w", err)
	}

	for _, quote := range quoteResponse.QuoteResponse.Result {
		if err := y.processFinancialData(ctx, quote); err != nil {
			log.Printf("Error processing financial data for %s: %v", quote.Symbol, err)
		}
	}

	log.Printf("Processed financial data for %d symbols", len(quoteResponse.QuoteResponse.Result))
	return nil
}

func (y *YahooSource) processFinancialData(ctx context.Context, quote YahooQuote) error {
	// Generate unique ID for this data point
	dataID := uuid.New().String()

	// Create content with key financial metrics
	content := fmt.Sprintf(`Financial Data for %s (%s):
		Price: $%.2f (%.2f%%)
		Volume: %d
		Market Cap: $%d
		P/E Ratio: %.2f
		P/B Ratio: %.2f
		EPS: $%.2f
		Dividend Yield: %.2f%%`,
		quote.Symbol, quote.ShortName, quote.RegularMarketPrice, quote.RegularMarketChangePercent,
		quote.RegularMarketVolume, quote.MarketCap, quote.TrailingPE, quote.PriceToBook,
		quote.EpsTrailingTwelveMonths, quote.DividendYield*100)

	title := fmt.Sprintf("%s Financial Update - $%.2f", quote.Symbol, quote.RegularMarketPrice)

	entities := []models.Entity{
		{
			Name:       quote.Symbol,
			Type:       "STOCK_SYMBOL",
			Confidence: 1.0,
			StartPos:   0,
			EndPos:     len(quote.Symbol),
		},
	}

	if quote.ShortName != "" {
		entities = append(entities, models.Entity{
			Name:       quote.ShortName,
			Type:       "ORG",
			Confidence: 0.9,
			StartPos:   len(quote.Symbol) + 1,
			EndPos:     len(quote.Symbol) + 1 + len(quote.ShortName),
		})
	}

	data := &models.UnstructuredData{
		ID:          dataID,
		Source:      "yahoo_finance",
		Type:        "financial_data",
		Title:       title,
		Content:     content,
		PublishedAt: time.Unix(quote.RegularMarketTime, 0),
		IngestedAt:  time.Now(),
		Metadata: map[string]interface{}{
			"symbol":           quote.Symbol,
			"short_name":       quote.ShortName,
			"long_name":        quote.LongName,
			"price":            quote.RegularMarketPrice,
			"change":           quote.RegularMarketChange,
			"change_percent":   quote.RegularMarketChangePercent,
			"volume":           quote.RegularMarketVolume,
			"market_cap":       quote.MarketCap,
			"trailing_pe":      quote.TrailingPE,
			"forward_pe":       quote.ForwardPE,
			"dividend_yield":   quote.DividendYield,
			"eps_ttm":          quote.EpsTrailingTwelveMonths,
			"price_to_book":    quote.PriceToBook,
			"book_value":       quote.BookValue,
		},
		Tags:     y.generateFinancialTags(quote),
		Entities: entities,
	}

	return y.storage.SaveUnstructuredData(ctx, data)
}

func (y *YahooSource) extractEntities(text string) []models.Entity {
	var entities []models.Entity
	
	// Extract stock symbols (uppercase patterns)
	symbolRegex := regexp.MustCompile(`\b[A-Z]{1,5}\b`)
	symbols := symbolRegex.FindAllString(text, -1)
	
	for _, symbol := range symbols {
		if len(symbol) >= 2 && len(symbol) <= 5 {
			entities = append(entities, models.Entity{
				Name:       symbol,
				Type:       "STOCK_SYMBOL",
				Confidence: 0.8,
				StartPos:   strings.Index(text, symbol),
				EndPos:     strings.Index(text, symbol) + len(symbol),
			})
		}
	}
	
	// Extract dollar amounts
	moneyRegex := regexp.MustCompile(`\$[\d,]+(?:\.\d{2})?`)
	amounts := moneyRegex.FindAllString(text, -1)
	
	for _, amount := range amounts {
		entities = append(entities, models.Entity{
			Name:       amount,
			Type:       "MONEY",
			Confidence: 0.9,
			StartPos:   strings.Index(text, amount),
			EndPos:     strings.Index(text, amount) + len(amount),
		})
	}
	
	return entities
}

func (y *YahooSource) generateTags(title, summary, symbol string) []string {
	tags := []string{"yahoo_finance", "financial_news", symbol}
	
	content := strings.ToLower(title + " " + summary)
	
	// Add content-based tags
	if strings.Contains(content, "earnings") {
		tags = append(tags, "earnings")
	}
	
	if strings.Contains(content, "dividend") {
		tags = append(tags, "dividend")
	}
	
	if strings.Contains(content, "merger") || strings.Contains(content, "acquisition") {
		tags = append(tags, "m_and_a")
	}
	
	if strings.Contains(content, "analyst") || strings.Contains(content, "rating") {
		tags = append(tags, "analyst_rating")
	}
	
	// Sentiment tags
	if strings.Contains(content, "beat") || strings.Contains(content, "exceed") || strings.Contains(content, "strong") {
		tags = append(tags, "positive_sentiment")
	}
	
	if strings.Contains(content, "miss") || strings.Contains(content, "weak") || strings.Contains(content, "decline") {
		tags = append(tags, "negative_sentiment")
	}
	
	return tags
}

func (y *YahooSource) generateFinancialTags(quote YahooQuote) []string {
	tags := []string{"yahoo_finance", "financial_data", "market_data", quote.Symbol}
	
	// Add tags based on financial metrics
	if quote.RegularMarketChangePercent > 5 {
		tags = append(tags, "significant_gain")
	} else if quote.RegularMarketChangePercent < -5 {
		tags = append(tags, "significant_loss")
	}
	
	if quote.RegularMarketVolume > 0 {
		tags = append(tags, "high_volume")
	}
	
	// PE ratio based tags
	if quote.TrailingPE > 0 && quote.TrailingPE < 15 {
		tags = append(tags, "low_pe")
	} else if quote.TrailingPE > 25 {
		tags = append(tags, "high_pe")
	}
	
	// Dividend yield tags
	if quote.DividendYield > 0.03 { // > 3%
		tags = append(tags, "dividend_stock")
	}
	
	return tags
}
