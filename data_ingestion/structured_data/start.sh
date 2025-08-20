#!/bin/bash
# CredTech Structured Data API Startup Script

echo "🚀 Starting CredTech Structured Data API..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source .venv/bin/activate

# Install/update dependencies
echo "📋 Installing dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file from sample..."
    cp sample.env .env
    echo "⚠️  Please edit .env file with your actual configuration values!"
fi

# Start the API
echo "🌐 Starting API server..."
python main.py
