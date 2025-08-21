package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Define the data structure locally to avoid import conflicts
type UnstructuredData struct {
	ID          string                 `json:"id"`
	Source      string                 `json:"source"`
	Type        string                 `json:"type"`
	Title       string                 `json:"title"`
	Content     string                 `json:"content"`
	URL         string                 `json:"url"`
	Author      string                 `json:"author"`
	PublishedAt string                 `json:"published_at"`
	IngestedAt  string                 `json:"ingested_at"`
	Metadata    map[string]interface{} `json:"metadata"`
	Tags        []string               `json:"tags"`
}

func main() {
	dataDir := "../data"

	fmt.Println("📊 CredTech Data Viewer")
	fmt.Println("=======================")

	totalFiles := 0
	sourceCount := make(map[string]int)

	err := filepath.Walk(dataDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if strings.HasSuffix(path, ".json") {
			totalFiles++

			file, err := os.Open(path)
			if err != nil {
				fmt.Printf("Error opening %s: %v\n", path, err)
				return nil
			}
			defer file.Close()

			var data UnstructuredData
			if err := json.NewDecoder(file).Decode(&data); err != nil {
				fmt.Printf("Error decoding %s: %v\n", path, err)
				return nil
			}

			sourceCount[data.Source]++

			// Truncate title if too long
			title := data.Title
			if len(title) > 80 {
				title = title[:77] + "..."
			}

			fmt.Printf("%s | %s | %s\n",
				strings.ToUpper(data.Source),
				data.PublishedAt,
				title)
		}

		return nil
	})

	if err != nil {
		fmt.Printf("❌ Error walking directory: %v\n", err)
		return
	}

	fmt.Println("\nSummary:")
	fmt.Printf("Total files: %d\n", totalFiles)

	if len(sourceCount) > 0 {
		fmt.Println("By source:")
		for source, count := range sourceCount {
			fmt.Printf("  %s: %d files\n", strings.ToUpper(source), count)
		}
	} else {
		fmt.Println("No data files found.")
	}
}
