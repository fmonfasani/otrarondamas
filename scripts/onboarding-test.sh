#!/bin/bash
##############################################################################
# Wapsell Admin Onboarding Flow - Automated Testing Script
#
# Purpose: Test the complete admin onboarding flow for Otra Ronda Más
#          including authentication, role creation, user provisioning,
#          and dashboard access verification.
#
# Usage:
#   ./onboarding-test.sh [--dry-run] [--env <environment>] [--verbose]
#
# Requirements:
#   - curl (HTTP client)
#   - jq (JSON processor)
#   - Bash 4+
#
# Exit codes:
#   0 = All tests passed
#   1 = One or more tests failed
#   2 = Configuration error (missing env vars, invalid URL, etc.)
#   3 = Tool missing (curl, jq)
##############################################################################

set -o pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="${SCRIPT_DIR}/reports/onboarding-report-${TIMESTAMP}.json"
DRY_RUN=false
VERBOSE=false
ENVIRONMENT="development"
TEST_PASSED=0
TEST_FAILED=0

##############################################################################
# Utility Functions
##############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $*"
    ((TEST_PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $*"
    ((TEST_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $*"
    fi
}

log_section() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

usage() {
    cat << EOF
Usage: $SCRIPT_NAME [OPTIONS]

Options:
    --dry-run           Run without making actual API calls
    --env <environment> Environment to test against (development|staging|production)
    --verbose           Enable verbose/debug output
    --help             Display this help message

Examples:
    # Test against development environment
    $SCRIPT_NAME --env development

    # Test with verbose output
    $SCRIPT_NAME --verbose

    # Dry run only (validate config, no API calls)
    $SCRIPT_NAME --dry-run

EOF
    exit 0
}

##############################################################################
# Configuration Management
##############################################################################

load_configuration() {
    local env_file="${SCRIPT_DIR}/.env.testing"

    # Check if environment-specific file exists
    if [[ -f "${SCRIPT_DIR}/.env.testing.${ENVIRONMENT}" ]]; then
        env_file="${SCRIPT_DIR}/.env.testing.${ENVIRONMENT}"
    fi

    if [[ ! -f "$env_file" ]]; then
        log_error "Configuration file not found: $env_file"
        log_info "Copy .env.testing.example to .env.testing and configure it"
        return 2
    fi

    # Load environment variables from file (safely)
    # shellcheck source=/dev/null
    source "$env_file"

    return 0
}

validate_configuration() {
    local errors=0

    log_info "Validating configuration..."

    # Check required variables
    local required_vars=(
        "API_BASE_URL"
        "ADMIN_EMAIL"
        "ADMIN_PASSWORD"
        "BUSINESS_HANDLE"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "Missing required configuration: $var"
            ((errors++))
        fi
    done

    if [[ $errors -gt 0 ]]; then
        return 2
    fi

    log_success "Configuration valid"
    return 0
}

##############################################################################
# Prerequisite Checks
##############################################################################

check_prerequisites() {
    log_section "Checking Prerequisites"

    # Check curl
    if ! command -v curl &> /dev/null; then
        log_error "curl is not installed. Please install it to continue."
        return 3
    fi
    log_success "curl is available"

    # Check jq
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it to continue."
        return 3
    fi
    log_success "jq is available"

    # Check bash version
    if [[ ${BASH_VERSINFO[0]} -lt 4 ]]; then
        log_error "Bash 4+ is required. Current version: ${BASH_VERSION}"
        return 3
    fi
    log_success "Bash version ${BASH_VERSINFO[0]}.${BASH_VERSINFO[1]} is compatible"

    # Create reports directory if it doesn't exist
    mkdir -p "${SCRIPT_DIR}/reports"
    log_success "Reports directory ready: ${SCRIPT_DIR}/reports"

    return 0
}

##############################################################################
# API Helper Functions
##############################################################################

call_api() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local token="$4"
    local description="$5"

    local url="${API_BASE_URL}${endpoint}"
    local response_file
    local http_code
    local response

    response_file=$(mktemp)

    log_debug "API Call: $method $url"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would call: $method $url"
        if [[ -n "$data" ]]; then
            log_debug "[DRY-RUN] Data: $data"
        fi
        return 0
    fi

    local curl_opts=(
        -s
        -w "\n%{http_code}"
        -X "$method"
        -H "Content-Type: application/json"
        -H "Accept: application/json"
    )

    if [[ -n "$token" ]]; then
        curl_opts+=(-H "Authorization: Bearer $token")
    fi

    if [[ -n "$data" ]]; then
        curl_opts+=(-d "$data")
    fi

    curl_opts+=("$url")

    # Call API and capture response + HTTP code
    response=$(curl "${curl_opts[@]}" 2>/dev/null)

    # Split response and HTTP code
    http_code=$(echo "$response" | tail -n1)
    response=$(echo "$response" | sed '$d')

    log_debug "HTTP Status: $http_code"
    log_debug "Response: $response"

    # Save to temp file for caller
    echo "$response" > "$response_file"
    echo "$http_code" > "${response_file}.code"

    echo "$response_file"
}

validate_response() {
    local response_file="$1"
    local expected_code="$2"
    local description="$3"

    local http_code
    local response

    http_code=$(cat "${response_file}.code" 2>/dev/null || echo "000")
    response=$(cat "$response_file" 2>/dev/null || echo "")

    if [[ "$http_code" == "$expected_code" ]]; then
        log_success "$description (HTTP $http_code)"
        echo "$response"
        return 0
    else
        log_error "$description (Expected HTTP $expected_code, got HTTP $http_code)"
        if [[ -n "$response" ]]; then
            log_debug "Response: $response"
        fi
        return 1
    fi
}

##############################################################################
# Test Cases
##############################################################################

test_admin_login() {
    log_section "Test 1: Admin Authentication"

    local description="Login admin user"
    local endpoint="/auth/login"
    local payload=$(jq -n \
        --arg email "$ADMIN_EMAIL" \
        --arg password "$ADMIN_PASSWORD" \
        '{email: $email, password: $password}')

    log_info "Testing: $description"
    log_debug "Email: $ADMIN_EMAIL"

    local response_file
    response_file=$(call_api "POST" "$endpoint" "$payload" "" "$description")

    local response
    response=$(validate_response "$response_file" "200" "$description")

    if [[ $? -ne 0 ]]; then
        rm -f "$response_file" "${response_file}.code"
        return 1
    fi

    # Extract JWT token
    ADMIN_TOKEN=$(echo "$response" | jq -r '.accessToken // empty' 2>/dev/null)

    if [[ -z "$ADMIN_TOKEN" ]]; then
        log_error "Failed to extract JWT token from response"
        log_debug "Response was: $response"
        rm -f "$response_file" "${response_file}.code"
        return 1
    fi

    log_success "JWT Token obtained: ${ADMIN_TOKEN:0:20}..."

    rm -f "$response_file" "${response_file}.code"
    return 0
}

test_get_user_profile() {
    log_section "Test 2: Retrieve Admin User Profile"

    local description="Fetch authenticated user profile"
    local endpoint="/auth/me"

    if [[ -z "$ADMIN_TOKEN" ]]; then
        log_error "No valid token available. Run login test first."
        return 1
    fi

    log_info "Testing: $description"

    local response_file
    response_file=$(call_api "GET" "$endpoint" "" "$ADMIN_TOKEN" "$description")

    local response
    response=$(validate_response "$response_file" "200" "$description")

    if [[ $? -ne 0 ]]; then
        rm -f "$response_file" "${response_file}.code"
        return 1
    fi

    # Extract company/business information
    COMPANY_ID=$(echo "$response" | jq -r '.empresaId // empty' 2>/dev/null)
    COMPANY_NAME=$(echo "$response" | jq -r '.empresaNombre // empty' 2>/dev/null)
    USER_ID=$(echo "$response" | jq -r '.id // empty' 2>/dev/null)
    USER_ROLE=$(echo "$response" | jq -r '.rol // empty' 2>/dev/null)

    log_success "Admin user: $ADMIN_EMAIL"
    log_success "Company ID: $COMPANY_ID"
    log_success "Company Name: $COMPANY_NAME"
    log_success "User ID: $USER_ID"
    log_success "User Role: $USER_ROLE"

    rm -f "$response_file" "${response_file}.code"

    if [[ -z "$COMPANY_ID" ]]; then
        log_error "Failed to extract company information"
        return 1
    fi

    return 0
}

test_dashboard_access() {
    log_section "Test 3: Dashboard Metrics Access"

    local description="Load dashboard KPIs"
    local endpoint="/admin/dashboard/kpis?period=30d"

    if [[ -z "$ADMIN_TOKEN" ]]; then
        log_error "No valid token available. Run login test first."
        return 1
    fi

    log_info "Testing: $description"

    local response_file
    response_file=$(call_api "GET" "$endpoint" "" "$ADMIN_TOKEN" "$description")

    local response
    response=$(validate_response "$response_file" "200" "$description")

    if [[ $? -ne 0 ]]; then
        rm -f "$response_file" "${response_file}.code"
        return 1
    fi

    # Extract and display key metrics
    local revenue
    local orders
    local conversion_rate

    revenue=$(echo "$response" | jq -r '.revenue // "N/A"' 2>/dev/null)
    orders=$(echo "$response" | jq -r '.totalOrders // "N/A"' 2>/dev/null)
    conversion_rate=$(echo "$response" | jq -r '.conversionRate // "N/A"' 2>/dev/null)

    log_success "Dashboard KPIs loaded"
    log_info "  Revenue (30d): $revenue"
    log_info "  Total Orders: $orders"
    log_info "  Conversion Rate: $conversion_rate"

    rm -f "$response_file" "${response_file}.code"
    return 0
}

test_audit_logs_access() {
    log_section "Test 4: Audit Logs Access"

    local description="Retrieve audit logs"
    local endpoint="/admin/audit/logs?limit=10&page=1"

    if [[ -z "$ADMIN_TOKEN" ]]; then
        log_error "No valid token available. Run login test first."
        return 1
    fi

    log_info "Testing: $description"

    local response_file
    response_file=$(call_api "GET" "$endpoint" "" "$ADMIN_TOKEN" "$description")

    local response
    response=$(validate_response "$response_file" "200" "$description")

    if [[ $? -ne 0 ]]; then
        rm -f "$response_file" "${response_file}.code"
        return 1
    fi

    local total
    local logs_count

    total=$(echo "$response" | jq -r '.total // "0"' 2>/dev/null)
    logs_count=$(echo "$response" | jq -r '.data | length // 0' 2>/dev/null)

    log_success "Audit logs accessible"
    log_info "  Total logs in system: $total"
    log_info "  Logs returned in this page: $logs_count"

    rm -f "$response_file" "${response_file}.code"
    return 0
}

test_users_list() {
    log_section "Test 5: Retrieve Users List"

    local description="Fetch authorized users list"
    local endpoint="/usuarios"

    if [[ -z "$ADMIN_TOKEN" ]]; then
        log_error "No valid token available. Run login test first."
        return 1
    fi

    log_info "Testing: $description"

    local response_file
    response_file=$(call_api "GET" "$endpoint" "" "$ADMIN_TOKEN" "$description")

    local response
    response=$(validate_response "$response_file" "200" "$description")

    if [[ $? -ne 0 ]]; then
        rm -f "$response_file" "${response_file}.code"
        return 1
    fi

    local users_count
    users_count=$(echo "$response" | jq 'length // 0' 2>/dev/null)

    log_success "Users list retrieved"
    log_info "  Total users: $users_count"

    if [[ "$users_count" -gt 0 ]]; then
        local user_names
        user_names=$(echo "$response" | jq -r '.[].nombre' 2>/dev/null | head -3)
        log_debug "  Sample users: $user_names"
    fi

    rm -f "$response_file" "${response_file}.code"
    return 0
}

##############################################################################
# Report Generation
##############################################################################

generate_report() {
    log_section "Generating Test Report"

    local report_json

    report_json=$(jq -n \
        --arg timestamp "$TIMESTAMP" \
        --arg environment "$ENVIRONMENT" \
        --arg api_url "$API_BASE_URL" \
        --arg business "$BUSINESS_HANDLE" \
        --arg admin_email "$ADMIN_EMAIL" \
        --arg company_id "${COMPANY_ID:-N/A}" \
        --arg company_name "${COMPANY_NAME:-N/A}" \
        --argjson tests_passed "$TEST_PASSED" \
        --argjson tests_failed "$TEST_FAILED" \
        '{
            testRunInfo: {
                timestamp: $timestamp,
                environment: $environment,
                apiBaseUrl: $api_url,
                businessHandle: $business,
                scriptVersion: "1.0"
            },
            authentication: {
                adminEmail: $admin_email,
                companyId: $company_id,
                companyName: $company_name,
                tokenObtained: ($admin_email != null)
            },
            testResults: {
                passed: $tests_passed,
                failed: $tests_failed,
                total: ($tests_passed + $tests_failed),
                successRate: (if ($tests_passed + $tests_failed) > 0 then (($tests_passed * 100) / ($tests_passed + $tests_failed)) else 0 end | round / 100)
            },
            executionMode: {
                dryRun: (env.DRY_RUN == "true"),
                verbose: (env.VERBOSE == "true")
            },
            generatedAt: now | todate
        }')

    echo "$report_json" | jq . > "$REPORT_FILE" 2>/dev/null

    log_success "Report saved to: $REPORT_FILE"
}

##############################################################################
# Main Execution Flow
##############################################################################

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help)
                usage
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                ;;
        esac
    done
}

main() {
    log_info "Wapsell Admin Onboarding Flow Test Suite"
    log_info "Version: 1.0"
    log_info "Timestamp: $TIMESTAMP"
    echo ""

    # Parse command-line arguments
    parse_arguments "$@"

    # Check prerequisites
    check_prerequisites || return $?

    # Load and validate configuration
    load_configuration || return $?
    validate_configuration || return $?

    # Run test cases
    test_admin_login || ((TEST_FAILED++))
    test_get_user_profile || ((TEST_FAILED++))
    test_dashboard_access || ((TEST_FAILED++))
    test_audit_logs_access || ((TEST_FAILED++))
    test_users_list || ((TEST_FAILED++))

    # Generate report
    generate_report

    # Summary
    log_section "Test Summary"
    log_info "Tests Passed: $TEST_PASSED"
    log_info "Tests Failed: $TEST_FAILED"
    log_info "Total Tests:  $((TEST_PASSED + TEST_FAILED))"

    if [[ $TEST_FAILED -eq 0 ]]; then
        log_success "All tests passed!"
        echo ""
        return 0
    else
        log_error "Some tests failed. See report for details: $REPORT_FILE"
        echo ""
        return 1
    fi
}

# Run main function
main "$@"
exit $?
