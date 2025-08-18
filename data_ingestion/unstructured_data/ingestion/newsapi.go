package ingestion

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/config"
	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/models"
	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/storage"
)

type NewsAPISource struct {
	storage storage.Storage
	config  config.NewsAPIConfig
	client  *http.Client
	enabled bool
}

type NewsAPIResponse struct {
	Status       string        `json:"status"`
	TotalResults int           `json:"totalResults"`
	Articles     []NewsArticle `json:"articles"`
}

type NewsArticle struct {
	Source struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"source"`
	Author      string    `json:"author"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	URL         string    `json:"url"`
	URLToImage  string    `json:"urlToImage"`
	PublishedAt time.Time `json:"publishedAt"`
	Content     string    `json:"content"`
}

func NewNewsAPISource(store storage.Storage, cfg config.NewsAPIConfig) *NewsAPISource {
	return &NewsAPISource{
		storage: store,
		config:  cfg,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		enabled: cfg.Enabled && cfg.APIKey != "",
	}
}

func (n *NewsAPISource) Start(ctx context.Context) error {
	if !n.enabled {
		log.Println("NewsAPI source is disabled")
		return nil
	}

	log.Println("Starting NewsAPI data source...")

	// Start news ingestion
	go n.ingestNews(ctx)

	return nil
}

func (n *NewsAPISource) Stop(ctx context.Context) error {
	log.Println("Stopping NewsAPI source...")
	return nil
}

func (n *NewsAPISource) GetName() string {
	return "newsapi"
}

func (n *NewsAPISource) IsEnabled() bool {
	return n.enabled
}

func (n *NewsAPISource) ingestNews(ctx context.Context) {
	
	if err := n.fetchNews(ctx); err != nil {
		log.Printf("Error in initial NewsAPI fetch: %v", err)
	}

	ticker := time.NewTicker(n.config.UpdateInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := n.fetchNews(ctx); err != nil {
				log.Printf("Error fetching NewsAPI news: %v", err)
			}
		}
	}
}

func (n *NewsAPISource) fetchNews(ctx context.Context) error {
	
	for _, keyword := range n.config.Keywords {
		if err := n.fetchNewsForKeyword(ctx, keyword); err != nil {
			log.Printf("Error fetching news for keyword '%s': %v", keyword, err)
		}

		time.Sleep(2 * time.Second)
	}
	if len(n.config.Sources) > 0 {
		if err := n.fetchNewsFromSources(ctx); err != nil {
			log.Printf("Error fetching news from sources: %v", err)
		}
	}

	return nil
}

func (n *NewsAPISource) fetchNewsForKeyword(ctx context.Context, keyword string) error {
	
	params := url.Values{
		"q":        {keyword},
		"language": {"en"},
		"sortBy":   {"publishedAt"},
		"pageSize": {"20"},
		"apiKey":   {n.config.APIKey},
	}

	apiURL := fmt.Sprintf("%s/everything?%s", n.config.BaseURL, params.Encode())

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := n.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch news: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var newsResponse NewsAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&newsResponse); err != nil {
		return fmt.Errorf("failed to decode news response: %w", err)
	}

	for _, article := range newsResponse.Articles {
		if err := n.processNewsArticle(ctx, article, keyword); err != nil {
			log.Printf("Error processing news article %s: %v", article.URL, err)
		}
	}

	log.Printf("Processed %d NewsAPI articles for keyword '%s'", len(newsResponse.Articles), keyword)
	return nil
}

func (n *NewsAPISource) fetchNewsFromSources(ctx context.Context) error {
	sourcesStr := strings.Join(n.config.Sources, ",")

	params := url.Values{
		"sources":  {sourcesStr},
		"pageSize": {"50"},
		"apiKey":   {n.config.APIKey},
	}

	apiURL := fmt.Sprintf("%s/top-headlines?%s", n.config.BaseURL, params.Encode())

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := n.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch news: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var newsResponse NewsAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&newsResponse); err != nil {
		return fmt.Errorf("failed to decode news response: %w", err)
	}

	for _, article := range newsResponse.Articles {
		if err := n.processNewsArticle(ctx, article, "top-headlines"); err != nil {
			log.Printf("Error processing news article %s: %v", article.URL, err)
		}
	}

	log.Printf("Processed %d NewsAPI top headlines", len(newsResponse.Articles))
	return nil
}

func (n *NewsAPISource) processNewsArticle(ctx context.Context, article NewsArticle, searchTerm string) error {
	
	hash := md5.Sum([]byte(article.URL + article.Title))
	dataID := fmt.Sprintf("newsapi-%x", hash[:8])

	
	entities := n.extractEntities(article.Title + " " + article.Description + " " + article.Content)

	
	symbols := n.extractFinancialSymbols(article.Title + " " + article.Description + " " + article.Content)

	
	content := article.Content
	if content == "" {
		content = article.Description
	}

	data := &models.UnstructuredData{
		ID:          dataID,
		Source:      "newsapi",
		Type:        "news",
		Title:       article.Title,
		Content:     content,
		URL:         article.URL,
		Author:      n.getAuthor(article),
		PublishedAt: article.PublishedAt,
		IngestedAt:  time.Now(),
		Metadata: map[string]interface{}{
			"source_id":   article.Source.ID,
			"source_name": article.Source.Name,
			"image_url":   article.URLToImage,
			"search_term": searchTerm,
			"symbols":     symbols,
		},
		Tags:     n.generateTags(article, searchTerm),
		Entities: entities,
	}

	return n.storage.SaveUnstructuredData(ctx, data)
}

