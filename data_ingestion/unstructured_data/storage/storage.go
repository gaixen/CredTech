package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"  
	"time"
	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/config"
	"github.com/gaixen/CredTech/data_ingestion/unstructured_data/models"
	_ "github.com/lib/pq" // PostgreSQL driver
)

type Storage interface {
	SaveUnstructuredData(ctx context.Context, data *models.UnstructuredData) error
	GetUnstructuredData(ctx context.Context, id string) (*models.UnstructuredData, error)
	ListUnstructuredData(ctx context.Context, filters DataFilters) ([]*models.UnstructuredData, error)
	SaveProcessingJob(ctx context.Context, job *models.ProcessingJob) error
	GetPendingJobs(ctx context.Context, jobType string, limit int) ([]*models.ProcessingJob, error)
	UpdateJobStatus(ctx context.Context, jobID string, status string, result map[string]interface{}, errorMsg string) error
	SaveDataQuality(ctx context.Context, quality *models.DataQuality) error
	GetDataQualityStats(ctx context.Context, source string, since time.Time) (*DataQualityStats, error)
	Close() error
}

type DataFilters struct {
	Source      string
	Type        string
	DateFrom    *time.Time
	DateTo      *time.Time
	Tags        []string
	Symbols     []string
	Limit       int
	Offset      int
}

type DataQualityStats struct {
	AverageQuality    float64
	AverageCompleteness float64
	AverageAccuracy   float64
	AverageFreshness  float64
	TotalItems        int64
	IssueCount        int64
}

type PostgresStorage struct {
	db     *sql.DB
	config config.DatabaseConfig
}

