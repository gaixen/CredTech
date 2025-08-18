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

// MarketWatch Source
type MarketWatchSource struct {
	storage storage.Storage
	config  config.MarketWatchConfig
	client  *http.Client
	enabled bool
}

func NewMarketWatchSource(store storage.Storage, cfg config.MarketWatchConfig) *MarketWatchSource {
	return &MarketWatchSource{
		storage: store,
		config:  cfg,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		enabled: cfg.Enabled,
	}
}

func (m *MarketWatchSource) Start(ctx context.Context) error {
	if !m.enabled {
		log.Println("MarketWatch source is disabled")
		return nil
	}

	log.Println("Starting MarketWatch data source...")
	go m.ingestData(ctx)
	return nil
}

func (m *MarketWatchSource) Stop(ctx context.Context) error {
	log.Println("Stopping MarketWatch source...")
	return nil
}

func (m *MarketWatchSource) GetName() string {
	return "marketwatch"
}

func (m *MarketWatchSource) IsEnabled() bool {
	return m.enabled
}

func (m *MarketWatchSource) ingestData(ctx context.Context) {
	ticker := time.NewTicker(m.config.UpdateInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// MarketWatch RSS feeds
			rssUrls := []string{
				"https://feeds.marketwatch.com/marketwatch/topstories/",
				"https://feeds.marketwatch.com/marketwatch/marketpulse/",
			}
			
			for _, url := range rssUrls {
				if err := m.fetchRSS(ctx, url); err != nil {
					log.Printf("Error fetching MarketWatch RSS from %s: %v", url, err)
				}
			}
		}
	}
}

func (m *MarketWatchSource) fetchRSS(ctx context.Context, rssURL string) error {
	req, err := http.NewRequestWithContext(ctx, "GET", rssURL, nil)
	if err != nil {
		return err
	}

	req.Header.Set("User-Agent", "CredTech-DataIngestion/1.0")

	resp, err := m.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var feed RSSFeed
	if err := xml.NewDecoder(resp.Body).Decode(&feed); err != nil {
		return err
	}

	for _, item := range feed.Channel.Items {
		hash := md5.Sum([]byte(item.Link + item.Title))
		dataID := fmt.Sprintf("marketwatch-%x", hash[:8])

		pubDate, _ := time.Parse(time.RFC1123, item.PubDate)

		data := &models.UnstructuredData{
			ID:          dataID,
			Source:      "marketwatch",
			Type:        "news",
			Title:       item.Title,
			Content:     strings.ReplaceAll(item.Description, "<![CDATA[", ""),
			URL:         item.Link,
			Author:      "MarketWatch",
			PublishedAt: pubDate,
			IngestedAt:  time.Now(),
			Metadata: map[string]interface{}{
				"guid": item.GUID,
			},
			Tags: []string{"marketwatch", "financial_news"},
		}

		if err := m.storage.SaveUnstructuredData(ctx, data); err != nil {
			log.Printf("Error saving MarketWatch data: %v", err)
		}
	}

	return nil
}

// Bloomberg Source
type BloombergSource struct {
	storage storage.Storage
	config  config.BloombergConfig
	client  *http.Client
	enabled bool
}

func NewBloombergSource(store storage.Storage, cfg config.BloombergConfig) *BloombergSource {
	return &BloombergSource{
		storage: store,
		config:  cfg,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		enabled: cfg.Enabled,
	}
}

func (b *BloombergSource) Start(ctx context.Context) error {
	if !b.enabled {
		log.Println("Bloomberg source is disabled")
		return nil
	}

	log.Println("Starting Bloomberg data source...")
	go b.ingestData(ctx)
	return nil
}

func (b *BloombergSource) Stop(ctx context.Context) error {
	log.Println("Stopping Bloomberg source...")
	return nil
}

func (b *BloombergSource) GetName() string {
	return "bloomberg"
}

func (b *BloombergSource) IsEnabled() bool {
	return b.enabled
}

func (b *BloombergSource) ingestData(ctx context.Context) {
	ticker := time.NewTicker(b.config.UpdateInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := b.fetchRSS(ctx); err != nil {
				log.Printf("Error fetching Bloomberg RSS: %v", err)
			}
		}
	}
}

