package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/config"
	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/ingestion"
	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/storage"
)

func main() {
	// Load configuration
	cfg := config.Load()
	// check if the module is properly integrated
	config.DebugPrintEnv()

	// Initialize storage
	store, err := storage.NewStorage(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to initialize storage: %v", err)
	}
	defer store.Close()

	// Initialize data ingestion manager
	manager := ingestion.NewManager(store, cfg)

	// Start all data sources
	if err := manager.Start(); err != nil {
		log.Fatalf("Failed to start ingestion manager: %v", err)
	}

	log.Println("Unstructured data ingestion service started successfully")

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down...")
	
	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	if err := manager.Stop(ctx); err != nil {
		log.Printf("Error during shutdown: %v", err)
	}

	log.Println("Service stopped")
}