func NewStorage(cfg config.DatabaseConfig) (Storage, error) {
	db, err := sql.Open("postgres", cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	storage := &PostgresStorage{
		db:     db,
		config: cfg,
	}

	if err := storage.createTables(); err != nil {
		return nil, fmt.Errorf("failed to create tables: %w", err)
	}

	return storage, nil
}

func (s *PostgresStorage) createTables() error {
	queries := []string{
		`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
		`CREATE TABLE IF NOT EXISTS unstructured_data (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			source VARCHAR(100) NOT NULL,
			type VARCHAR(50) NOT NULL,
			title TEXT,
			content TEXT,
			url TEXT,
			author VARCHAR(255),
			published_at TIMESTAMP WITH TIME ZONE,
			ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			metadata JSONB,
			tags TEXT[],
			entities JSONB,
			sentiment JSONB,
			processed_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS processing_jobs (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			data_id UUID REFERENCES unstructured_data(id),
			job_type VARCHAR(50) NOT NULL,
			status VARCHAR(20) DEFAULT 'pending',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			started_at TIMESTAMP WITH TIME ZONE,
			completed_at TIMESTAMP WITH TIME ZONE,
			result JSONB,
			error TEXT,
			retry_count INTEGER DEFAULT 0,
			priority INTEGER DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS data_quality (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			data_id UUID REFERENCES unstructured_data(id),
			source VARCHAR(100) NOT NULL,
			quality_score DECIMAL(3,2),
			completeness_score DECIMAL(3,2),
			accuracy_score DECIMAL(3,2),
			freshness_score DECIMAL(3,2),
			issues TEXT[],
			checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_unstructured_data_source ON unstructured_data(source)`,
		`CREATE INDEX IF NOT EXISTS idx_unstructured_data_type ON unstructured_data(type)`,
		`CREATE INDEX IF NOT EXISTS idx_unstructured_data_published_at ON unstructured_data(published_at)`,
		`CREATE INDEX IF NOT EXISTS idx_unstructured_data_tags ON unstructured_data USING GIN(tags)`,
		`CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status)`,
		`CREATE INDEX IF NOT EXISTS idx_processing_jobs_type ON processing_jobs(job_type)`,
		`CREATE INDEX IF NOT EXISTS idx_data_quality_source ON data_quality(source)`,
	}

	for _, query := range queries {
		if _, err := s.db.Exec(query); err != nil {
			return fmt.Errorf("failed to execute query %s: %w", query, err)
		}
	}

	return nil
}

func (s *PostgresStorage) SaveUnstructuredData(ctx context.Context, data *models.UnstructuredData) error {
	metadataJSON, err := json.Marshal(data.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	entitiesJSON, err := json.Marshal(data.Entities)
	if err != nil {
		return fmt.Errorf("failed to marshal entities: %w", err)
	}

	var sentimentJSON []byte
	if data.Sentiment != nil {
		sentimentJSON, err = json.Marshal(data.Sentiment)
		if err != nil {
			return fmt.Errorf("failed to marshal sentiment: %w", err)
		}
	}

	query := `
		INSERT INTO unstructured_data 
		(id, source, type, title, content, url, author, published_at, ingested_at, metadata, tags, entities, sentiment, processed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		ON CONFLICT (id) DO UPDATE SET
			source = EXCLUDED.source,
			type = EXCLUDED.type,
			title = EXCLUDED.title,
			content = EXCLUDED.content,
			url = EXCLUDED.url,
			author = EXCLUDED.author,
			published_at = EXCLUDED.published_at,
			metadata = EXCLUDED.metadata,
			tags = EXCLUDED.tags,
			entities = EXCLUDED.entities,
			sentiment = EXCLUDED.sentiment,
			processed_at = EXCLUDED.processed_at,
			updated_at = NOW()
	`

	_, err = s.db.ExecContext(ctx, query,
		data.ID, data.Source, data.Type, data.Title, data.Content, data.URL,
		data.Author, data.PublishedAt, data.IngestedAt, string(metadataJSON),
		data.Tags, string(entitiesJSON), string(sentimentJSON), data.ProcessedAt)

	if err != nil {
		return fmt.Errorf("failed to save unstructured data: %w", err)
	}

	return nil
}

func (s *PostgresStorage) GetUnstructuredData(ctx context.Context, id string) (*models.UnstructuredData, error) {
	query := `
		SELECT id, source, type, title, content, url, author, published_at, ingested_at, 
			   metadata, tags, entities, sentiment, processed_at
		FROM unstructured_data 
		WHERE id = $1
	`

	row := s.db.QueryRowContext(ctx, query, id)
	
	var data models.UnstructuredData
	var metadataJSON, entitiesJSON, sentimentJSON []byte
	var tags []string

	err := row.Scan(
		&data.ID, &data.Source, &data.Type, &data.Title, &data.Content, &data.URL,
		&data.Author, &data.PublishedAt, &data.IngestedAt, &metadataJSON,
		&tags, &entitiesJSON, &sentimentJSON, &data.ProcessedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("data not found")
		}
		return nil, fmt.Errorf("failed to get unstructured data: %w", err)
	}

	if err := json.Unmarshal(metadataJSON, &data.Metadata); err != nil {
		return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
	}

	if err := json.Unmarshal(entitiesJSON, &data.Entities); err != nil {
		return nil, fmt.Errorf("failed to unmarshal entities: %w", err)
	}

	if len(sentimentJSON) > 0 {
		if err := json.Unmarshal(sentimentJSON, &data.Sentiment); err != nil {
			return nil, fmt.Errorf("failed to unmarshal sentiment: %w", err)
		}
	}

	data.Tags = tags

	return &data, nil
}

func (s *PostgresStorage) ListUnstructuredData(ctx context.Context, filters DataFilters) ([]*models.UnstructuredData, error) {
	query := `
		SELECT id, source, type, title, content, url, author, published_at, ingested_at, 
			   metadata, tags, entities, sentiment, processed_at
		FROM unstructured_data 
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if filters.Source != "" {
		query += fmt.Sprintf(" AND source = $%d", argIndex)
		args = append(args, filters.Source)
		argIndex++
	}

	if filters.Type != "" {
		query += fmt.Sprintf(" AND type = $%d", argIndex)
		args = append(args, filters.Type)
		argIndex++
	}

	if filters.DateFrom != nil {
		query += fmt.Sprintf(" AND published_at >= $%d", argIndex)
		args = append(args, *filters.DateFrom)
		argIndex++
	}

	if filters.DateTo != nil {
		query += fmt.Sprintf(" AND published_at <= $%d", argIndex)
		args = append(args, *filters.DateTo)
		argIndex++
	}

	if len(filters.Tags) > 0 {
		query += fmt.Sprintf(" AND tags && $%d", argIndex)
		args = append(args, filters.Tags)
		argIndex++
	}

	query += " ORDER BY published_at DESC"

	if filters.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filters.Limit)
		argIndex++
	}

	if filters.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filters.Offset)
		argIndex++
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query unstructured data: %w", err)
	}
	defer rows.Close()

	var results []*models.UnstructuredData
	for rows.Next() {
		var data models.UnstructuredData
		var metadataJSON, entitiesJSON, sentimentJSON []byte
		var tags []string

		err := rows.Scan(
			&data.ID, &data.Source, &data.Type, &data.Title, &data.Content, &data.URL,
			&data.Author, &data.PublishedAt, &data.IngestedAt, &metadataJSON,
			&tags, &entitiesJSON, &sentimentJSON, &data.ProcessedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		if err := json.Unmarshal(metadataJSON, &data.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}

		if err := json.Unmarshal(entitiesJSON, &data.Entities); err != nil {
			return nil, fmt.Errorf("failed to unmarshal entities: %w", err)
		}

		if len(sentimentJSON) > 0 {
			if err := json.Unmarshal(sentimentJSON, &data.Sentiment); err != nil {
				return nil, fmt.Errorf("failed to unmarshal sentiment: %w", err)
			}
		}

		data.Tags = tags
		results = append(results, &data)
	}

	return results, nil
}

func (s *PostgresStorage) SaveProcessingJob(ctx context.Context, job *models.ProcessingJob) error {
	resultJSON, err := json.Marshal(job.Result)
	if err != nil {
		return fmt.Errorf("failed to marshal result: %w", err)
	}

	query := `
		INSERT INTO processing_jobs 
		(id, data_id, job_type, status, created_at, started_at, completed_at, result, error, retry_count, priority)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		ON CONFLICT (id) DO UPDATE SET
			status = EXCLUDED.status,
			started_at = EXCLUDED.started_at,
			completed_at = EXCLUDED.completed_at,
			result = EXCLUDED.result,
			error = EXCLUDED.error,
			retry_count = EXCLUDED.retry_count
	`

	_, err = s.db.ExecContext(ctx, query,
		job.ID, job.DataID, job.JobType, job.Status, job.CreatedAt,
		job.StartedAt, job.CompletedAt, string(resultJSON), job.Error,
		job.RetryCount, job.Priority)

	if err != nil {
		return fmt.Errorf("failed to save processing job: %w", err)
	}

	return nil
}

func (s *PostgresStorage) GetPendingJobs(ctx context.Context, jobType string, limit int) ([]*models.ProcessingJob, error) {
	query := `
		SELECT id, data_id, job_type, status, created_at, started_at, completed_at, 
			   result, error, retry_count, priority
		FROM processing_jobs 
		WHERE status = 'pending' AND job_type = $1
		ORDER BY priority DESC, created_at ASC
		LIMIT $2
	`

	rows, err := s.db.QueryContext(ctx, query, jobType, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending jobs: %w", err)
	}
	defer rows.Close()

	var jobs []*models.ProcessingJob
	for rows.Next() {
		var job models.ProcessingJob
		var resultJSON []byte

		err := rows.Scan(
			&job.ID, &job.DataID, &job.JobType, &job.Status, &job.CreatedAt,
			&job.StartedAt, &job.CompletedAt, &resultJSON, &job.Error,
			&job.RetryCount, &job.Priority,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan job row: %w", err)
		}

		if len(resultJSON) > 0 {
			if err := json.Unmarshal(resultJSON, &job.Result); err != nil {
				return nil, fmt.Errorf("failed to unmarshal result: %w", err)
			}
		}

		jobs = append(jobs, &job)
	}

	return jobs, nil
}

func (s *PostgresStorage) UpdateJobStatus(ctx context.Context, jobID string, status string, result map[string]interface{}, errorMsg string) error {
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("failed to marshal result: %w", err)
	}

	var query string
	var args []interface{}

	if status == "completed" {
		query = `
			UPDATE processing_jobs 
			SET status = $1, completed_at = NOW(), result = $2, error = $3
			WHERE id = $4
		`
		args = []interface{}{status, string(resultJSON), errorMsg, jobID}
	} else if status == "processing" {
		query = `
			UPDATE processing_jobs 
			SET status = $1, started_at = NOW()
			WHERE id = $2
		`
		args = []interface{}{status, jobID}
	} else {
		query = `
			UPDATE processing_jobs 
			SET status = $1, error = $2, retry_count = retry_count + 1
			WHERE id = $3
		`
		args = []interface{}{status, errorMsg, jobID}
	}

	_, err = s.db.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to update job status: %w", err)
	}

	return nil
}

