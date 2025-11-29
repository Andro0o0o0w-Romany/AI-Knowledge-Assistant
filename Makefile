# Makefile for AI Knowledge Assistant

.PHONY: help install dev backend frontend docker clean test lint

# Default target
help:
	@echo "AI Knowledge Assistant - Available Commands"
	@echo "============================================"
	@echo ""
	@echo "Development:"
	@echo "  make install     - Install all dependencies"
	@echo "  make dev         - Start development servers"
	@echo "  make backend     - Start backend server only"
	@echo "  make frontend    - Start frontend server only"
	@echo ""
	@echo "Docker:"
	@echo "  make docker      - Start with Docker Compose"
	@echo "  make docker-dev  - Start with dev Docker Compose"
	@echo "  make docker-down - Stop Docker services"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test        - Run all tests"
	@echo "  make lint        - Run linters"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean       - Clean build artifacts"

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Start development servers
dev:
	@echo "Starting development servers..."
	@make -j2 backend frontend

# Start backend only
backend:
	@echo "Starting backend server..."
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start frontend only
frontend:
	@echo "Starting frontend server..."
	cd frontend && npm run dev

# Docker commands
docker:
	@echo "Starting with Docker Compose..."
	docker-compose up --build

docker-dev:
	@echo "Starting with dev Docker Compose..."
	docker-compose -f docker-compose.dev.yml up --build

docker-down:
	@echo "Stopping Docker services..."
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

# Run tests
test:
	@echo "Running backend tests..."
	cd backend && pytest -v
	@echo "Running frontend lint..."
	cd frontend && npm run lint

# Run linters
lint:
	@echo "Linting backend..."
	cd backend && python -m flake8 app --max-line-length=120 || true
	@echo "Linting frontend..."
	cd frontend && npm run lint

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf backend/uploads backend/vector_store backend/*.db 2>/dev/null || true
	@echo "Clean complete!"

