package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

// FinancialData represents stock information
type FinancialData struct {
	Symbol     string  `json:"symbol"`
	Company    string  `json:"company"`
	Price      float64 `json:"current_price"`
	MarketCap  int64   `json:"market_cap"`
	PERatio    float64 `json:"pe_ratio"`
	DebtEquity float64 `json:"debt_to_equity"`
	Sector     string  `json:"sector"`
	Industry   string  `json:"industry"`
	Volume     int64   `json:"volume"`
	Change     float64 `json:"change"`
	ChangePerc float64 `json:"change_percent"`
	Timestamp  string  `json:"timestamp"`
}

// CacheEntry holds cached data with expiration
type CacheEntry struct {
	Data      interface{}
	ExpiresAt time.Time
}

// Cache provides thread-safe caching with TTL
type Cache struct {
	data map[string]CacheEntry
	mu   sync.RWMutex
	ttl  time.Duration
}

// NewCache creates a new cache with specified TTL
func NewCache(ttl time.Duration) *Cache {
	cache := &Cache{
		data: make(map[string]CacheEntry),
		ttl:  ttl,
	}

	// Start cleanup goroutine
	go cache.cleanup()
	return cache
}

// Get retrieves data from cache if not expired
func (c *Cache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, exists := c.data[key]
	if !exists || time.Now().After(entry.ExpiresAt) {
		return nil, false
	}

	return entry.Data, true
}

// Set stores data in cache with TTL
func (c *Cache) Set(key string, value interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.data[key] = CacheEntry{
		Data:      value,
		ExpiresAt: time.Now().Add(c.ttl),
	}
}

// cleanup removes expired entries
func (c *Cache) cleanup() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for key, entry := range c.data {
			if now.After(entry.ExpiresAt) {
				delete(c.data, key)
			}
		}
		c.mu.Unlock()
	}
}

// YahooFinanceAPI handles API calls to Yahoo Finance
type YahooFinanceAPI struct {
	client *http.Client
	cache  *Cache
}

// NewYahooFinanceAPI creates a new API client
func NewYahooFinanceAPI() *YahooFinanceAPI {
	return &YahooFinanceAPI{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		cache: NewCache(5 * time.Minute), // 5-minute cache
	}
}

// GetStockData fetches stock data with caching
func (yf *YahooFinanceAPI) GetStockData(symbol string) (*FinancialData, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("stock_%s", strings.ToUpper(symbol))
	if cached, found := yf.cache.Get(cacheKey); found {
		if data, ok := cached.(*FinancialData); ok {
			log.Printf("Cache hit for %s", symbol)
			return data, nil
		}
	}

	// Fetch from Yahoo Finance API
	data, err := yf.fetchFromYahoo(symbol)
	if err != nil {
		return nil, err
	}

	// Cache the result
	yf.cache.Set(cacheKey, data)
	log.Printf("Fetched and cached data for %s", symbol)

	return data, nil
}

