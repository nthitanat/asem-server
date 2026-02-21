#!/bin/bash

# ASEM Server Docker Setup Script
# This script helps you get started with Docker quickly

set -e

echo "🐳 ASEM Server Docker Setup"
echo "======================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    echo "   Visit: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please update Docker Desktop."
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Check for .env.production
if [ ! -f .env.production ]; then
    echo "⚠️  .env.production not found"
    echo "   Creating from template..."
    cp .env.production.example .env.production
    echo "✅ Created .env.production"
    echo "   ⚠️  IMPORTANT: Edit .env.production with your production values!"
    echo ""
fi

# Ask user which environment to start
echo "Which environment do you want to start?"
echo "1) Development (with hot-reload, MailDev)"
echo "2) Production (optimized build)"
echo "3) Exit"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting development environment..."
        echo "   - API: http://localhost:5001"
        echo "   - MailDev: http://localhost:1080"
        echo "   - Press Ctrl+C to stop"
        echo ""
        npm run docker:dev
        ;;
    2)
        echo ""
        echo "🚀 Starting production environment..."
        echo "   - API: http://localhost:5001"
        echo "   - Running in detached mode"
        echo ""
        npm run docker:prod
        echo ""
        echo "✅ Production environment started!"
        echo "   View logs: npm run docker:logs"
        echo "   Stop: npm run docker:prod:down"
        ;;
    3)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
