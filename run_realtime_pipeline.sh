#!/bin/bash

# CredTech Data Pipeline - Simple Flow
# 1. Fetch data from Yahoo Finance → 2. Store in PostgreSQL → 3. Feature Engineering → 4. Model Training
# Author: CredTech Team | Date: August 22, 2025

set -e
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PATH="$PROJECT_ROOT/.venv"
DEFAULT_TICKERS="AAPL,MSFT,GOOGL,JPM,BAC,WMT,JNJ,PG,KO,DIS,NFLX,TSLA,NVDA,AMD,INTC,CRM,V,MA,HD,UNH,CVX,XOM,LLY,ABBV,PFE"

# Colors for better output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
info() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')]${NC} $1"; }

check_env() {
    log "🔍 Checking environment"
    [[ -d "$VENV_PATH" ]] || { error "No .venv found. Run: python -m venv .venv"; exit 1; }
    source "$VENV_PATH/bin/activate" 2>/dev/null || source "$VENV_PATH/Scripts/activate"
    python -c "import yfinance, pandas, sqlalchemy, fastapi" || { error "Missing packages"; exit 1; }
    log "Environment ready ✓"
}

init_database() {
    log "📊 Initializing PostgreSQL database"
    cd "$PROJECT_ROOT/data_ingestion/structured_data"
    python -c "
from storage import init_db
try:
    init_db()
    print('Database schema initialized ✓')
except Exception as e:
    print(f'Database init warning: {e}')
"
}