// fetchFromYahoo makes the actual API call
func (yf *YahooFinanceAPI) fetchFromYahoo(symbol string) (*FinancialData, error) {
	// Yahoo Finance query URL
	url := fmt.Sprintf("https://query1.finance.yahoo.com/v8/finance/chart/%s", strings.ToUpper(symbol))

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	// Set headers
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := yf.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("making request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	// Parse Yahoo Finance response
	var yahooResp struct {
		Chart struct {
			Result []struct {
				Meta struct {
					Symbol               string  `json:"symbol"`
					ExchangeName         string  `json:"exchangeName"`
					InstrumentType       string  `json:"instrumentType"`
					FirstTradeDate       int64   `json:"firstTradeDate"`
					RegularMarketTime    int64   `json:"regularMarketTime"`
					Gmtoffset            int     `json:"gmtoffset"`
					Timezone             string  `json:"timezone"`
					ExchangeTimezoneName string  `json:"exchangeTimezoneName"`
					RegularMarketPrice   float64 `json:"regularMarketPrice"`
					ChartPreviousClose   float64 `json:"chartPreviousClose"`
					PreviousClose        float64 `json:"previousClose"`
					Scale                int     `json:"scale"`
					PriceHint            int     `json:"priceHint"`
					CurrentTradingPeriod struct {
						Pre struct {
							Timezone  string `json:"timezone"`
							Start     int64  `json:"start"`
							End       int64  `json:"end"`
							Gmtoffset int    `json:"gmtoffset"`
						} `json:"pre"`
						Regular struct {
							Timezone  string `json:"timezone"`
							Start     int64  `json:"start"`
							End       int64  `json:"end"`
							Gmtoffset int    `json:"gmtoffset"`
						} `json:"regular"`
						Post struct {
							Timezone  string `json:"timezone"`
							Start     int64  `json:"start"`
							End       int64  `json:"end"`
							Gmtoffset int    `json:"gmtoffset"`
						} `json:"post"`
					} `json:"currentTradingPeriod"`
					TradingPeriods [][]struct {
						Timezone  string `json:"timezone"`
						Start     int64  `json:"start"`
						End       int64  `json:"end"`
						Gmtoffset int    `json:"gmtoffset"`
					} `json:"tradingPeriods"`
					DataGranularity string   `json:"dataGranularity"`
					Range           string   `json:"range"`
					ValidRanges     []string `json:"validRanges"`
				} `json:"meta"`
				Timestamp  []int64 `json:"timestamp"`
				Indicators struct {
					Quote []struct {
						Open   []float64 `json:"open"`
						Low    []float64 `json:"low"`
						High   []float64 `json:"high"`
						Close  []float64 `json:"close"`
						Volume []int64   `json:"volume"`
					} `json:"quote"`
				} `json:"indicators"`
			} `json:"result"`
		} `json:"chart"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&yahooResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	if len(yahooResp.Chart.Result) == 0 {
		return nil, fmt.Errorf("no data found for symbol %s", symbol)
	}

	result := yahooResp.Chart.Result[0]
	meta := result.Meta

	// Calculate change and change percentage
	currentPrice := meta.RegularMarketPrice
	previousClose := meta.PreviousClose
	change := currentPrice - previousClose
	changePerc := (change / previousClose) * 100

	// Get latest volume
	var volume int64
	if len(result.Indicators.Quote) > 0 && len(result.Indicators.Quote[0].Volume) > 0 {
		volumes := result.Indicators.Quote[0].Volume
		volume = volumes[len(volumes)-1]
	}

	return &FinancialData{
		Symbol:     strings.ToUpper(symbol),
		Company:    meta.Symbol, // This might need enhancement with company name lookup
		Price:      currentPrice,
		MarketCap:  0,  // Would need additional API call
		PERatio:    0,  // Would need additional API call
		DebtEquity: 0,  // Would need additional API call
		Sector:     "", // Would need additional API call
		Industry:   "", // Would need additional API call
		Volume:     volume,
		Change:     change,
		ChangePerc: changePerc,
		Timestamp:  time.Now().Format(time.RFC3339),
	}, nil
}

// GetMultipleStocks fetches data for multiple stocks concurrently
func (yf *YahooFinanceAPI) GetMultipleStocks(symbols []string) (map[string]*FinancialData, error) {
	results := make(map[string]*FinancialData)
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Limit concurrent requests
	semaphore := make(chan struct{}, 5)

	for _, symbol := range symbols {
		wg.Add(1)
		go func(sym string) {
			defer wg.Done()
			semaphore <- struct{}{}        // Acquire semaphore
			defer func() { <-semaphore }() // Release semaphore

			data, err := yf.GetStockData(sym)
			if err != nil {
				log.Printf("Error fetching %s: %v", sym, err)
				return
			}

			mu.Lock()
			results[sym] = data
			mu.Unlock()
		}(symbol)
	}

	wg.Wait()
	return results, nil
}

// CreditMetrics represents credit-relevant financial metrics
type CreditMetrics struct {
	Symbol         string  `json:"symbol"`
	Company        string  `json:"company"`
	DebtToEquity   float64 `json:"debt_to_equity"`
	CurrentRatio   float64 `json:"current_ratio"`
	QuickRatio     float64 `json:"quick_ratio"`
	TotalDebt      int64   `json:"total_debt"`
	TotalCash      int64   `json:"total_cash"`
	ProfitMargins  float64 `json:"profit_margins"`
	ReturnOnEquity float64 `json:"return_on_equity"`
	OverallRisk    string  `json:"overall_risk"`
	CreditRating   string  `json:"credit_rating"`
	Timestamp      string  `json:"timestamp"`
}

// GetCreditMetrics fetches credit-relevant metrics (would need enhancement for full data)
func (yf *YahooFinanceAPI) GetCreditMetrics(symbol string) (*CreditMetrics, error) {
	// This is a simplified version - for full credit metrics, you'd need additional APIs
	stockData, err := yf.GetStockData(symbol)
	if err != nil {
		return nil, err
	}

	return &CreditMetrics{
		Symbol:         stockData.Symbol,
		Company:        stockData.Company,
		DebtToEquity:   0,               // Would need fundamental data API
		CurrentRatio:   0,               // Would need fundamental data API
		QuickRatio:     0,               // Would need fundamental data API
		TotalDebt:      0,               // Would need fundamental data API
		TotalCash:      0,               // Would need fundamental data API
		ProfitMargins:  0,               // Would need fundamental data API
		ReturnOnEquity: 0,               // Would need fundamental data API
		OverallRisk:    "Unknown",       // Would need risk assessment
		CreditRating:   "Not Available", // Would need credit rating API
		Timestamp:      time.Now().Format(time.RFC3339),
	}, nil
}

// Server represents the HTTP server for the financial API
type Server struct {
	api *YahooFinanceAPI
}

// NewServer creates a new server instance
func NewServer() *Server {
	return &Server{
		api: NewYahooFinanceAPI(),
	}
}

// handleStock handles single stock requests
func (s *Server) handleStock(w http.ResponseWriter, r *http.Request) {
	symbol := r.URL.Query().Get("symbol")
	if symbol == "" {
		http.Error(w, "symbol parameter is required", http.StatusBadRequest)
		return
	}

	start := time.Now()
	data, err := s.api.GetStockData(symbol)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Response-Time", time.Since(start).String())
	json.NewEncoder(w).Encode(data)
}

// handleMultipleStocks handles multiple stock requests
func (s *Server) handleMultipleStocks(w http.ResponseWriter, r *http.Request) {
	symbolsParam := r.URL.Query().Get("symbols")
	if symbolsParam == "" {
		http.Error(w, "symbols parameter is required", http.StatusBadRequest)
		return
	}

	symbols := strings.Split(symbolsParam, ",")
	for i, symbol := range symbols {
		symbols[i] = strings.TrimSpace(symbol)
	}

	start := time.Now()
	data, err := s.api.GetMultipleStocks(symbols)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Response-Time", time.Since(start).String())
	json.NewEncoder(w).Encode(data)
}

// handleCreditMetrics handles credit metrics requests
func (s *Server) handleCreditMetrics(w http.ResponseWriter, r *http.Request) {
	symbol := r.URL.Query().Get("symbol")
	if symbol == "" {
		http.Error(w, "symbol parameter is required", http.StatusBadRequest)
		return
	}

	start := time.Now()
	data, err := s.api.GetCreditMetrics(symbol)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Response-Time", time.Since(start).String())
	json.NewEncoder(w).Encode(data)
}

// handleHealth handles health check requests
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	response := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().Format(time.RFC3339),
		"service":   "yahoo-finance-go",
		"version":   "1.0.0",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func main() {
	server := NewServer()

	// Set up routes
	http.HandleFunc("/stock", server.handleStock)
	http.HandleFunc("/stocks", server.handleMultipleStocks)
	http.HandleFunc("/credit-metrics", server.handleCreditMetrics)
	http.HandleFunc("/health", server.handleHealth)

	// Root handler with API documentation
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}

		docs := map[string]interface{}{
			"service": "Yahoo Finance Go API",
			"version": "1.0.0",
			"endpoints": map[string]string{
				"GET /stock?symbol=AAPL":              "Get single stock data",
				"GET /stocks?symbols=AAPL,GOOGL,MSFT": "Get multiple stocks data",
				"GET /credit-metrics?symbol=AAPL":     "Get credit-relevant metrics",
				"GET /health":                         "Health check",
			},
			"examples": map[string]string{
				"single_stock":    "curl http://localhost:8080/stock?symbol=AAPL",
				"multiple_stocks": "curl http://localhost:8080/stocks?symbols=AAPL,GOOGL,MSFT",
				"credit_metrics":  "curl http://localhost:8080/credit-metrics?symbol=AAPL",
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(docs)
	})

	port := ":8080"
	log.Printf("🚀 Yahoo Finance Go API starting on http://localhost%s", port)
	log.Printf("📊 Cache TTL: 5 minutes")
	log.Printf("⚡ Concurrent limit: 5 requests")
	log.Printf("📖 API docs: http://localhost%s/", port)

	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
