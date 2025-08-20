# Structured Data Ingestion

This module ingests, stores, and serves structured financial data using FastAPI, PostgreSQL, and Socket.IO.

## Features
- Ingest data from sources like Yahoo Finance, SEC
- Store data in PostgreSQL using SQLAlchemy ORM
- Real-time updates via Socket.IO (**To be implemented**)
- REST API endpoints via FastAPI

## Usage

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Change to the structured_data directory:
   ```bash
   cd data_ingestion/structured_data
   ```
   
2.1 
```bash
   docker compose up
   ```
3. Run the API server:
   ```bash
   python api.py
   ```
4. Run the Socket.IO server: 
   ```bash
   python socket_server.py
   ```
5. Ingest sample data:
   ```bash
   python main.py
   ```


## Directory Structure
- `api.py`: FastAPI endpoints
- `config.py`: Configuration
- `main.py`: Entry point/sample ingestion
- `models.py`: SQLAlchemy models
- `requirements.txt`: Dependencies
- `socket_server.py`: Socket.IO server
- `storage.py`: DB logic
- `sources/`: Source-specific ingestion scripts
- `utils.py`: Utilities