func (n *NewsAPISource) getAuthor(article NewsArticle) string {
	if article.Author != "" {
		return article.Author
	}
	if article.Source.Name != "" {
		return article.Source.Name
	}
	return "Unknown"
}

func (n *NewsAPISource) extractEntities(text string) []models.Entity {
	var entities []models.Entity

	words := strings.Fields(text)

	for i, word := range words {
		word = strings.Trim(word, ".,!?;:()")

		if len(word) > 2 && strings.Title(word) == word {
			if n.isLikelyOrganization(word) {
				entities = append(entities, models.Entity{
					Name:       word,
					Type:       "ORG",
					Confidence: 0.7,
					StartPos:   i * 6,
					EndPos:     i*6 + len(word),
				})
			}
		}
		if len(word) >= 2 && len(word) <= 5 && strings.ToUpper(word) == word {
			entities = append(entities, models.Entity{
				Name:       word,
				Type:       "STOCK_SYMBOL",
				Confidence: 0.6,
				StartPos:   i * 6,
				EndPos:     i*6 + len(word),
			})
		}
	}

	content := text
	dollarIndex := strings.Index(content, "$")
	if dollarIndex != -1 {
		entities = append(entities, models.Entity{
			Name:       "MONEY_AMOUNT",
			Type:       "MONEY",
			Confidence: 0.8,
			StartPos:   dollarIndex,
			EndPos:     dollarIndex + 10, 
		})
	}

	return entities
}

func (n *NewsAPISource) isLikelyOrganization(word string) bool {
	orgSuffixes := []string{"Corp", "Inc", "Ltd", "LLC", "Group", "Company", "Bank", "Fund", "Trust", "Holdings"}

	for _, suffix := range orgSuffixes {
		if strings.HasSuffix(word, suffix) {
			return true
		}
	}
	commonOrgs := []string{"Apple", "Google", "Microsoft", "Amazon", "Tesla", "Meta", "Netflix", "Goldman", "Morgan", "JPMorgan", "Bank", "Federal", "Reserve", "Treasury"}

	for _, org := range commonOrgs {
		if strings.Contains(word, org) {
			return true
		}
	}

	return len(word) >= 4 && len(word) <= 20
}

func (n *NewsAPISource) extractFinancialSymbols(text string) []string {
	var symbols []string
	words := strings.Fields(text)

	for _, word := range words {
		word = strings.Trim(word, ".,!?;:()")
		if len(word) >= 2 && len(word) <= 5 && strings.ToUpper(word) == word && strings.ToLower(word) != word {
			symbols = append(symbols, word)
		}
	}

	return symbols
}

func (n *NewsAPISource) generateTags(article NewsArticle, searchTerm string) []string {
	tags := []string{"newsapi", "financial_news", searchTerm}

	if article.Source.Name != "" {
		sourceName := strings.ToLower(strings.ReplaceAll(article.Source.Name, " ", "_"))
		tags = append(tags, sourceName)
	}
	content := strings.ToLower(article.Title + " " + article.Description + " " + article.Content)

	if strings.Contains(content, "stock") || strings.Contains(content, "share") || strings.Contains(content, "equity") {
		tags = append(tags, "stock_market")
	}

	if strings.Contains(content, "bond") || strings.Contains(content, "debt") || strings.Contains(content, "credit") {
		tags = append(tags, "debt_market")
	}

	if strings.Contains(content, "earnings") || strings.Contains(content, "quarterly") || strings.Contains(content, "profit") {
		tags = append(tags, "earnings")
	}

	if strings.Contains(content, "merger") || strings.Contains(content, "acquisition") || strings.Contains(content, "buyout") {
		tags = append(tags, "m_and_a")
	}

	if strings.Contains(content, "ipo") || strings.Contains(content, "public offering") {
		tags = append(tags, "ipo")
	}

	if strings.Contains(content, "federal reserve") || strings.Contains(content, "fed") || strings.Contains(content, "interest rate") {
		tags = append(tags, "monetary_policy")
	}

	if strings.Contains(content, "inflation") || strings.Contains(content, "deflation") {
		tags = append(tags, "inflation")
	}

	if strings.Contains(content, "gdp") || strings.Contains(content, "economic growth") {
		tags = append(tags, "economic_indicators")
	}

	if strings.Contains(content, "unemployment") || strings.Contains(content, "jobs") || strings.Contains(content, "employment") {
		tags = append(tags, "employment")
	}
	positiveWords := []string{"gain", "rise", "growth", "profit", "success", "beat", "exceed", "strong", "positive", "bull"}
	negativeWords := []string{"loss", "decline", "fall", "crisis", "bankruptcy", "miss", "weak", "negative", "bear", "recession"}

	positiveCount := 0
	negativeCount := 0

	for _, word := range positiveWords {
		if strings.Contains(content, word) {
			positiveCount++
		}
	}

	for _, word := range negativeWords {
		if strings.Contains(content, word) {
			negativeCount++
		}
	}

	if positiveCount > negativeCount && positiveCount > 0 {
		tags = append(tags, "positive_sentiment")
	} else if negativeCount > positiveCount && negativeCount > 0 {
		tags = append(tags, "negative_sentiment")
	}
	if strings.Contains(content, "tech") || strings.Contains(content, "technology") || strings.Contains(content, "software") {
		tags = append(tags, "technology")
	}

	if strings.Contains(content, "bank") || strings.Contains(content, "financial") {
		tags = append(tags, "banking")
	}

	if strings.Contains(content, "energy") || strings.Contains(content, "oil") || strings.Contains(content, "gas") {
		tags = append(tags, "energy")
	}

	if strings.Contains(content, "healthcare") || strings.Contains(content, "pharma") || strings.Contains(content, "drug") {
		tags = append(tags, "healthcare")
	}

	return tags
}
