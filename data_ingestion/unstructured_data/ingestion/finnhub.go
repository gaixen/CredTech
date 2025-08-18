package ingestion

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/config"
	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/models"
	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/storage"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type FinnhubSource struct {
	storage storage.Storage
	config  config.FinnhubConfig
	client  *http.Client
	conn    *websocket.Conn
	enabled bool
}

type FinnhubNewsResponse struct {
	Category string `json:"category"`
	DateTime int64  `json:"datetime"`
	Headline string `json:"headline"`
	ID       int    `json:"id"`
	Image    string `json:"image"`
	Related  string `json:"related"`
	Source   string `json:"source"`
	Summary  string `json:"summary"`
	URL      string `json:"url"`
}

type FinnhubWebSocketMessage struct {
	Data []FinnhubTradeData `json:"data"`
	Type string             `json:"type"`
}

type FinnhubTradeData struct {
	Price     float64 `json:"p"`
	Symbol    string  `json:"s"`
	Timestamp int64   `json:"t"`
	Volume    float64 `json:"v"`
}

func NewFinnhubSource(store storage.Storage, cfg config.FinnhubConfig) *FinnhubSource {
	return &FinnhubSource{
		storage: store,
		config:  cfg,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		enabled: cfg.Enabled && cfg.APIKey != "",
	}
}

func (f *FinnhubSource) Start(ctx context.Context) error {
	if !f.enabled {
		log.Println("Finnhub source is disabled")
		return nil
	}

	log.Println("Starting Finnhub data source...")

	// Start news ingestion
	go f.ingestNews(ctx)

	// Start WebSocket connection for real-time data
	go f.startWebSocket(ctx)

	return nil
}

func (f *FinnhubSource) Stop(ctx context.Context) error {
	log.Println("Stopping Finnhub source...")

	if f.conn != nil {
		f.conn.Close()
	}

	return nil
}

func (f *FinnhubSource) GetName() string {
	return "finnhub"
}

func (f *FinnhubSource) IsEnabled() bool {
	return f.enabled
}

func (f *FinnhubSource) ingestNews(ctx context.Context) {
	ticker := time.NewTicker(f.config.UpdateInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := f.fetchNews(ctx); err != nil {
				log.Printf("Error fetching Finnhub news: %v", err)
			}
		}
	}
}