func (s *PostgresStorage) SaveDataQuality(ctx context.Context, quality *models.DataQuality) error {
	query := `
		INSERT INTO data_quality 
		(id, data_id, source, quality_score, completeness_score, accuracy_score, freshness_score, issues, checked_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := s.db.ExecContext(ctx, query,
		quality.ID, quality.DataID, quality.Source, quality.QualityScore,
		quality.CompletenessScore, quality.AccuracyScore, quality.FreshnessScore,
		quality.Issues, quality.CheckedAt)

	if err != nil {
		return fmt.Errorf("failed to save data quality: %w", err)
	}

	return nil
}

func (s *PostgresStorage) GetDataQualityStats(ctx context.Context, source string, since time.Time) (*DataQualityStats, error) {
	query := `
		SELECT 
			AVG(quality_score) as avg_quality,
			AVG(completeness_score) as avg_completeness,
			AVG(accuracy_score) as avg_accuracy,
			AVG(freshness_score) as avg_freshness,
			COUNT(*) as total_items,
			COUNT(CASE WHEN array_length(issues, 1) > 0 THEN 1 END) as issue_count
		FROM data_quality 
		WHERE source = $1 AND checked_at >= $2
	`

	row := s.db.QueryRowContext(ctx, query, source, since)
	
	var stats DataQualityStats
	err := row.Scan(
		&stats.AverageQuality, &stats.AverageCompleteness, &stats.AverageAccuracy,
		&stats.AverageFreshness, &stats.TotalItems, &stats.IssueCount,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get data quality stats: %w", err)
	}

	return &stats, nil
}

func (s *PostgresStorage) Close() error {
	return s.db.Close()
}
