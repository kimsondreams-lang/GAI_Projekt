#!/bin/bash

# =============================================================================
# GAI AGENT - LOCAL DEVELOPMENT SETUP
# =============================================================================
# This script sets up the complete GAI Agent system for local development
# Usage: ./scripts/dev-local.sh

set -e

echo "🚀 Setting up GAI Agent for Local Development..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_warning "Node.js is not installed. Frontend development will not be available."
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_warning "npm is not installed. Frontend development will not be available."
    fi
    
    print_success "Prerequisites check complete"
}

# Create .env file if it doesn't exist
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        print_status "Creating .env file from template..."
        cp .env.example .env
        print_warning "Please edit .env file with your configuration before running the services"
    else
        print_success ".env file already exists"
    fi
}

# Initialize database
init_database() {
    print_status "Initializing database..."
    
    # Create init.sql if it doesn't exist
    if [ ! -f "scripts/init.sql" ]; then
        cat > scripts/init.sql << 'EOF'
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create database user if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'gai') THEN
        CREATE USER gai WITH PASSWORD 'gai';
    END IF;
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE gai TO gai;

-- Create schema for vector operations (if using pgvector)
CREATE SCHEMA IF NOT EXISTS vector;
GRANT ALL ON SCHEMA vector TO gai;
EOF
        print_success "Created database initialization script"
    fi
}

# Setup frontend dependencies
setup_frontend() {
    print_status "Setting up frontend dependencies..."
    
    if [ -d "apps/web" ]; then
        cd apps/web
        
        if [ -f "package.json" ]; then
            print_status "Installing npm dependencies..."
            npm install
            print_success "Frontend dependencies installed"
        else
            print_warning "No package.json found in apps/web"
        fi
        
        cd ../..
    else
        print_warning "Frontend directory not found"
    fi
}

# Start services with Docker Compose
start_services() {
    print_status "Starting services with Docker Compose..."
    
    # Build and start services
    docker-compose -f deploy/docker-compose.yml up --build -d
    
    print_success "Services started successfully"
    print_status "Waiting for services to be ready..."
    
    # Wait for services to be ready
    sleep 30
    
    # Check service health
    check_services_health
}

# Check services health
check_services_health() {
    print_status "Checking services health..."
    
    # Check PostgreSQL
    if docker-compose -f deploy/docker-compose.yml exec -T postgres pg_isready -U gai -d gai; then
        print_success "PostgreSQL is healthy"
    else
        print_error "PostgreSQL is not healthy"
    fi
    
    # Check Redis
    if docker-compose -f deploy/docker-compose.yml exec -T redis redis-cli ping | grep -q PONG; then
        print_success "Redis is healthy"
    else
        print_error "Redis is not healthy"
    fi
    
    # Check Backend
    if curl -f http://localhost:8000/health &> /dev/null; then
        print_success "Backend is healthy"
    else
        print_warning "Backend might not be ready yet"
    fi
    
    # Check Frontend
    if curl -f http://localhost:3000 &> /dev/null; then
        print_success "Frontend is healthy"
    else
        print_warning "Frontend might not be ready yet"
    fi
}

# Display service URLs
display_urls() {
    echo
    echo "🎉 Local Development Setup Complete!"
    echo "====================================="
    echo
    echo "Service URLs:"
    echo "-------------"
    echo "🌐 Frontend:  http://localhost:3000"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📊 PostgreSQL: localhost:5432"
    echo "📈 Redis:      localhost:6379"
    echo
    echo "Default Credentials:"
    echo "-------------------"
    echo "Database: gai/gai"
    echo "Panel Password: devpass (change in .env file)"
    echo
    echo "Useful Commands:"
    echo "---------------"
    echo "View logs:     docker-compose -f deploy/docker-compose.yml logs -f"
    echo "Stop services: docker-compose -f deploy/docker-compose.yml down"
    echo "Rebuild:       docker-compose -f deploy/docker-compose.yml up --build"
    echo "Clean up:      docker-compose -f deploy/docker-compose.yml down -v"
    echo
    echo "Frontend Development:"
    echo "--------------------"
    echo "cd apps/web && npm run dev"
    echo
}

# Main setup function
main() {
    echo "🚀 GAI Agent Local Development Setup"
    echo "===================================="
    echo
    
    # Run setup steps
    check_prerequisites
    setup_environment
    init_database
    setup_frontend
    start_services
    display_urls
    
    echo "✅ Setup complete! Your GAI Agent is ready for development."
    echo
    echo "Next steps:"
    echo "1. Configure your API keys in .env file"
    echo "2. Set up FTP credentials for publishing (optional)"
    echo "3. Access the web interface at http://localhost:3000"
    echo "4. Start developing! 🚀"
}

# Handle script interruption
trap 'print_error "Setup interrupted"; exit 1' INT TERM

# Run main function
main "$@"