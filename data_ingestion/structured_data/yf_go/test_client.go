package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const baseURL = "http://localhost:8080"

func testAPI() {
	fmt.Println("🧪 Testing Yahoo Finance Go API")
	fmt.Println("================================")

	// Test 1: Health check
	fmt.Println("\n1. Health Check:")
	resp, err := http.Get(baseURL + "/health")
	if err != nil {
		fmt.Printf("❌ Health check failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("✅ Status: %d\n", resp.StatusCode)
	fmt.Printf("Response: %s\n", string(body))

	// Test 2: Single stock
	fmt.Println("\n2. Single Stock (AAPL):")
	start := time.Now()
	resp, err = http.Get(baseURL + "/stock?symbol=AAPL")
	if err != nil {
		fmt.Printf("❌ Single stock failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ = io.ReadAll(resp.Body)
	duration := time.Since(start)
	fmt.Printf("✅ Response time: %v\n", duration)
	fmt.Printf("Response headers: %v\n", resp.Header.Get("X-Response-Time"))

	var stockData map[string]interface{}
	json.Unmarshal(body, &stockData)
	fmt.Printf("Symbol: %v\n", stockData["symbol"])
	fmt.Printf("Price: $%.2f\n", stockData["current_price"])
	fmt.Printf("Change: %.2f%%\n", stockData["change_percent"])

	// Test 3: Multiple stocks
	fmt.Println("\n3. Multiple Stocks (AAPL,GOOGL,MSFT):")
	start = time.Now()
	resp, err = http.Get(baseURL + "/stocks?symbols=AAPL,GOOGL,MSFT")
	if err != nil {
		fmt.Printf("❌ Multiple stocks failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ = io.ReadAll(resp.Body)
	duration = time.Since(start)
	fmt.Printf("✅ Response time: %v\n", duration)

	var multipleStocks map[string]interface{}
	json.Unmarshal(body, &multipleStocks)
	fmt.Printf("Fetched %d stocks\n", len(multipleStocks))

	// Test 4: Credit metrics
	fmt.Println("\n4. Credit Metrics (AAPL):")
	start = time.Now()
	resp, err = http.Get(baseURL + "/credit-metrics?symbol=AAPL")
	if err != nil {
		fmt.Printf("❌ Credit metrics failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ = io.ReadAll(resp.Body)
	duration = time.Since(start)
	fmt.Printf("✅ Response time: %v\n", duration)
	fmt.Printf("Credit data: %s\n", string(body))

	// Test 5: Cache performance
	fmt.Println("\n5. Cache Performance Test:")
	fmt.Println("First request (cache miss):")
	start = time.Now()
	http.Get(baseURL + "/stock?symbol=TSLA")
	fmt.Printf("⏱️  Time: %v\n", time.Since(start))

	fmt.Println("Second request (cache hit):")
	start = time.Now()
	http.Get(baseURL + "/stock?symbol=TSLA")
	fmt.Printf("⏱️  Time: %v\n", time.Since(start))

	fmt.Println("\n✅ All tests completed!")
}

func main() {
	fmt.Println("Starting API client tests...")
	fmt.Println("Make sure the server is running: go run main.go")
	fmt.Println("Press Enter to continue...")
	fmt.Scanln()

	testAPI()
}