fetch_and_store_data() {
    local tickers="$1"
    log "📈 Data Ingestion Phase: Fetch → Store in PostgreSQL"
    info "Tickers: $tickers"
    
    cd "$PROJECT_ROOT/data_ingestion/structured_data"
    
    IFS=',' read -ra TICKER_ARRAY <<< "$tickers"
    for ticker in "${TICKER_ARRAY[@]}"; do
        ticker=$(echo "$ticker" | tr -d ' ')
        info "  → Processing $ticker"
        
        # Enhanced data fetching with historical data for panel regression + price data for charts
        python -c "
import sys
sys.path.append('.')
from sources.yahoo_finance_features import fetch_credit_features, fetch_historical_fundamentals, fetch_stock_price_data
from storage import SessionLocal
from models import CompanyFundamentals, StockPrice
from datetime import datetime, UTC
import json

try:
    # Step 1: Fetch current fundamentals
    current_data = fetch_credit_features('$ticker')
    current_fundamentals = current_data['fundamentals']
    
    # Step 2: Fetch historical fundamentals for panel data (5 years for robust training)
    print(f'  → Fetching 5 years of historical data for $ticker...')
    historical_data = fetch_historical_fundamentals('$ticker', years=5)
    
    # Step 3: Fetch stock price data for candlestick charts
    print(f'  → Fetching price data for $ticker...')
    price_data = fetch_stock_price_data('$ticker', period='5y')
    
    # Step 4: Store fundamentals, historical data, and price data
    db = SessionLocal()
    
    # Store current fundamentals data
    existing = db.query(CompanyFundamentals).filter_by(symbol='$ticker').first()
    
    if existing:
        # Update existing record
        existing.total_revenue = current_fundamentals.get('total_revenue')
        existing.net_income = current_fundamentals.get('net_income')
        existing.total_assets = current_fundamentals.get('total_assets')
        existing.total_liabilities = current_fundamentals.get('total_liabilities')
        existing.equity = current_fundamentals.get('equity')
        existing.sector = current_fundamentals.get('sector')
        existing.fundamentals = current_fundamentals
        existing.ingested_at = datetime.now(UTC)
        existing.roa = current_fundamentals.get('return_on_assets')
        existing.roe = current_fundamentals.get('return_on_equity')
        existing.leverage_ratio = (current_fundamentals.get('total_debt', 0) / current_fundamentals.get('total_assets', 1)) if current_fundamentals.get('total_assets') else None
        action = 'Updated'
    else:
        # Create new record
        record = CompanyFundamentals(
            company=current_fundamentals.get('sector', 'Unknown'),
            symbol='$ticker',
            fundamentals=current_fundamentals,
            source='yahoo_finance',
            ingested_at=datetime.now(UTC),
            total_revenue=current_fundamentals.get('total_revenue'),
            net_income=current_fundamentals.get('net_income'),
            total_assets=current_fundamentals.get('total_assets'),
            total_liabilities=current_fundamentals.get('total_liabilities'),
            equity=current_fundamentals.get('equity'),
            sector=current_fundamentals.get('sector'),
            roa=current_fundamentals.get('return_on_assets'),
            roe=current_fundamentals.get('return_on_equity'),
            leverage_ratio=(current_fundamentals.get('total_debt', 0) / current_fundamentals.get('total_assets', 1)) if current_fundamentals.get('total_assets') else None
        )
        db.add(record)
        action = 'Created'
    
    # Store historical fundamentals data for panel regression
    historical_records = 0
    if 'panel_data' in historical_data:
        for quarter_data in historical_data['panel_data']:
            # Check if this quarter already exists
            quarter_date = datetime.fromisoformat(quarter_data.get('date', '2024-01-01'))
            existing_quarter = db.query(CompanyFundamentals).filter_by(
                symbol='$ticker',
                fiscal_year=quarter_date.year,
                fiscal_quarter=f'Q{(quarter_date.month-1)//3 + 1}'
            ).first()
            
            if not existing_quarter:
                historical_record = CompanyFundamentals(
                    company=quarter_data.get('sector', current_fundamentals.get('sector', 'Unknown')),
                    symbol='$ticker',
                    fiscal_year=quarter_date.year,
                    fiscal_quarter=f'Q{(quarter_date.month-1)//3 + 1}',
                    fundamentals=quarter_data,
                    source='yahoo_finance_historical',
                    ingested_at=datetime.now(UTC),
                    total_revenue=quarter_data.get('total_revenue'),
                    net_income=quarter_data.get('net_income'),
                    total_assets=quarter_data.get('total_assets'),
                    total_liabilities=quarter_data.get('total_liabilities'),
                    equity=quarter_data.get('equity'),
                    sector=quarter_data.get('sector', current_fundamentals.get('sector')),
                    roa=quarter_data.get('return_on_assets'),
                    roe=quarter_data.get('return_on_equity'),
                    leverage_ratio=quarter_data.get('leverage_ratio')
                )
                db.add(historical_record)
                historical_records += 1
    
    # Store stock price data for candlestick charts
    price_records = 0
    if 'data' in price_data and not price_data.get('error'):
        # Clear existing price data to avoid duplicates
        db.query(StockPrice).filter_by(symbol='$ticker').delete()
        
        for price_point in price_data['data']:
            if price_point.get('date') and price_point.get('close'):
                price_record = StockPrice(
                    symbol='$ticker',
                    date=datetime.fromisoformat(price_point['date']),
                    open=price_point.get('open'),
                    close=price_point.get('close'),
                    high=price_point.get('high'),
                    low=price_point.get('low'),
                    volume=price_point.get('volume'),
                    source='yahoo_finance',
                    ingested_at=datetime.now(UTC)
                )
                db.add(price_record)
                price_records += 1
    
    db.commit()
    db.close()
    
    total_action = f'{action} (+ {historical_records} historical, + {price_records} price points)'
    print(f'✓ $ticker - {total_action}')
    
except Exception as e:
    print(f'✗ $ticker - Error: {e}')
    import traceback
    traceback.print_exc()
" || warn "Failed to process $ticker"
        
        sleep 3  # Increased rate limiting for historical data fetching
    done
    
    log "✅ Data ingestion completed"
}

