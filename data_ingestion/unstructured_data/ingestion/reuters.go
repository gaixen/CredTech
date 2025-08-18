package ingestion

import (
	"context"
	"crypto/md5"
	"encoding/xml"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/config"
	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/models"
	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/storage"
)

type ReutersSource struct {
	storage storage.Storage
	config  config.ReutersConfig
	client  *http.Client
	enabled bool
}

type RSSFeed struct {
	XMLName xml.Name    `xml:"rss"`
	Channel RSSChannel  `xml:"channel"`
}

type RSSChannel struct {
	Title       string       `xml:"title"`
	Description string       `xml:"description"`
	Link        string       `xml:"link"`
	Items       []RSSItem    `xml:"item"`
}

type RSSItem struct {
	Title       string    `xml:"title"`
	Link        string    `xml:"link"`
	Description string    `xml:"description"`
	PubDate     string    `xml:"pubDate"`
	GUID        string    `xml:"guid"`
	Category    []string  `xml:"category"`
	Author      string    `xml:"author"`
	Source      RSSSource `xml:"source"`
}

type RSSSource struct {
	URL  string `xml:"url,attr"`
	Text string `xml:",chardata"`
}

func NewReutersSource(store storage.Storage, cfg config.ReutersConfig) *ReutersSource {
	return &ReutersSource{
		storage: store,
		config:  cfg,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		enabled: cfg.Enabled,
	}
}

func (r *ReutersSource) Start(ctx context.Context) error {
	if !r.enabled {
		log.Println("Reuters source is disabled")
		return nil
	}

	log.Println("Starting Reuters RSS data source...")

	go r.ingestRSS(ctx)

	return nil
}

func (r *ReutersSource) Stop(ctx context.Context) error {
	log.Println("Stopping Reuters source...")
	return nil
}

func (r *ReutersSource) GetName() string {
	return "reuters"
}

func (r *ReutersSource) IsEnabled() bool {
	return r.enabled
}

func (r *ReutersSource) ingestRSS(ctx context.Context) {
	
	if err := r.fetchRSSFeed(ctx); err != nil {
		log.Printf("Error in initial Reuters RSS fetch: %v", err)
	}

	ticker := time.NewTicker(r.config.UpdateInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := r.fetchRSSFeed(ctx); err != nil {
				log.Printf("Error fetching Reuters RSS: %v", err)
			}
		}
	}
}

func (r *ReutersSource) fetchRSSFeed(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, "GET", r.config.RSSFeedURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "CredTech-DataIngestion/1.0")

	resp, err := r.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch RSS feed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("RSS feed returned status %d", resp.StatusCode)
	}

	var feed RSSFeed
	if err := xml.NewDecoder(resp.Body).Decode(&feed); err != nil {
		return fmt.Errorf("failed to decode RSS feed: %w", err)
	}

	itemCount := 0
	for _, item := range feed.Channel.Items {
		if err := r.processRSSItem(ctx, item); err != nil {
			log.Printf("Error processing RSS item %s: %v", item.GUID, err)
		} else {
			itemCount++
		}
	}

	log.Printf("Processed %d Reuters RSS items", itemCount)
	return nil
}

func (r *ReutersSource) processRSSItem(ctx context.Context, item RSSItem) error {
	
	identifier := item.GUID
	if identifier == "" {
		identifier = item.Link
	}
	
	hash := md5.Sum([]byte(identifier))
	dataID := fmt.Sprintf("reuters-%x", hash[:8])

	pubDate, err := r.parseRSSDate(item.PubDate)
	if err != nil {
		log.Printf("Failed to parse date %s: %v", item.PubDate, err)
		pubDate = time.Now()
	}
	entities := r.extractEntities(item.Title + " " + item.Description)

	symbols := r.extractFinancialSymbols(item.Title + " " + item.Description)

	data := &models.UnstructuredData{
		ID:          dataID,
		Source:      "reuters",
		Type:        "news",
		Title:       item.Title,
		Content:     r.cleanDescription(item.Description),
		URL:         item.Link,
		Author:      r.extractAuthor(item),
		PublishedAt: pubDate,
		IngestedAt:  time.Now(),
		Metadata: map[string]interface{}{
			"guid":       item.GUID,
			"categories": item.Category,
			"symbols":    symbols,
			"rss_source": item.Source.Text,
		},
		Tags:     r.generateTags(item),
		Entities: entities,
	}

	return r.storage.SaveUnstructuredData(ctx, data)
}

