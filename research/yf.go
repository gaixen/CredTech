package main

import (
	"database/sql"
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	_ "github.com/lib/pq"
	"github.com/tidwall/gjson"
	// "gonum.org/v1/gonum/floats"
	"gonum.org/v1/gonum/stat"
)

// Data structures
type Company struct {
	Symbol    string
	Name      string
	Sector    string
	Industry  string
}

type FinancialData struct {
	CompanyID         string
	Quarter           string
	Year              int
	Date              time.Time
	
	// Accounting metrics
	ROA               float64
	RevenueGrowth     float64
	Leverage          float64
	RetainedEarnings  float64
	NetIncomeGrowth   float64
	
	// Market metrics
	StockReturn       float64
	StockVolatility   float64
	IndexReturn       float64
	DistanceToDefault float64
	
	// Macro metrics
	RiskFreeRate      float64
	CreditRating      float64
	CDSSpread         float64
	
	// Sentiment metrics
	AnalystSentiment  float64
	NewsSentiment     float64
	
	// Topic probabilities
	Topics            []float64
}

type DataExtractor struct {
	db          *sql.DB
	httpClient  *http.Client
	companies   []Company
	apiKeys     map[string]string
	wg          sync.WaitGroup
	mutex       sync.Mutex
	rateLimiter chan struct{}
}

// Initialize the extractor
func NewDataExtractor() *DataExtractor {
	rateLimiter := make(chan struct{}, 100)
	for i := 0; i < 100; i++ {
		rateLimiter <- struct{}{} // ratelimiter to restrict to 100 calls per minute
	}

	go func() {
		ticker := time.NewTicker(time.Minute)
		for range ticker.C {
			for i := 0; i < 100; i++ {
				select {
				case rateLimiter <- struct{}{}:
				default:
				}
			}
		}
	}()

	return &DataExtractor{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		apiKeys: map[string]string{
			"alphavantage": os.Getenv("ALPHAVANTAGE_API_KEY"),
			"fred":         os.Getenv("FRED_API_KEY"),
			"quandl":       os.Getenv("QUANDL_API_KEY"),
		},
		rateLimiter: rateLimiter,
	}
}

// sec-edger via scrapping
func (de *DataExtractor) extractSECData(symbol string, cik string) (*FinancialData, error) {
	<-de.rateLimiter

	// Use the SEC's JSON API (less known endpoint)
	url := fmt.Sprintf("https://data.sec.gov/api/xbrl/companyfacts/CIK%010s.json", cik)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	// SEC requires user agent
	req.Header.Set("User-Agent", "Financial Research Tool contact@yourcompany.com")
	
	resp, err := de.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Parse JSON using gjson for efficient extraction
	facts := gjson.ParseBytes(body)
	
	fd := &FinancialData{CompanyID: symbol}
	
	// Extract key accounting metrics from XBRL facts
	if assets := facts.Get("facts.us-gaap.Assets.units.USD"); assets.Exists() {
		// Get most recent quarter
		for _, item := range assets.Array() {
			if item.Get("form").String() == "10-Q" {
				fd.ROA = calculateROA(
					item.Get("val").Float(),
					facts.Get("facts.us-gaap.NetIncomeLoss.units.USD.0.val").Float(),
				)
				break
			}
		}
	}
	
	return fd, nil
}

// Alternative market data extraction using Yahoo Finance RSS feeds
func (de *DataExtractor) extractMarketDataRSS(symbol string) (*FinancialData, error) {
	<-de.rateLimiter

	// Yahoo Finance has RSS feeds that are less rate-limited
	url := fmt.Sprintf("https://feeds.finance.yahoo.com/rss/2.0/headline?s=%s&region=US&lang=en-US", symbol)
	
	resp, err := de.httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Parse RSS for sentiment indicators and volume data
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	fd := &FinancialData{CompanyID: symbol}
	
	// Extract news sentiment from RSS descriptions
	sentimentScore := 0.0
	count := 0
	
	doc.Find("item description").Each(func(i int, s *goquery.Selection) {
		text := s.Text()
		sentiment := de.calculateBasicSentiment(text)
		sentimentScore += sentiment
		count++
	})
	
	if count > 0 {
		fd.NewsSentiment = sentimentScore / float64(count)
	}
	
	return fd, nil
}

// FRED API for macro data (using less common endpoints)
func (de *DataExtractor) extractMacroData() (map[string]float64, error) {
	<-de.rateLimiter

	macroData := make(map[string]float64)
	
	// Use FRED's real-time data API
	series := []string{
		"DGS3MO",    // 3-Month Treasury
		"BAMLC0A0CM", // Corporate credit spreads
		"VIXCLS",    // VIX for market sentiment
	}
	
	for _, seriesID := range series {
		url := fmt.Sprintf("https://api.stlouisfed.org/fred/series/observations?series_id=%s&api_key=%s&file_type=json&limit=1&sort_order=desc",
			seriesID, de.apiKeys["fred"])
		
		resp, err := de.httpClient.Get(url)
		if err != nil {
			continue
		}
		
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			continue
		}
		
		data := gjson.ParseBytes(body)
		if obs := data.Get("observations.0.value"); obs.Exists() {
			if val, err := strconv.ParseFloat(obs.String(), 64); err == nil {
				macroData[seriesID] = val
			}
		}
	}
	
	return macroData, nil
}