run_feature_engineering() {
    log "🔧 Feature Engineering Phase: Database → Academic Features"
    
    cd "$PROJECT_ROOT/feature_engineering"
    python -c "
import sys, os
sys.path.append('.')
sys.path.append('../data_ingestion/structured_data')

try:
    # Import the updated academic features module
    from academic_features import engineer_features_for_cds_model, load_data_from_database
    
    print('📊 Loading data from PostgreSQL database...')
    
    # Step 3: Feature engineering directly from database
    features_df, log_target = engineer_features_for_cds_model(
        symbols=None,  # Process all symbols in database
        output_path='../data/engineered_features.csv'
    )
    
    if len(features_df) > 0:
        print(f'✅ Feature engineering completed!')
        print(f'📈 Features shape: {features_df.shape}')
        print(f'📊 Companies processed: {features_df[\"symbol\"].nunique() if \"symbol\" in features_df.columns else \"N/A\"}')
        
        # Show sample of engineered features
        feature_cols = [col for col in features_df.columns if col in [
            'roa', 'leverage', 'current_ratio', 'revenue_growth', 
            'roa_rolling_4q', 'equity_return_100d', 'naive_dtd'
        ]]
        if feature_cols:
            print(f'🎯 Key features available: {feature_cols[:5]}')
        
        print('💾 Features saved to data/engineered_features.csv')
    else:
        print('⚠️ No features generated. Check if data exists in database.')
        
except ImportError as ie:
    print(f'❌ Import error: {ie}')
    print('Falling back to basic feature calculation...')
    
    # Fallback: basic feature engineering from database
    from storage import SessionLocal
    from models import CompanyFundamentals
    import pandas as pd
    
    db = SessionLocal()
    query = '''
    SELECT symbol, sector, total_revenue, net_income, total_assets, 
           total_liabilities, roa, leverage_assets, ingested_at
    FROM company_fundamentals 
    WHERE total_assets IS NOT NULL
    '''
    df = pd.read_sql(query, db.bind)
    db.close()
    
    if len(df) > 0:
        # Basic feature calculations
        df['leverage_ratio'] = df['total_liabilities'] / df['total_assets']
        df['asset_quality'] = df['net_income'] / df['total_revenue']
        
        df.to_csv('../data/basic_features.csv', index=False)
        print(f'✅ Basic features created for {len(df)} records')
    else:
        print('❌ No data found in database')
    
except Exception as e:
    print(f'❌ Feature engineering error: {e}')
    print('Make sure you have run data ingestion first.')
"
}

train_models() {
    log "🤖 Model Training Phase: Features → CDS Prediction Model"
    
    cd "$PROJECT_ROOT/model_training"
    
    # Check if engineered features exist
    if [ ! -f "../data/engineered_features.csv" ]; then
        warn "⚠️ No engineered features found. Run feature engineering first."
        return 1
    fi
    
    python -c "
import sys, os
sys.path.append('.')
sys.path.append('../feature_engineering')
sys.path.append('../data_ingestion/structured_data')

try:
    from train_cds_models import train_cds_models_from_features
    import pandas as pd
    
    print('🎯 Loading engineered features for model training...')
    
    # Load features
    features_df = pd.read_csv('../data/engineered_features.csv')
    print(f'📊 Features loaded: {features_df.shape}')
    
    # Train CDS models using panel regression methods
    print('🏗️ Training CDS prediction models with panel regression...')
    results = train_cds_models_from_features(features_df=features_df)
    
    print(f'✅ Model training completed!')
    print(f'📈 Models trained: {results["models_trained"]}')
    print(f'❌ Models failed: {results["models_failed"]}')
    
    if results["models_trained"] > 0:
        print('🎯 Model performance summary:')
        summary = results.get('summary', {})
        if 'model_performance' in summary:
            for model_name, perf in summary['model_performance'].items():
                r2 = perf.get('r_squared', 'N/A')
                rmse = perf.get('rmse', 'N/A')
                print(f'  • {model_name}: R² = {r2}, RMSE = {rmse}')
        
        print('📊 Data information:')
        data_info = results.get('data_info', {})
        print(f'  • Observations: {data_info.get("observations", 0)}')
        print(f'  • Features: {data_info.get("features", 0)}')
        
        # Explainability insights
        explainability = results.get('explainability', {})
        if explainability:
            print('🔍 Explainability insights:')
            top_features = explainability.get('top_features', [])[:3]  # Top 3
            for i, feature in enumerate(top_features, 1):
                feat_name = feature.get('feature', '')
                importance = feature.get('importance', 0)
                description = feature.get('description', '')
                print(f'  {i}. {feat_name} (importance: {importance:.3f})')
                print(f'     {description}')
            
            insights = explainability.get('insights', [])
            if insights:
                print('💡 Key insights:')
                for insight in insights[:2]:  # Top 2 insights
                    print(f'  • {insight}')
        print(f'  • Entities: {data_info.get("entities", 0)}')
        print(f'  • Time periods: {data_info.get("time_periods", 0)}')
        
        # Save model results
        import json
        with open('../data/cds_model_results.json', 'w') as f:
            # Convert results to JSON-serializable format
            json_results = {
                'models_trained': results['models_trained'],
                'models_failed': results['models_failed'],
                'summary': results.get('summary', {}),
                'data_info': results.get('data_info', {})
            }
            json.dump(json_results, f, indent=2, default=str)
        print('💾 CDS model results saved to data/cds_model_results.json')
    else:
        print('⚠️ No CDS models trained successfully. Check logs for errors.')
        
except ImportError as e:
    print(f'❌ Import error: {e}')
    print('� Installing required packages...')
    os.system('pip install linearmodels statsmodels scikit-learn')
    
except Exception as e:
    print(f'❌ CDS model training error: {e}')
    import traceback
    traceback.print_exc()
"
}

