package ingestion

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/config"
	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/storage"
)

type Manager struct {
	storage   storage.Storage
	config    *config.Config
	sources   map[string]DataSource
	workers   []*Worker
	ctx       context.Context
	cancel    context.CancelFunc
	wg        sync.WaitGroup
}

type DataSource interface {
	Start(ctx context.Context) error
	Stop(ctx context.Context) error
	GetName() string
	IsEnabled() bool
}

type Worker struct {
	id      int
	manager *Manager
	jobs    chan ProcessingJob
	quit    chan bool
}

type ProcessingJob struct {
	DataID   string
	JobType  string
	Priority int
	Data     interface{}
}

func NewManager(store storage.Storage, cfg *config.Config) *Manager {
	ctx, cancel := context.WithCancel(context.Background())
	
	manager := &Manager{
		storage: store,
		config:  cfg,
		sources: make(map[string]DataSource),
		ctx:     ctx,
		cancel:  cancel,
	}

	manager.initializeSources()
	manager.initializeWorkers()

	return manager
}

func (m *Manager) initializeSources() {
	if m.config.DataSources.Finnhub.Enabled {
		finnhubSource := NewFinnhubSource(m.storage, m.config.DataSources.Finnhub)
		m.sources["finnhub"] = finnhubSource
	}
	if m.config.DataSources.Reuters.Enabled {
		reutersSource := NewReutersSource(m.storage, m.config.DataSources.Reuters)
		m.sources["reuters"] = reutersSource
	}
	if m.config.DataSources.Yahoo.Enabled {
		yahooSource := NewYahooSource(m.storage, m.config.DataSources.Yahoo)
		m.sources["yahoo"] = yahooSource
	}
	if m.config.DataSources.NewsAPI.Enabled {
		newsAPISource := NewNewsAPISource(m.storage, m.config.DataSources.NewsAPI)
		m.sources["newsapi"] = newsAPISource
	}
	if m.config.DataSources.MarketWatch.Enabled {
		marketWatchSource := NewMarketWatchSource(m.storage, m.config.DataSources.MarketWatch)
		m.sources["marketwatch"] = marketWatchSource
	}
	if m.config.DataSources.Bloomberg.Enabled {
		bloombergSource := NewBloombergSource(m.storage, m.config.DataSources.Bloomberg)
		m.sources["bloomberg"] = bloombergSource
	}
	if m.config.DataSources.Kofin.Enabled {
		kofinSource := NewKofinSource(m.storage, m.config.DataSources.Kofin)
		m.sources["kofin"] = kofinSource
	}
	if m.config.DataSources.FedNews.Enabled {
		fedNewsSource := NewFedNewsSource(m.storage, m.config.DataSources.FedNews)
		m.sources["fednews"] = fedNewsSource
	}
}

func (m *Manager) initializeWorkers() {
	jobQueue := make(chan ProcessingJob, m.config.Processing.QueueSize)
	
	for i := 0; i < m.config.Processing.MaxWorkers; i++ {
		worker := &Worker{
			id:      i,
			manager: m,
			jobs:    jobQueue,
			quit:    make(chan bool),
		}
		m.workers = append(m.workers, worker)
	}
}

func (m *Manager) Start() error {
	log.Println("Starting data ingestion manager...")

	for _, worker := range m.workers {
		m.wg.Add(1)
		go worker.start()
	}

	for name, source := range m.sources {
		if source.IsEnabled() {
			log.Printf("Starting data source: %s", name)
			m.wg.Add(1)
			go func(name string, source DataSource) {
				defer m.wg.Done()
				if err := source.Start(m.ctx); err != nil {
					log.Printf("Error starting source %s: %v", name, err)
				}
			}(name, source)
		}
	}
	m.wg.Add(1)
	go m.monitor()

	return nil
}

func (m *Manager) Stop(ctx context.Context) error {
	log.Println("Stopping data ingestion manager...")
	m.cancel()

	for name, source := range m.sources {
		if source.IsEnabled() {
			log.Printf("Stopping data source: %s", name)
			if err := source.Stop(ctx); err != nil {
				log.Printf("Error stopping source %s: %v", name, err)
			}
		}
	}
	for _, worker := range m.workers {
		worker.quit <- true
	}
	done := make(chan struct{})
	go func() {
		m.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		log.Println("All goroutines stopped successfully")
	case <-ctx.Done():
		log.Println("Shutdown timeout reached")
		return ctx.Err()
	}

	return nil
}

func (m *Manager) monitor() {
	defer m.wg.Done()
	
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.logStats()
		}
	}
}

func (m *Manager) logStats() {
	since := time.Now().Add(-24 * time.Hour)
	
	for name := range m.sources {
		stats, err := m.storage.GetDataQualityStats(context.Background(), name, since)
		if err != nil {
			log.Printf("Failed to get stats for source %s: %v", name, err)
			continue
		}
		
		log.Printf("Source %s - Quality: %.2f, Items: %d, Issues: %d", 
			name, stats.AverageQuality, stats.TotalItems, stats.IssueCount)
	}
}

func (w *Worker) start() {
	defer w.manager.wg.Done()
	
	log.Printf("Worker %d started", w.id)
	
	for {
		select {
		case job := <-w.jobs:
			w.processJob(job)
		case <-w.quit:
			log.Printf("Worker %d stopping", w.id)
			return
		case <-w.manager.ctx.Done():
			log.Printf("Worker %d stopping due to context cancellation", w.id)
			return
		}
	}
}

func (w *Worker) processJob(job ProcessingJob) {
	log.Printf("Worker %d processing job: %s for data %s", w.id, job.JobType, job.DataID)
	switch job.JobType {
	case "sentiment_analysis":
		w.processSentimentAnalysis(job)
	case "entity_extraction":
		w.processEntityExtraction(job)
	case "summarization":
		w.processSummarization(job)
	case "quality_check":
		w.processQualityCheck(job)
	default:
		log.Printf("Unknown job type: %s", job.JobType)
	}
}

func (w *Worker) processSentimentAnalysis(job ProcessingJob) {
	log.Printf("Processing sentiment analysis for data %s", job.DataID)
	time.Sleep(1 * time.Second)
}

func (w *Worker) processEntityExtraction(job ProcessingJob) {
	log.Printf("Processing entity extraction for data %s", job.DataID)
	time.Sleep(1 * time.Second)
}

func (w *Worker) processSummarization(job ProcessingJob) {
	log.Printf("Processing summarization for data %s", job.DataID)
	time.Sleep(1 * time.Second)
}

func (w *Worker) processQualityCheck(job ProcessingJob) {
	log.Printf("Processing quality check for data %s", job.DataID)
	time.Sleep(500 * time.Millisecond)
}
