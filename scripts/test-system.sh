#!/bin/bash

# =============================================================================
# GAI AGENT - COMPLETE SYSTEM TEST
# =============================================================================
# This script performs comprehensive testing of the entire GAI Agent system
# Usage: ./scripts/test-system.sh [local|railway]

set -e

echo "🧪 GAI Agent System Testing"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Test configuration
ENVIRONMENT="${1:-local}"
BASE_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"

if [ "$ENVIRONMENT" = "railway" ]; then
    # Get Railway URLs
    print_status "Getting Railway service URLs..."
    BACKEND_URL=$(railway status --json 2>/dev/null | jq -r '.services[] | select(.name == "gai-backend") | .domain' 2>/dev/null || echo "")
    FRONTEND_URL=$(railway status --json 2>/dev/null | jq -r '.services[] | select(.name == "gai-web") | .domain' 2>/dev/null || echo "")
    
    if [ -n "$BACKEND_URL" ]; then
        BASE_URL="https://$BACKEND_URL"
    fi
    
    if [ -n "$FRONTEND_URL" ]; then
        FRONTEND_URL="https://$FRONTEND_URL"
    fi
fi

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    print_status "Testing: $test_name"
    
    if eval "$test_command"; then
        if [ "$expected_result" = "pass" ] || [ -z "$expected_result" ]; then
            print_success "$test_name"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            print_error "$test_name (unexpected success)"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        if [ "$expected_result" = "fail" ]; then
            print_success "$test_name (expected failure)"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            print_error "$test_name"
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    fi
}

# Test backend health
test_backend_health() {
    run_test "Backend Health Check" \
        "curl -f -s -o /dev/null -w \"%{http_code}\" $BASE_URL/health | grep -q 200" \
        "pass"
}

# Test backend API endpoints
test_backend_apis() {
    # Test root endpoint
    run_test "Backend Root API" \
        "curl -f -s -o /dev/null -w \"%{http_code}\" $BASE_URL/ | grep -q 200" \
        "pass"
    
    # Test analytics summary
    run_test "Analytics Summary API" \
        "curl -f -s -o /dev/null -w \"%{http_code}\" $BASE_URL/api/analytics/summary | grep -q 200" \
        "pass"
    
    # Test tasks API
    run_test "Tasks API" \
        "curl -f -s -o /dev/null -w \"%{http_code}\" $BASE_URL/api/tasks | grep -q 200" \
        "pass"
    
    # Test publications API
    run_test "Publications API" \
        "curl -f -s -o /dev/null -w \"%{http_code}\" $BASE_URL/api/publications | grep -q 200" \
        "pass"
    
    # Test settings API
    run_test "Settings API" \
        "curl -f -s -o /dev/null -w \"%{http_code}\" $BASE_URL/api/settings | grep -q 200" \
        "pass"
}

# Test frontend
test_frontend() {
    run_test "Frontend Accessibility" \
        "curl -f -s -o /dev/null -w \"%{http_code}\" $FRONTEND_URL | grep -q 200" \
        "pass"
    
    # Test frontend API endpoints
    run_test "Frontend System Status API" \
        "curl -f -s -o /dev/null -w \"%{http_code}\" $FRONTEND_URL/api/system/status | grep -q 200" \
        "pass"
}

# Test database connectivity
test_database() {
    run_test "Database Connection via Backend" \
        "curl -f -s $BASE_URL/health | grep -q \"database.*healthy\"" \
        "pass"
}

# Test Redis connectivity
test_redis() {
    run_test "Redis Connection via Backend" \
        "curl -f -s $BASE_URL/health | grep -q \"redis.*healthy\"" \
        "pass"
}

# Test agent functionality
test_agent() {
    # Test agent status
    run_test "Agent Status API" \
        "curl -f -s $BASE_URL/api/agent/status | grep -q \"status\"" \
        "pass"
    
    # Test agent start/stop (if auth is disabled for testing)
    if [ "$ENVIRONMENT" = "local" ]; then
        run_test "Agent Start API" \
            "curl -f -s -X POST $BASE_URL/api/agent/start | grep -q \"status\"" \
            "pass"
        
        # Wait a moment
        sleep 2
        
        run_test "Agent Stop API" \
            "curl -f -s -X POST $BASE_URL/api/agent/stop | grep -q \"status\"" \
            "pass"
    fi
}

# Test memory system
test_memory() {
    run_test "Memory System Test" \
        "python3 -c \"
import sys
sys.path.append('.')
try:
    from packages.memory.db import SessionLocal
    from packages.memory.store import MemoryStore
    store = MemoryStore()
    print('Memory system OK')
except Exception as e:
    print(f'Memory system error: {e}')
    sys.exit(1)
\"" \
        "pass"
}