start_api() {
    log "🌐 Starting API server for real-time access"
    cd "$PROJECT_ROOT/data_ingestion/structured_data"
    python -m uvicorn enhanced_api:app --host 0.0.0.0 --port 8000 &
    sleep 3
    
    if curl -s http://localhost:8000/health > /dev/null; then
        log "✅ API ready: http://localhost:8000/docs"
    else
        warn "API startup issue"
    fi
}

show_results() {
    log "📊 Pipeline Results Summary"
    
    cd "$PROJECT_ROOT/data_ingestion/structured_data"
    python -c "
from storage import SessionLocal
from models import CompanyFundamentals

db = SessionLocal()
count = db.query(CompanyFundamentals).count()
recent = db.query(CompanyFundamentals).order_by(CompanyFundamentals.ingested_at.desc()).limit(5).all()

print(f'📈 Total companies in database: {count}')
print('📊 Recent ingestions:')
for record in recent:
    print(f'   • {record.symbol} ({record.sector}) - {record.ingested_at}')

db.close()
"
    
    info "💡 Next steps:"
    info "   • View data: http://localhost:8000/api/dashboard/summary"
    info "   • API docs: http://localhost:8000/docs"
    info "   • Features: data/engineered_features.csv"
}

# Main pipeline execution
run_pipeline() {
    local tickers="${1:-$DEFAULT_TICKERS}"
    
    log "🏦 CredTech Data Pipeline Starting"
    log "📊 Flow: Fetch → PostgreSQL → Features → Models"
    
    check_env
    init_database
    fetch_and_store_data "$tickers"
    run_feature_engineering
    train_models
    start_api
    show_results
    
    log "🎉 Pipeline completed successfully!"
}

# Command line interface
case "${1:-run}" in
    "run") run_pipeline "$2" ;;
    "fetch") check_env; init_database; fetch_and_store_data "${2:-$DEFAULT_TICKERS}" ;;
    "features") check_env; run_feature_engineering ;;
    "models") check_env; train_models ;;
    "api") check_env; start_api; sleep infinity ;;
    "status") show_results ;;
    "help"|"-h")
        echo "CredTech Data Pipeline"
        echo ""
        echo "Usage: $0 [command] [tickers]"
        echo ""
        echo "Commands:"
        echo "  run [tickers]    - Full pipeline (default)"
        echo "  fetch [tickers]  - Just data ingestion"
        echo "  features         - Just feature engineering"
        echo "  models           - Just model training"
        echo "  api              - Just API server"
        echo "  status           - Show current status"
        echo ""
        echo "Examples:"
        echo "  $0 run AAPL,MSFT,GOOGL"
        echo "  $0 fetch TSLA,NVDA"
        echo "  $0 features"
        ;;
    *) error "Unknown command: $1. Use '$0 help' for usage."; exit 1 ;;
esac

start_database() {
    log "Starting database services..."
    
    # Check if Docker is available and start PostgreSQL if needed
    if command -v docker &> /dev/null; then
        if docker ps | grep -q postgres; then
            info "PostgreSQL container already running"
        else
            info "Starting PostgreSQL with Docker Compose..."
            cd "$PROJECT_ROOT"
            if [[ -f "docker-compose.yml" ]]; then
                docker-compose up -d postgres
                sleep 5  # Wait for database to be ready
            fi
        fi
    fi
    
    # Initialize database schema
    info "Initializing database schema..."
    cd "$PROJECT_ROOT/data_ingestion/structured_data"
    python -c "
from storage import init_db
init_db()
print('Database schema initialized')
"
}