func (b *BloombergSource) fetchRSS(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, "GET", b.config.RSSFeedURL, nil)
	if err != nil {
		return err
	}

	req.Header.Set("User-Agent", "CredTech-DataIngestion/1.0")

	resp, err := b.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var feed RSSFeed
	if err := xml.NewDecoder(resp.Body).Decode(&feed); err != nil {
		return err
	}

	for _, item := range feed.Channel.Items {
		hash := md5.Sum([]byte(item.Link + item.Title))
		dataID := fmt.Sprintf("bloomberg-%x", hash[:8])

		pubDate, _ := time.Parse(time.RFC1123, item.PubDate)

		data := &models.UnstructuredData{
			ID:          dataID,
			Source:      "bloomberg",
			Type:        "news",
			Title:       item.Title,
			Content:     strings.ReplaceAll(item.Description, "<![CDATA[", ""),
			URL:         item.Link,
			Author:      "Bloomberg",
			PublishedAt: pubDate,
			IngestedAt:  time.Now(),
			Metadata: map[string]interface{}{
				"guid": item.GUID,
			},
			Tags: []string{"bloomberg", "financial_news"},
		}

		if err := b.storage.SaveUnstructuredData(ctx, data); err != nil {
			log.Printf("Error saving Bloomberg data: %v", err)
		}
	}

	return nil
}

// Kofin Source
type KofinSource struct {
	storage storage.Storage
	config  config.KofinConfig
	client  *http.Client
	enabled bool
}

func NewKofinSource(store storage.Storage, cfg config.KofinConfig) *KofinSource {
	return &KofinSource{
		storage: store,
		config:  cfg,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		enabled: cfg.Enabled,
	}
}

func (k *KofinSource) Start(ctx context.Context) error {
	if !k.enabled {
		log.Println("Kofin source is disabled")
		return nil
	}

	log.Println("Starting Kofin data source...")
	go k.ingestData(ctx)
	return nil
}

func (k *KofinSource) Stop(ctx context.Context) error {
	log.Println("Stopping Kofin source...")
	return nil
}

func (k *KofinSource) GetName() string {
	return "kofin"
}

func (k *KofinSource) IsEnabled() bool {
	return k.enabled
}

func (k *KofinSource) ingestData(ctx context.Context) {
	ticker := time.NewTicker(k.config.UpdateInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// Placeholder for Kofin data fetching
			log.Println("Fetching Kofin data... (placeholder)")
		}
	}
}

// Federal Reserve News Source
type FedNewsSource struct {
	storage storage.Storage
	config  config.FedNewsConfig
	client  *http.Client
	enabled bool
}

func NewFedNewsSource(store storage.Storage, cfg config.FedNewsConfig) *FedNewsSource {
	return &FedNewsSource{
		storage: store,
		config:  cfg,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		enabled: cfg.Enabled,
	}
}

func (f *FedNewsSource) Start(ctx context.Context) error {
	if !f.enabled {
		log.Println("Fed News source is disabled")
		return nil
	}

	log.Println("Starting Federal Reserve News data source...")
	go f.ingestData(ctx)
	return nil
}

func (f *FedNewsSource) Stop(ctx context.Context) error {
	log.Println("Stopping Fed News source...")
	return nil
}

func (f *FedNewsSource) GetName() string {
	return "fednews"
}

func (f *FedNewsSource) IsEnabled() bool {
	return f.enabled
}

func (f *FedNewsSource) ingestData(ctx context.Context) {
	ticker := time.NewTicker(f.config.UpdateInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := f.fetchFedNews(ctx); err != nil {
				log.Printf("Error fetching Fed news: %v", err)
			}
		}
	}
}

func (f *FedNewsSource) fetchFedNews(ctx context.Context) error {
	// Federal Reserve RSS feed
	rssURL := "https://www.federalreserve.gov/feeds/press_all.xml"
	
	req, err := http.NewRequestWithContext(ctx, "GET", rssURL, nil)
	if err != nil {
		return err
	}

	req.Header.Set("User-Agent", "CredTech-DataIngestion/1.0")

	resp, err := f.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var feed RSSFeed
	if err := xml.NewDecoder(resp.Body).Decode(&feed); err != nil {
		return err
	}

	for _, item := range feed.Channel.Items {
		hash := md5.Sum([]byte(item.Link + item.Title))
		dataID := fmt.Sprintf("fed-%x", hash[:8])

		pubDate, _ := time.Parse(time.RFC1123, item.PubDate)

		data := &models.UnstructuredData{
			ID:          dataID,
			Source:      "federal_reserve",
			Type:        "news",
			Title:       item.Title,
			Content:     strings.ReplaceAll(item.Description, "<![CDATA[", ""),
			URL:         item.Link,
			Author:      "Federal Reserve",
			PublishedAt: pubDate,
			IngestedAt:  time.Now(),
			Metadata: map[string]interface{}{
				"guid": item.GUID,
			},
			Tags: []string{"federal_reserve", "monetary_policy", "central_bank"},
		}

		if err := f.storage.SaveUnstructuredData(ctx, data); err != nil {
			log.Printf("Error saving Fed news data: %v", err)
		}
	}

	return nil
}
