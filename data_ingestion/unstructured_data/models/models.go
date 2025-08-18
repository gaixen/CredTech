package models

import (
	"time"
)

type UnstructuredData struct {
	ID          string                 `json:"id" db:"id"`
	Source      string                 `json:"source" db:"source"`
	Type        string                 `json:"type" db:"type"` // news, social, earnings_transcript, press_release
	Title       string                 `json:"title" db:"title"`
	Content     string                 `json:"content" db:"content"`
	URL         string                 `json:"url" db:"url"`
	Author      string                 `json:"author" db:"author"`
	PublishedAt time.Time              `json:"published_at" db:"published_at"`
	IngestedAt  time.Time              `json:"ingested_at" db:"ingested_at"`
	Metadata    map[string]interface{} `json:"metadata" db:"metadata"`
	Tags        []string               `json:"tags" db:"tags"`
	Entities    []Entity               `json:"entities" db:"entities"`
	Sentiment   *SentimentScore        `json:"sentiment,omitempty" db:"sentiment"`
	ProcessedAt *time.Time             `json:"processed_at,omitempty" db:"processed_at"`
}

type Entity struct {
	Name       string  `json:"name"`
	Type       string  `json:"type"` // PERSON, ORG, MONEY, DATE, etc.
	Confidence float64 `json:"confidence"`
	StartPos   int     `json:"start_pos"`
	EndPos     int     `json:"end_pos"`
}

// SentimentScore represents sentiment analysis results
type SentimentScore struct {
	Overall   float64            `json:"overall"`   // -1 to 1
	Positive  float64            `json:"positive"`  // 0 to 1
	Negative  float64            `json:"negative"`  // 0 to 1
	Neutral   float64            `json:"neutral"`   // 0 to 1
	Magnitude float64            `json:"magnitude"` // 0 to inf
	Aspects   map[string]float64 `json:"aspects"`   // aspect-based sentiment
}

// NewsArticle represents a news article from various sources
type NewsArticle struct {
	UnstructuredData
	Category    string   `json:"category" db:"category"`
	Symbols     []string `json:"symbols" db:"symbols"`
	Keywords    []string `json:"keywords" db:"keywords"`
	Summary     string   `json:"summary" db:"summary"`
	Language    string   `json:"language" db:"language"`
	ImageURL    string   `json:"image_url" db:"image_url"`
	ViewCount   int64    `json:"view_count" db:"view_count"`
	ShareCount  int64    `json:"share_count" db:"share_count"`
}

// FinnhubNews represents news from Finnhub API
type FinnhubNews struct {
	Category string `json:"category"`
	DateTime int64  `json:"datetime"`
	Headline string `json:"headline"`
	ID       int    `json:"id"`
	Image    string `json:"image"`
	Related  string `json:"related"`
	Source   string `json:"source"`
	Summary  string `json:"summary"`
	URL      string `json:"url"`
}

// RSSFeedItem represents an item from RSS feed
type RSSFeedItem struct {
	Title       string    `xml:"title"`
	Link        string    `xml:"link"`
	Description string    `xml:"description"`
	PubDate     string    `xml:"pubDate"`
	GUID        string    `xml:"guid"`
	Category    []string  `xml:"category"`
	Author      string    `xml:"author"`
	Source      string    `xml:"source"`
	Enclosure   Enclosure `xml:"enclosure"`
}

type Enclosure struct {
	URL    string `xml:"url,attr"`
	Type   string `xml:"type,attr"`
	Length string `xml:"length,attr"`
}

// SocialMediaPost represents social media content
type SocialMediaPost struct {
	UnstructuredData
	Platform     string  `json:"platform" db:"platform"`
	UserHandle   string  `json:"user_handle" db:"user_handle"`
	UserFollowers int64  `json:"user_followers" db:"user_followers"`
	Likes        int64   `json:"likes" db:"likes"`
	Retweets     int64   `json:"retweets" db:"retweets"`
	Replies      int64   `json:"replies" db:"replies"`
	IsVerified   bool    `json:"is_verified" db:"is_verified"`
	Hashtags     []string `json:"hashtags" db:"hashtags"`
	Mentions     []string `json:"mentions" db:"mentions"`
}

// EarningsTranscript represents earnings call transcripts
type EarningsTranscript struct {
	UnstructuredData
	Company     string    `json:"company" db:"company"`
	Symbol      string    `json:"symbol" db:"symbol"`
	Quarter     string    `json:"quarter" db:"quarter"`
	Year        int       `json:"year" db:"year"`
	CallDate    time.Time `json:"call_date" db:"call_date"`
	Speakers    []Speaker `json:"speakers" db:"speakers"`
	Transcript  string    `json:"transcript" db:"transcript"`
	KeyMetrics  map[string]interface{} `json:"key_metrics" db:"key_metrics"`
}

type Speaker struct {
	Name     string `json:"name"`
	Title    string `json:"title"`
	Company  string `json:"company"`
	Segments []TranscriptSegment `json:"segments"`
}

type TranscriptSegment struct {
	Speaker   string    `json:"speaker"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
	Text      string    `json:"text"`
	Sentiment *SentimentScore `json:"sentiment,omitempty"`
}

// PressRelease represents company press releases
type PressRelease struct {
	UnstructuredData
	Company      string                 `json:"company" db:"company"`
	Symbol       string                 `json:"symbol" db:"symbol"`
	ReleaseType  string                 `json:"release_type" db:"release_type"` // earnings, merger, acquisition, etc.
	Industry     string                 `json:"industry" db:"industry"`
	MarketCap    int64                  `json:"market_cap" db:"market_cap"`
	KeyPoints    []string               `json:"key_points" db:"key_points"`
	FinancialData map[string]interface{} `json:"financial_data" db:"financial_data"`
}

// ProcessingJob represents a job for processing unstructured data
type ProcessingJob struct {
	ID         string                 `json:"id" db:"id"`
	DataID     string                 `json:"data_id" db:"data_id"`
	JobType    string                 `json:"job_type" db:"job_type"` // sentiment, entity_extraction, summarization
	Status     string                 `json:"status" db:"status"`     // pending, processing, completed, failed
	CreatedAt  time.Time              `json:"created_at" db:"created_at"`
	StartedAt  *time.Time             `json:"started_at,omitempty" db:"started_at"`
	CompletedAt *time.Time            `json:"completed_at,omitempty" db:"completed_at"`
	Result     map[string]interface{} `json:"result" db:"result"`
	Error      string                 `json:"error" db:"error"`
	RetryCount int                    `json:"retry_count" db:"retry_count"`
	Priority   int                    `json:"priority" db:"priority"`
}

// DataQuality represents quality metrics for ingested data
type DataQuality struct {
	ID              string    `json:"id" db:"id"`
	DataID          string    `json:"data_id" db:"data_id"`
	Source          string    `json:"source" db:"source"`
	QualityScore    float64   `json:"quality_score" db:"quality_score"`
	CompletenessScore float64 `json:"completeness_score" db:"completeness_score"`
	AccuracyScore   float64   `json:"accuracy_score" db:"accuracy_score"`
	FreshnessScore  float64   `json:"freshness_score" db:"freshness_score"`
	Issues          []string  `json:"issues" db:"issues"`
	CheckedAt       time.Time `json:"checked_at" db:"checked_at"`
}