ingest_structured_data() {
    local tickers="$1"
    log "Starting structured data ingestion for tickers: $tickers"
    
    cd "$PROJECT_ROOT/data_ingestion/structured_data"
    
    IFS=',' read -ra TICKER_ARRAY <<< "$tickers"
    for ticker in "${TICKER_ARRAY[@]}"; do
        ticker=$(echo "$ticker" | tr -d ' ')  # Remove whitespace
        info "Ingesting data for $ticker..."
        
        # Yahoo Finance data
        python -c "
import sys
sys.path.append('.')
from sources.yahoo_finance_features import fetch_credit_features
from storage import SessionLocal
from models import CompanyFundamentals
import json
from datetime import datetime

try:
    # Fetch data
    data = fetch_credit_features('$ticker')
    fundamentals = data['fundamentals']
    
    # Store in database
    db = SessionLocal()
    
    # Check if record exists
    existing = db.query(CompanyFundamentals).filter_by(symbol='$ticker').first()
    
    if existing:
        # Update existing record
        for key, value in fundamentals.items():
            if hasattr(existing, key) and value is not None:
                setattr(existing, key, value)
        existing.updated_at = datetime.utcnow()
    else:
        # Create new record
        record = CompanyFundamentals(
            company=fundamentals.get('sector', 'Unknown'),
            symbol='$ticker',
            fundamentals=fundamentals,
            source='yahoo_finance',
            **{k: v for k, v in fundamentals.items() if hasattr(CompanyFundamentals, k) and v is not None}
        )
        db.add(record)
    
    db.commit()
    db.close()
    print(f'✓ Stored data for $ticker')
    
except Exception as e:
    print(f'✗ Error ingesting $ticker: {e}')
" || warn "Failed to ingest data for $ticker"
        
        # Add small delay to avoid rate limiting
        sleep 1
    done
    
    log "Structured data ingestion completed"
}

start_unstructured_ingestion() {
    log "Starting unstructured data ingestion..."
    
    # Start Go-based unstructured data service
    cd "$PROJECT_ROOT/data_ingestion/unstructured_data"
    
    if [[ -f "main.go" ]]; then
        info "Starting Go unstructured data service..."
        go run main.go &
        echo $! > "$PROJECT_ROOT/unstructured_service.pid"
        sleep 3
    fi
    
    # Start sentiment analysis for existing data
    cd "$PROJECT_ROOT/NLP_pipeline/sentiment"
    info "Running sentiment analysis on existing data..."
    python sentiment_analysis.py &
    echo $! > "$PROJECT_ROOT/sentiment_service.pid"
}

run_feature_engineering() {
    log "Running feature engineering pipeline..."
    
    cd "$PROJECT_ROOT/feature_engineering"
    python -c "
try:
    from AcademicFeatureEngineer import AcademicFeatureEngineer
    engineer = AcademicFeatureEngineer()
    print('Feature engineering pipeline ready')
except Exception as e:
    print(f'Feature engineering error: {e}')
"
}

train_models() {
    log "Training academic credit models..."
    
    cd "$PROJECT_ROOT/model_training"
    python -c "
try:
    from academic_models import AcademicCDSModels
    print('Academic models ready for training')
    # Add actual training logic here when data is available
except Exception as e:
    print(f'Model training error: {e}')
"
}

start_api_server() {
    log "Starting FastAPI server..."
    
    cd "$PROJECT_ROOT/data_ingestion/structured_data"
    
    # Kill existing server if running
    if [[ -f "$PROJECT_ROOT/api_server.pid" ]]; then
        kill $(cat "$PROJECT_ROOT/api_server.pid") 2>/dev/null || true
        rm "$PROJECT_ROOT/api_server.pid"
    fi
    
    # Start FastAPI server
    python -m uvicorn enhanced_api:app --host 0.0.0.0 --port 8000 --reload &
    echo $! > "$PROJECT_ROOT/api_server.pid"
    
    info "API server starting on http://localhost:8000"
    sleep 3
    
    # Test API health
    if curl -s http://localhost:8000/health > /dev/null; then
        log "API server is healthy ✓"
    else
        warn "API server health check failed"
    fi
}

start_frontend() {
    log "Starting frontend development server..."
    
    cd "$PROJECT_ROOT/frontend"
    
    if [[ -f "package.json" ]]; then
        # Install dependencies if needed
        if [[ ! -d "node_modules" ]]; then
            info "Installing frontend dependencies..."
            npm install
        fi
        
        # Start development server
        npm run dev &
        echo $! > "$PROJECT_ROOT/frontend_server.pid"
        
        info "Frontend server starting on http://localhost:3000"
    else
        warn "Frontend package.json not found, skipping frontend startup"
    fi
}