func (r *ReutersSource) parseRSSDate(dateStr string) (time.Time, error) {
	// Common RSS date formats
	formats := []string{
		time.RFC1123,
		time.RFC1123Z,
		"Mon, 02 Jan 2006 15:04:05 -0700",
		"Mon, 2 Jan 2006 15:04:05 -0700",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05Z",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse date: %s", dateStr)
}

func (r *ReutersSource) cleanDescription(desc string) string {
	desc = strings.ReplaceAll(desc, "<![CDATA[", "")
	desc = strings.ReplaceAll(desc, "]]>", "")
	for strings.Contains(desc, "<") && strings.Contains(desc, ">") {
		start := strings.Index(desc, "<")
		end := strings.Index(desc[start:], ">")
		if end != -1 {
			desc = desc[:start] + desc[start+end+1:]
		} else {
			break
		}
	}
	
	return strings.TrimSpace(desc)
}

func (r *ReutersSource) extractAuthor(item RSSItem) string {
	if item.Author != "" {
		return item.Author
	}
	if item.Source.Text != "" {
		return item.Source.Text
	}
	return "Reuters"
}

func (r *ReutersSource) extractEntities(text string) []models.Entity {
	var entities []models.Entity
	
	words := strings.Fields(text)
	for i, word := range words {
		word = strings.Trim(word, ".,!?;:()")
		if len(word) > 2 && strings.Title(word) == word {
			if r.isLikelyOrganization(word) {
				entities = append(entities, models.Entity{
					Name:       word,
					Type:       "ORG",
					Confidence: 0.7,
					StartPos:   i * 6, 
					EndPos:     i*6 + len(word),
				})
			}
		}
	}
	
	return entities
}

func (r *ReutersSource) isLikelyOrganization(word string) bool {
	orgSuffixes := []string{"Corp", "Inc", "Ltd", "LLC", "Group", "Company", "Bank", "Fund"}
	
	for _, suffix := range orgSuffixes {
		if strings.HasSuffix(word, suffix) {
			return true
		}
	}
	return len(word) >= 4 && len(word) <= 20
}

func (r *ReutersSource) extractFinancialSymbols(text string) []string {
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

func (r *ReutersSource) generateTags(item RSSItem) []string {
	tags := []string{"reuters", "financial_news", "rss"}
	
	for _, category := range item.Category {
		if category != "" {
			tags = append(tags, strings.ToLower(strings.ReplaceAll(category, " ", "_")))
		}
	}
	
	content := strings.ToLower(item.Title + " " + item.Description)
	
	if strings.Contains(content, "stock") || strings.Contains(content, "share") {
		tags = append(tags, "stock_market")
	}
	
	if strings.Contains(content, "earnings") || strings.Contains(content, "profit") {
		tags = append(tags, "earnings")
	}
	
	if strings.Contains(content, "merger") || strings.Contains(content, "acquisition") {
		tags = append(tags, "m_and_a")
	}
	
	if strings.Contains(content, "debt") || strings.Contains(content, "credit") || strings.Contains(content, "rating") {
		tags = append(tags, "credit_rating")
	}
	
	if strings.Contains(content, "federal reserve") || strings.Contains(content, "fed") || strings.Contains(content, "interest rate") {
		tags = append(tags, "monetary_policy")
	}
	
	negativeWords := []string{"decline", "fall", "drop", "loss", "crisis", "bankruptcy", "default"}
	positiveWords := []string{"rise", "gain", "growth", "profit", "success", "breakthrough"}
	
	for _, word := range negativeWords {
		if strings.Contains(content, word) {
			tags = append(tags, "negative_sentiment")
			break
		}
	}
	
	for _, word := range positiveWords {
		if strings.Contains(content, word) {
			tags = append(tags, "positive_sentiment")
			break
		}
	}
	
	return tags
}
