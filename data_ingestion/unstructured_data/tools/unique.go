package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

func main() {
	dataDir := "../data"

	fmt.Println("CredTech Data Unique Duplicate Files")
	fmt.Println("------------------------------------")

	totalRemoved := 0

	err := filepath.Walk(dataDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() && strings.Contains(path, string(os.PathSeparator)) && path != dataDir {
			
			sourceDir := path
			sourceName := filepath.Base(path)

			fmt.Printf("\n📂 Processing %s directory...\n", sourceName)

			filesByID := make(map[string][]string)

			files, err := os.ReadDir(sourceDir)
			if err != nil {
				return err
			}

			for _, file := range files {
				if strings.HasSuffix(file.Name(), ".json") {
					parts := strings.Split(file.Name(), "_")
					if len(parts) >= 2 {
						id := parts[0]
						fullPath := filepath.Join(sourceDir, file.Name())
						filesByID[id] = append(filesByID[id], fullPath)
					}
				}
			}

			for id, filePaths := range filesByID {
				if len(filePaths) > 1 {
					sort.Strings(filePaths)

					fmt.Printf("  📄 Found %d duplicates for ID: %s\n", len(filePaths)-1, id)

					for i := 1; i < len(filePaths); i++ {
						if err := os.Remove(filePaths[i]); err != nil {
							fmt.Printf("    ❌ Error removing %s: %v\n", filePaths[i], err)
						} else {
							fmt.Printf("    🗑️  Removed: %s\n", filepath.Base(filePaths[i]))
							totalRemoved++
						}
					}
				}
			}
		}

		return nil
	})

	if err != nil {
		fmt.Printf("❌ Error: %v\n", err)
		return
	}

	fmt.Printf("\n✅ Cleanup complete! Removed %d duplicate files.\n", totalRemoved)

	if totalRemoved > 0 {
		fmt.Println("\n💡 Next time you run the data ingestion, duplicates will be prevented automatically.")
	}
}