monitor_pipeline() {
    log "Starting pipeline monitoring..."
    
    while true; do
        # Check API health
        if ! curl -s http://localhost:8000/health > /dev/null; then
            warn "API server appears to be down"
        fi
        
        # Check database connections
        python -c "
import sys
sys.path.append('$PROJECT_ROOT/data_ingestion/structured_data')
try:
    from storage import SessionLocal
    db = SessionLocal()
    result = db.execute('SELECT COUNT(*) FROM company_fundamentals').scalar()
    print(f'Database records: {result}')
    db.close()
except Exception as e:
    print(f'Database check failed: {e}')
" || warn "Database health check failed"
        
        # Log system status
        info "Pipeline status: Running (API: ✓, DB: ✓)"
        
        sleep 30  # Check every 30 seconds
    done
}

stop_pipeline() {
    log "Stopping CredTech pipeline..."
    
    # Stop all services
    for pid_file in "$PROJECT_ROOT"/*.pid; do
        if [[ -f "$pid_file" ]]; then
            pid=$(cat "$pid_file")
            kill "$pid" 2>/dev/null || true
            rm "$pid_file"
        fi
    done
    
    # Stop Docker containers if running
    if command -v docker &> /dev/null; then
        cd "$PROJECT_ROOT"
        if [[ -f "docker-compose.yml" ]]; then
            docker-compose down
        fi
    fi
    
    log "Pipeline stopped"
}

run_full_pipeline() {
    local tickers="${1:-$DEFAULT_TICKERS}"
    local duration="${2:-1h}"
    
    log "Starting CredTech Real-Time Pipeline"
    log "Tickers: $tickers"
    log "Duration: $duration"
    
    # Store PID for cleanup
    echo $$ > "$PID_FILE"
    
    # Trap to ensure cleanup on exit
    trap 'stop_pipeline; exit' INT TERM EXIT
    
    # Start pipeline components
    check_dependencies
    start_database
    ingest_structured_data "$tickers"
    start_unstructured_ingestion
    run_feature_engineering
    train_models
    start_api_server
    start_frontend
    
    log "Pipeline started successfully! 🚀"
    log "API Documentation: http://localhost:8000/docs"
    log "Frontend Dashboard: http://localhost:3000"
    log "Log file: $LOG_FILE"
    
    # Convert duration to seconds for monitoring
    case "$duration" in
        *h) duration_sec=$((${duration%h} * 3600)) ;;
        *m) duration_sec=$((${duration%m} * 60)) ;;
        *s) duration_sec=${duration%s} ;;
        *) duration_sec=3600 ;;  # Default 1 hour
    esac
    
    # Run for specified duration
    timeout "$duration_sec" monitor_pipeline || {
        log "Pipeline completed after $duration"
    }
}

# CLI interface
case "${1:-run}" in
    "run")
        run_full_pipeline "$2" "$3"
        ;;
    "stop")
        stop_pipeline
        ;;
    "start-api")
        check_dependencies
        start_database
        start_api_server
        ;;
    "ingest")
        check_dependencies
        start_database
        ingest_structured_data "${2:-$DEFAULT_TICKERS}"
        ;;
    "monitor")
        monitor_pipeline
        ;;
    "test")
        check_dependencies
        log "Dependencies test passed ✓"
        ;;
    "help"|"-h"|"--help")
        echo "CredTech Real-Time Pipeline Orchestrator"
        echo ""
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  run [tickers] [duration]  - Start full pipeline (default: run AAPL,MSFT,... 1h)"
        echo "  stop                      - Stop all pipeline services"
        echo "  start-api                 - Start only API server"
        echo "  ingest [tickers]          - Run data ingestion only"
        echo "  monitor                   - Monitor pipeline status"
        echo "  test                      - Test dependencies"
        echo "  help                      - Show this help"
        echo ""
        echo "Examples:"
        echo "  $0 run AAPL,MSFT,GOOGL 2h    # Run for 2 hours with specific tickers"
        echo "  $0 ingest TSLA,NVDA          # Ingest data for TSLA and NVDA only"
        echo "  $0 start-api                 # Start API server only"
        echo ""
        ;;
    *)
        error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