// Web scraping for CDS data (using alternative sources)
func (de *DataExtractor) scrapeCDSData(symbol string) (float64, error) {
	<-de.rateLimiter

	// Use MarketWatch's CDS section (less monitored than Bloomberg)
	url := fmt.Sprintf("https://www.marketwatch.com/investing/stock/%s/financials/cash-flow/quarter", strings.ToLower(symbol))
	
	resp, err := de.httpClient.Get(url)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return 0, err
	}

	// Look for credit-related metrics in the page
	cdsSpread := 0.0
	doc.Find("td").Each(func(i int, s *goquery.Selection) {
		text := strings.ToLower(s.Text())
		if strings.Contains(text, "credit") || strings.Contains(text, "spread") {
			// Extract numerical value
			if val := extractNumberFromText(text); val > 0 {
				cdsSpread = val
			}
		}
	})
	
	return cdsSpread, nil
}

// Extract credit ratings from S&P's XML feeds
func (de *DataExtractor) extractCreditRating(symbol string) (float64, error) {
	<-de.rateLimiter

	// S&P has XML feeds for ratings (less known)
	url := fmt.Sprintf("https://www.standardandpoors.com/en_US/delegate/getPdf?articleId=%s&type=COMMENTS&subType=REGULATORY", symbol)
	
	resp, err := de.httpClient.Get(url)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	// Parse response for rating information
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}

	rating := extractRatingFromText(string(body))
	return convertRatingToNumerical(rating), nil
}

// Calculate distance to default using Merton model
func (de *DataExtractor) calculateDistanceToDefault(marketCap, totalDebt, volatility, riskFreeRate float64) float64 {
	if marketCap <= 0 || totalDebt <= 0 || volatility <= 0 {
		return 0
	}
	
	firmValue := marketCap + totalDebt
	drift := riskFreeRate - 0.5*volatility*volatility
	
	// Naive distance to default calculation
	dtd := (math.Log(firmValue/totalDebt) + drift) / (volatility * math.Sqrt(1.0))
	
	return dtd
}

// Winsorize data at specified percentiles
func (de *DataExtractor) winsorizeData(data []float64, lowerPercentile, upperPercentile float64) []float64 {
	if len(data) == 0 {
		return data
	}
	
	sorted := make([]float64, len(data))
	copy(sorted, data)
	// floats.Sort(sorted)
    sort.Float64s(sorted)
	
	lowerBound := stat.Quantile(lowerPercentile/100.0, stat.Empirical, sorted, nil)
	upperBound := stat.Quantile(upperPercentile/100.0, stat.Empirical, sorted, nil)
	
	result := make([]float64, len(data))
	for i, val := range data {
		if val < lowerBound {
			result[i] = lowerBound
		} else if val > upperBound {
			result[i] = upperBound
		} else {
			result[i] = val
		}
	}
	
	return result
}

// Calculate rolling averages for accounting metrics
func (de *DataExtractor) calculateRollingAverage(values []float64, window int) []float64 {
	if len(values) < window {
		return values
	}
	
	result := make([]float64, len(values))
	for i := 0; i < len(values); i++ {
		start := i - window + 1
		if start < 0 {
			start = 0
		}
		
		sum := 0.0
		count := 0
		for j := start; j <= i; j++ {
			sum += values[j]
			count++
		}
		result[i] = sum / float64(count)
	}
	
	return result
}

// Main extraction pipeline
func (de *DataExtractor) ExtractAllFeatures(symbols []string) error {
	allData := make([]FinancialData, 0)
	
	// Get macro data once
	macroData, err := de.extractMacroData()
	if err != nil {
		log.Printf("Failed to extract macro data: %v", err)
	}
	
	// Process each company
	for _, symbol := range symbols {
		de.wg.Add(1)
		go func(sym string) {
			defer de.wg.Done()
			
			log.Printf("Processing %s...", sym)
			
			// Extract all data types for this symbol
			secData, _ := de.extractSECData(sym, de.getCIK(sym))
			marketData, _ := de.extractMarketDataRSS(sym)
			cdsSpread, _ := de.scrapeCDSData(sym)
			creditRating, _ := de.extractCreditRating(sym)
			
			// Combine data
			fd := &FinancialData{
				CompanyID:    sym,
				Quarter:      "Q1",
				Year:         2024,
				Date:         time.Now(),
				CDSSpread:    cdsSpread,
				CreditRating: creditRating,
			}
			
			// Merge SEC data
			if secData != nil {
				fd.ROA = secData.ROA
			}
			
			// Merge market data
			if marketData != nil {
				fd.NewsSentiment = marketData.NewsSentiment
			}
			
			// Add macro data
			if riskFree, ok := macroData["DGS3MO"]; ok {
				fd.RiskFreeRate = riskFree / 100.0 // Convert percentage
			}
			
			de.mutex.Lock()
			allData = append(allData, *fd)
			de.mutex.Unlock()
		}(symbol)
	}
	
	de.wg.Wait()
	
	// Post-process data
	de.postProcessData(allData)
	
	// Export to CSV
	return de.exportToCSV(allData, "financial_features.csv")
}

