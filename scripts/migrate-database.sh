#!/bin/bash

# =============================================================================
# GAI AGENT - DATABASE MIGRATION SCRIPT
# =============================================================================
# This script handles database migrations and initialization
# Usage: ./scripts/migrate-database.sh [command]
# Commands: init, migrate, reset, backup, restore

set -e

echo "🗄️ GAI Agent Database Migration Tool"
echo "===================================="

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

# Get database connection info
get_db_connection() {
    if [ -n "$DATABASE_URL" ]; then
        DB_URL="$DATABASE_URL"
    else
        DB_URL="postgres://${POSTGRES_USER:-gai}:${POSTGRES_PASSWORD:-gai}@${POSTGRES_HOST:-localhost}:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-gai}"
    fi
}

# Initialize database
init_database() {
    print_status "Initializing database..."
    
    get_db_connection
    
    # Create database schema
    psql "$DB_URL" << 'EOF'
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create vector extension if available (for pgvector)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        CREATE EXTENSION IF NOT EXISTS vector;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Vector extension not available';
END
$$;

-- Create schema for GAI Agent
CREATE SCHEMA IF NOT EXISTS gai;
SET search_path TO gai, public;

-- Users table (if needed for custom auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    payload JSONB,
    result JSONB,
    error_message TEXT,
    cost_usd DECIMAL(10,6) DEFAULT 0.0,
    execution_time_seconds INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Publications table
CREATE TABLE IF NOT EXISTS publications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],
    status VARCHAR(50) DEFAULT 'draft',
    metadata JSONB,
    seo_data JSONB,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics data table
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    user_agent VARCHAR(500),
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent status table
CREATE TABLE IF NOT EXISTS agent_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(50) NOT NULL,
    wake_cycles INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    active_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    failed_tasks INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10,6) DEFAULT 0.0,
    uptime_seconds INTEGER DEFAULT 0,
    last_wake_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    data_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_publications_slug ON publications(slug);
CREATE INDEX IF NOT EXISTS idx_publications_status ON publications(status);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_status_status ON agent_status(status);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Insert default settings
INSERT INTO settings (key, value, data_type, description) VALUES
('wake_cycle_min', '5', 'integer', 'Agent wake cycle in minutes'),
('cost_budget_usd_per_cycle', '5.0', 'decimal', 'Budget limit per cycle in USD'),
('max_tasks_per_cycle', '10', 'integer', 'Maximum tasks per cycle'),
('require_approval_for_new_categories', 'false', 'boolean', 'Require approval for new task categories'),
('analytics_tracking_enabled', 'true', 'boolean', 'Enable analytics tracking'),
('auto_refresh_interval', '5000', 'integer', 'Auto refresh interval in milliseconds'),
('debug_mode', 'false', 'boolean', 'Enable debug mode'),
('default_model_provider', 'deepseek', 'string', 'Default AI model provider'),
('openai_model', 'gpt-4', 'string', 'Default OpenAI model'),
('anthropic_model', 'claude-3-sonnet-20240229', 'string', 'Default Anthropic model'),
('deepseek_model', 'deepseek-chat', 'string', 'Default DeepSeek model');

-- Insert default agent status
INSERT INTO agent_status (status, wake_cycles, total_tasks, active_tasks, completed_tasks, failed_tasks, total_cost_usd, uptime_seconds, last_wake_at) VALUES
('stopped', 0, 0, 0, 0, 0, 0.0, 0, NOW());

-- Grant permissions (adjust as needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA gai TO gai;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA gai TO gai;
GRANT ALL PRIVILEGES ON SCHEMA gai TO gai;

print_success "Database initialized successfully"
EOF
}

# Run migrations
migrate_database() {
    print_status "Running database migrations..."
    
    get_db_connection
    
    # Check if alembic is available
    if command -v alembic &> /dev/null; then
        print_status "Running Alembic migrations..."
        alembic upgrade head
    else
        print_warning "Alembic not found, skipping Alembic migrations"
    fi
    
    print_success "Database migrations completed"
}

# Backup database
backup_database() {
    print_status "Creating database backup..."
    
    get_db_connection
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    pg_dump "$DB_URL" > "$BACKUP_FILE"
    
    print_success "Database backup created: $BACKUP_FILE"
}

# Reset database
reset_database() {
    print_warning "This will delete all data in the database!"
    read -p "Are you sure you want to reset the database? (yes/no): " -r
    
    if [[ $REPLY == "yes" ]]; then
        print_status "Resetting database..."
        
        get_db_connection
        
        # Drop and recreate schema
        psql "$DB_URL" << 'EOF'
DROP SCHEMA IF EXISTS gai CASCADE;
CREATE SCHEMA gai;
GRANT ALL ON SCHEMA gai TO gai;
EOF
        
        # Reinitialize
        init_database
        migrate_database
        
        print_success "Database reset completed"
    else
        print_status "Database reset cancelled"
    fi
}

# Main function
main() {
    echo "🗄️ GAI Agent Database Migration Tool"
    echo "===================================="
    echo
    
    # Check if PostgreSQL client is available
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL client (psql) is not installed"
        echo "Please install PostgreSQL client tools"
        exit 1
    fi
    
    # Parse command line arguments
    COMMAND="${1:-help}"
    
    case "$COMMAND" in
        "init")
            init_database
            ;;
        "migrate")
            migrate_database
            ;;
        "reset")
            reset_database
            ;;
        "backup")
            backup_database
            ;;
        "help"|*)
            echo "Usage: $0 [command]"
            echo
            echo "Commands:"
            echo "  init     - Initialize database with schema and default data"
            echo "  migrate  - Run database migrations"
            echo "  reset    - Reset database (drops all data)"
            echo "  backup   - Create database backup"
            echo "  help     - Show this help message"
            echo
            echo "Environment variables:"
            echo "  DATABASE_URL - Full PostgreSQL connection string"
            echo "  Or use individual variables:"
            echo "  POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD"
            ;;
    esac
}

# Run main function
main "$@"