# Test model providers
test_models() {
    run_test "Model Registry Test" \
        "python3 -c \"
import sys
sys.path.append('.')
try:
    from packages.models.registry import ModelRegistry
    registry = ModelRegistry()
    print('Model registry OK')
except Exception as e:
    print(f'Model registry error: {e}')
    sys.exit(1)
\"" \
        "pass"
}

# Test task planning
test_task_planning() {
    run_test "Task Planner Test" \
        "python3 -c \"
import sys
sys.path.append('.')
try:
    from packages.core_agent.planner import TaskPlanner
    from packages.core_agent.task_queue import TaskQueue
    planner = TaskPlanner()
    queue = TaskQueue()
    print('Task planning OK')
except Exception as e:
    print(f'Task planning error: {e}')
    sys.exit(1)
\"" \
        "pass"
}

# Test tools integration
test_tools() {
    run_test "Tools Integration Test" \
        "python3 -c \"
import sys
sys.path.append('.')
try:
    from packages.tools import get_content_generator, get_seo_analyzer, get_analytics_tracker
    content_gen = get_content_generator()
    seo_analyzer = get_seo_analyzer()
    analytics_tracker = get_analytics_tracker()
    print('Tools integration OK')
except Exception as e:
    print(f'Tools integration error: {e}')
    sys.exit(1)
\"" \
        "pass"
}

# Test Docker services (if using Docker)
test_docker_services() {
    if command -v docker-compose &> /dev/null; then
        run_test "Docker Compose Services" \
            "docker-compose -f deploy/docker-compose.yml ps | grep -q 'Up'" \
            "pass"
        
        run_test "Backend Container Health" \
            "docker-compose -f deploy/docker-compose.yml exec -T backend curl -f http://localhost:8000/health" \
            "pass"
    fi
}

# Performance test
test_performance() {
    print_status "Running performance tests..."
    
    # Test API response time
    start_time=$(date +%s%N)
    curl -f -s -o /dev/null "$BASE_URL/health"
    end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$response_time" -lt 1000 ]; then
        print_success "API Response Time (${response_time}ms)"
    else
        print_warning "API Response Time (${response_time}ms) - Consider optimization"
    fi
}

# Generate test report
generate_report() {
    echo
    echo "📊 TEST REPORT"
    echo "==============="
    echo
    echo "Environment: $ENVIRONMENT"
    echo "Backend URL: $BASE_URL"
    echo "Frontend URL: $FRONTEND_URL"
    echo
    echo "Tests Run: $TESTS_TOTAL"
    echo "Tests Passed: $TESTS_PASSED"
    echo "Tests Failed: $TESTS_FAILED"
    echo
    
    if [ "$TESTS_FAILED" -eq 0 ]; then
        print_success "🎉 ALL TESTS PASSED! System is ready for production."
    else
        print_error "❌ Some tests failed. Please review the issues above."
        echo
        echo "Failed tests: $TESTS_FAILED"
        echo "Consider checking:"
        echo "- Service logs: docker-compose -f deploy/docker-compose.yml logs"
        echo "- Environment configuration: .env file"
        echo "- Database connectivity"
        echo "- API keys configuration"
    fi
    
    echo
    echo "Next steps:"
    echo "1. Configure AI provider API keys"
    echo "2. Set up FTP publishing credentials (optional)"
    echo "3. Configure analytics tracking (optional)"
    echo "4. Review and adjust system settings"
    echo "5. Monitor system performance"
}

# Main test function
main() {
    echo "🧪 GAI Agent Complete System Test"
    echo "=================================="
    echo
    echo "Testing environment: $ENVIRONMENT"
    echo "Backend: $BASE_URL"
    echo "Frontend: $FRONTEND_URL"
    echo
    
    # Wait for services to be ready
    if [ "$ENVIRONMENT" = "local" ]; then
        print_status "Waiting for services to be ready..."
        sleep 10
    fi
    
    # Run all tests
    test_backend_health
    test_backend_apis
    test_frontend
    test_database
    test_redis
    test_agent
    test_memory
    test_models
    test_task_planning
    test_tools
    test_docker_services
    test_performance
    
    # Generate report
    generate_report
    
    # Exit with appropriate code
    if [ "$TESTS_FAILED" -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Handle script interruption
trap 'print_error "Testing interrupted"; exit 1' INT TERM

# Run main function
main "$@"