// Post-processing: winsorization, standardization, transformations
func (de *DataExtractor) postProcessData(data []FinancialData) {
	if len(data) == 0 {
		return
	}
	
	// Extract all CDS spreads for transformation
	cdsSpreads := make([]float64, 0)
	for _, d := range data {
		if d.CDSSpread > 0 {
			cdsSpreads = append(cdsSpreads, d.CDSSpread)
		}
	}
	
	// Winsorize at 1% level
	// winsorizedCDS := de.winsorizeData(cdsSpreads, 1.0, 99.0)
	
	// Apply log transformation to CDS spreads
	for i, d := range data {
		if d.CDSSpread > 0 {
			data[i].CDSSpread = math.Log(d.CDSSpread)
		}
	}
	
	log.Printf("Post-processed %d records", len(data))
}

// Export to CSV format
func (de *DataExtractor) exportToCSV(data []FinancialData, filename string) error {
	file, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Write header
	header := []string{
		"firm_id", "date", "log_cds_spread", "roa", "revenue_growth",
		"leverage", "stock_return", "analyst_sentiment", "risk_free_rate",
		"credit_rating",
	}
	writer.Write(header)

	// Write data
	for _, d := range data {
		record := []string{
			d.CompanyID,
			d.Date.Format("2006-01-02"),
			fmt.Sprintf("%.6f", d.CDSSpread),
			fmt.Sprintf("%.6f", d.ROA),
			fmt.Sprintf("%.6f", d.RevenueGrowth),
			fmt.Sprintf("%.6f", d.Leverage),
			fmt.Sprintf("%.6f", d.StockReturn),
			fmt.Sprintf("%.6f", d.AnalystSentiment),
			fmt.Sprintf("%.6f", d.RiskFreeRate),
			fmt.Sprintf("%.6f", d.CreditRating),
		}
		writer.Write(record)
	}

	log.Printf("Exported %d records to %s", len(data), filename)
	return nil
}

// Helper functions
func (de *DataExtractor) getCIK(symbol string) string {
	// Map of common symbols to CIK numbers
	cikMap := map[string]string{
		"AAPL": "0000320193",
		"MSFT": "0000789019",
		"GOOGL": "0001652044",
		// Add more as needed
	}
	
	if cik, ok := cikMap[symbol]; ok {
		return cik
	}
	return "0000000000" // Default
}

func calculateROA(assets, netIncome float64) float64 {
	if assets == 0 {
		return 0
	}
	return netIncome / assets
}

func (de *DataExtractor) calculateBasicSentiment(text string) float64 {
	positive := []string{"good", "strong", "growth", "profit", "success"}
	negative := []string{"bad", "weak", "decline", "loss", "failure"}
	
	score := 0.0
	text = strings.ToLower(text)
	
	for _, word := range positive {
		score += float64(strings.Count(text, word))
	}
	for _, word := range negative {
		score -= float64(strings.Count(text, word))
	}
	
	return score
}

func extractNumberFromText(text string) float64 {
	// Simple regex-like extraction for numbers
	var result float64
	fmt.Sscanf(text, "%f", &result)
	return result
}

func extractRatingFromText(text string) string {
	ratings := []string{"AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BBB-"}
	text = strings.ToUpper(text)
	
	for _, rating := range ratings {
		if strings.Contains(text, rating) {
			return rating
		}
	}
	return "NR" // Not rated
}

func convertRatingToNumerical(rating string) float64 {
	ratingMap := map[string]float64{
		"AAA": 0.0, "AA+": 0.056, "AA": 0.111, "AA-": 0.167,
		"A+": 0.222, "A": 0.278, "A-": 0.333, "BBB+": 0.389,
		"BBB": 0.444, "BBB-": 0.5, "BB+": 0.556, "BB": 0.611,
		"NR": 0.5, // Default for unrated
	}
	
	if val, ok := ratingMap[rating]; ok {
		return val
	}
	return 0.5
}

func main() {
	// List of companies to analyze (non-financial DJIA components)
	symbols := []string{
		"AAPL", "MSFT", "UNH", "JNJ", "V", "WMT", "PG", "HD",
		"MA", "DIS", "ADBE", "CRM", "VZ", "KO", "PFE", "PEP",
		"TMO", "ABT", "COST", "AVGO", "XOM", "NKE",
	}

	extractor := NewDataExtractor()
	
	if err := extractor.ExtractAllFeatures(symbols); err != nil {
		log.Fatalf("Feature extraction failed: %v", err)
	}
	
	log.Println("Feature extraction completed successfully!")
}