func (f *FinnhubSource) fetchNews(ctx context.Context) error {
	// Get news for today
	from := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	to := time.Now().Format("2006-01-02")

	newsURL := fmt.Sprintf("%s/news?category=general&from=%s&to=%s&token=%s",
		f.config.RestAPIURL, from, to, f.config.APIKey)

	req, err := http.NewRequestWithContext(ctx, "GET", newsURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := f.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch news: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var newsItems []FinnhubNewsResponse
	if err := json.NewDecoder(resp.Body).Decode(&newsItems); err != nil {
		return fmt.Errorf("failed to decode news response: %w", err)
	}

	for _, item := range newsItems {
		if err := f.processNewsItem(ctx, item); err != nil {
			log.Printf("Error processing news item %d: %v", item.ID, err)
		}
	}

	log.Printf("Processed %d Finnhub news items", len(newsItems))
	return nil
}

func (f *FinnhubSource) processNewsItem(ctx context.Context, item FinnhubNewsResponse) error {
	
	hash := md5.Sum([]byte(item.URL + item.Headline))
	dataID := fmt.Sprintf("finnhub-%x", hash[:8])

	symbols := f.extractSymbols(item.Related)

	entities := f.extractEntities(item.Headline + " " + item.Summary)

	data := &models.UnstructuredData{
		ID:          dataID,
		Source:      "finnhub",
		Type:        "news",
		Title:       item.Headline,
		Content:     item.Summary,
		URL:         item.URL,
		Author:      item.Source,
		PublishedAt: time.Unix(item.DateTime, 0),
		IngestedAt:  time.Now(),
		Metadata: map[string]interface{}{
			"category":   item.Category,
			"image_url":  item.Image,
			"symbols":    symbols,
			"finnhub_id": item.ID,
		},
		Tags:     f.generateTags(item),
		Entities: entities,
	}

	return f.storage.SaveUnstructuredData(ctx, data)
}

func (f *FinnhubSource) extractSymbols(related string) []string {
	if related == "" {
		return []string{}
	}

	symbols := strings.Split(related, ",")
	var result []string
	for _, symbol := range symbols {
		symbol = strings.TrimSpace(symbol)
		if symbol != "" {
			result = append(result, symbol)
		}
	}
	return result
}

func (f *FinnhubSource) extractEntities(text string) []models.Entity {
	var entities []models.Entity

	words := strings.Fields(text)
	for i, word := range words {
		word = strings.Trim(word, ".,!?;:")
		if len(word) >= 3 && len(word) <= 5 && strings.ToUpper(word) == word {
			entities = append(entities, models.Entity{
				Name:       word,
				Type:       "STOCK_SYMBOL",
				Confidence: 0.8,
				StartPos:   i * 5, 
				EndPos:     i*5 + len(word),
			})
		}
	}

	return entities
}

func (f *FinnhubSource) generateTags(item FinnhubNewsResponse) []string {
	tags := []string{"finnhub", "financial_news"}

	if item.Category != "" {
		tags = append(tags, item.Category)
	}

	headline := strings.ToLower(item.Headline)
	summary := strings.ToLower(item.Summary)

	negativeKeywords := []string{"loss", "decline", "drop", "fall", "bankruptcy", "debt", "crisis"}
	positiveKeywords := []string{"gain", "rise", "growth", "profit", "success", "breakthrough"}

	for _, keyword := range negativeKeywords {
		if strings.Contains(headline, keyword) || strings.Contains(summary, keyword) {
			tags = append(tags, "negative_sentiment")
			break
		}
	}

	for _, keyword := range positiveKeywords {
		if strings.Contains(headline, keyword) || strings.Contains(summary, keyword) {
			tags = append(tags, "positive_sentiment")
			break
		}
	}

	return tags
}

func (f *FinnhubSource) startWebSocket(ctx context.Context) {
	if f.config.APIKey == "" {
		log.Println("Finnhub API key not provided, skipping WebSocket connection")
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
			if err := f.connectWebSocket(ctx); err != nil {
				log.Printf("WebSocket connection error: %v", err)
				time.Sleep(30 * time.Second) // Wait before reconnecting
			}
		}
	}
}

func (f *FinnhubSource) connectWebSocket(ctx context.Context) error {
	wsURL := fmt.Sprintf("%s?token=%s", f.config.WebSocketURL, f.config.APIKey)

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		return fmt.Errorf("failed to connect to WebSocket: %w", err)
	}

	f.conn = conn
	defer conn.Close()

	// Subscribe to symbols
	for _, symbol := range f.config.Symbols {
		msg := map[string]interface{}{
			"type":   "subscribe",
			"symbol": symbol,
		}
		if err := conn.WriteJSON(msg); err != nil {
			return fmt.Errorf("failed to subscribe to symbol %s: %w", symbol, err)
		}
	}

	log.Printf("Connected to Finnhub WebSocket, subscribed to %d symbols", len(f.config.Symbols))

	// Listen for messages
	for {
		select {
		case <-ctx.Done():
			return nil
		default:
			var msg FinnhubWebSocketMessage
			if err := conn.ReadJSON(&msg); err != nil {
				return fmt.Errorf("failed to read WebSocket message: %w", err)
			}

			if msg.Type == "trade" {
				f.processTradeData(ctx, msg.Data)
			}
		}
	}
}

func (f *FinnhubSource) processTradeData(ctx context.Context, trades []FinnhubTradeData) {
	for _, trade := range trades {
		data := &models.UnstructuredData{
			ID:          uuid.New().String(),
			Source:      "finnhub_realtime",
			Type:        "market_data",
			Title:       fmt.Sprintf("%s Trade at $%.2f", trade.Symbol, trade.Price),
			Content:     fmt.Sprintf("Symbol: %s, Price: $%.2f, Volume: %.0f", trade.Symbol, trade.Price, trade.Volume),
			PublishedAt: time.Unix(trade.Timestamp/1000, 0),
			IngestedAt:  time.Now(),
			Metadata: map[string]interface{}{
				"symbol":    trade.Symbol,
				"price":     trade.Price,
				"volume":    trade.Volume,
				"timestamp": trade.Timestamp,
			},
			Tags: []string{"finnhub", "real_time", "trade_data", trade.Symbol},
		}

		if err := f.storage.SaveUnstructuredData(ctx, data); err != nil {
			log.Printf("Error saving trade data: %v", err)
		}
	}
}
