#!/bin/bash

# =============================================================================
# GAI AGENT - PRODUCTION DEPLOYMENT SCRIPT
# =============================================================================
# This script deploys the complete GAI Agent system to Railway
# Usage: ./scripts/deploy-production.sh

set -e

echo "🚀 Starting GAI Agent Production Deployment..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Railway CLI is installed
check_railway_cli() {
    print_status "Checking Railway CLI installation..."
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI is not installed. Please install it first:"
        echo "  npm install -g @railway/cli"
        exit 1
    fi
    print_success "Railway CLI is installed"
}

# Check if user is logged in to Railway
check_railway_login() {
    print_status "Checking Railway login status..."
    if ! railway whoami &> /dev/null; then
        print_error "You are not logged in to Railway. Please run:"
        echo "  railway login"
        exit 1
    fi
    print_success "User is logged in to Railway"
}

# Create Railway project if it doesn't exist
setup_railway_project() {
    print_status "Setting up Railway project..."
    
    # Check if we're already in a Railway project
    if [ -f "railway.json" ]; then
        print_warning "Railway project already exists, skipping project creation"
        return
    fi
    
    # Initialize Railway project
    print_status "Initializing Railway project..."
    railway init --name "gai-agent" --description "Generative Autonomous Intelligence System" || true
    
    print_success "Railway project setup complete"
}

# Deploy backend service
deploy_backend() {
    print_status "Deploying Backend service..."
    
    # Create backend service
    railway add --service "gai-backend" --dockerfile "deploy/Dockerfile.backend" || true
    
    # Set backend environment variables
    railway variables set \
        --service "gai-backend" \
        GAI_PANEL_PASSWORD="your_secure_password_here" \
        ENVIRONMENT="production" \
        LOG_LEVEL="INFO" \
        PYTHONUNBUFFERED="1" \
        BACKEND_WORKERS="4"
    
    print_success "Backend service deployed"
}

# Deploy worker service
deploy_worker() {
    print_status "Deploying Worker service..."
    
    # Create worker service
    railway add --service "gai-worker" --dockerfile "deploy/Dockerfile.worker" || true
    
    # Set worker environment variables
    railway variables set \
        --service "gai-worker" \
        ENVIRONMENT="production" \
        LOG_LEVEL="INFO" \
        WAKE_CYCLE_MIN="5" \
        COST_BUDGET_USD_PER_CYCLE="5" \
        PYTHONUNBUFFERED="1" \
        CELERY_LOG_LEVEL="INFO"
    
    print_success "Worker service deployed"
}

# Deploy web service
deploy_web() {
    print_status "Deploying Web service..."
    
    # Create web service
    railway add --service "gai-web" --dockerfile "deploy/Dockerfile.web" || true
    
    # Set web environment variables
    railway variables set \
        --service "gai-web" \
        NODE_ENV="production" \
        NEXT_PUBLIC_GAI_PANEL_PASSWORD="your_secure_password_here"
    
    print_success "Web service deployed"
}

# Add PostgreSQL database
setup_database() {
    print_status "Setting up PostgreSQL database..."
    
    # Add PostgreSQL plugin
    railway add --plugin "postgresql" || true
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    print_success "PostgreSQL database added"
}

# Add Redis cache
setup_redis() {
    print_status "Setting up Redis cache..."
    
    # Add Redis plugin
    railway add --plugin "redis" || true
    
    # Wait for Redis to be ready
    print_status "Waiting for Redis to be ready..."
    sleep 5
    
    print_success "Redis cache added"
}

# Update service URLs
update_service_urls() {
    print_status "Updating service URLs..."
    
    # Get backend URL
    BACKEND_URL=$(railway status --json | jq -r '.services[] | select(.name == "gai-backend") | .domain' 2>/dev/null || echo "")
    
    if [ -n "$BACKEND_URL" ]; then
        # Update web service with backend URL
        railway variables set \
            --service "gai-web" \
            BACKEND_URL="https://$BACKEND_URL" \
            WS_URL="wss://$BACKEND_URL"
        
        # Update worker service with backend URL
        railway variables set \
            --service "gai-worker" \
            BACKEND_URL="https://$BACKEND_URL"
    fi
    
    print_success "Service URLs updated"
}

# Deploy all services
deploy_all() {
    print_status "Deploying all services..."
    
    # Deploy in correct order
    setup_database
    setup_redis
    deploy_backend
    deploy_worker
    deploy_web
    
    # Wait for services to be ready
    print_status "Waiting for services to initialize..."
    sleep 15
    
    update_service_urls
    
    print_success "All services deployed successfully!"
}

# Check deployment status
check_deployment() {
    print_status "Checking deployment status..."
    
    railway status
    
    print_status "Deployment URLs:"
    echo "Check Railway dashboard for your service URLs"
    echo "Railway Dashboard: https://railway.app/dashboard"
}

# Main deployment function
main() {
    echo "🚀 GAI Agent Production Deployment"
    echo "===================================="
    echo
    
    # Pre-deployment checks
    check_railway_cli
    check_railway_login
    
    # Confirm deployment
    print_warning "This will deploy GAI Agent to Railway production environment."
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled by user"
        exit 0
    fi
    
    # Run deployment
    setup_railway_project
    deploy_all
    check_deployment
    
    echo
    echo "🎉 Deployment Complete!"
    echo "======================="
    echo
    print_success "GAI Agent has been successfully deployed to Railway!"
    echo
    echo "Next steps:"
    echo "1. Set up your AI provider API keys in Railway dashboard"
    echo "2. Configure FTP settings for publishing (optional)"
    echo "3. Set up analytics tracking (optional)"
    echo "4. Access your application through Railway dashboard"
    echo
    echo "Railway Dashboard: https://railway.app/dashboard"
    echo "Documentation: https://github.com/your-username/GAI_Projekt"
}

# Run main function
main "$@"