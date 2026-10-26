#!/bin/bash

# Vendor Role E2E Test Suite
# Tests vendor-specific permissions in Wapsell Admin Panel

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="$SCRIPT_DIR/reports"
REPORT_FILE="$REPORT_DIR/vendor-e2e-report-$TIMESTAMP.json"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TESTS=()

# Create reports directory
mkdir -p "$REPORT_DIR"

# Load configuration
if [[ ! -f "$SCRIPT_DIR/.env.testing" ]]; then
    echo -e "${RED}[ERROR] Configuration file not found: $SCRIPT_DIR/.env.testing${NC}"
    exit 1
fi

source "$SCRIPT_DIR/.env.testing"

# Default values
ADMIN_PASSWORD="${ADMIN_PASSWORD:-TestPassword123!}"
TEST_SELLER_PASSWORD="${TEST_SELLER_PASSWORD:-VendedorTest123!@#}"

# Helper functions
log_section() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ $1${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
}

add_test_result() {
    local action=$1
    local endpoint=$2
    local method=$3
    local status_code=$4
    local expected=$5
    local passed=$6
    local error_msg=${7:-}

    TESTS+=("{\"action\":\"$action\",\"endpoint\":\"$endpoint\",\"method\":\"$method\",\"statusCode\":$status_code,\"expectedStatus\":\"$expected\",\"passed\":$passed,\"errorMessage\":\"$error_msg\"}")
}

# API Call function
api_call() {
    local method=$1
    local endpoint=$2
    local token=${3:-}
    local data=${4:-}

    local url="$API_BASE_URL$endpoint"
    local headers='-H "Content-Type: application/json"'

    if [[ ! -z "$token" ]]; then
        headers="$headers -H \"Authorization: Bearer $token\""
    fi

    if [[ ! -z "$data" ]]; then
        eval "curl -s -w '\n%{http_code}' -X $method '$url' $headers -d '$data'"
    else
        eval "curl -s -w '\n%{http_code}' -X $method '$url' $headers"
    fi
}

# Test 1: Admin Login
test_admin_login() {
    log_section "Test 1: Admin Authentication"

    log_info "Testing: Login admin user"
    log_info "Email: $ADMIN_EMAIL"

    local response=$(api_call "POST" "/auth/login" "" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [[ $http_code -eq 200 ]]; then
        ADMIN_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
        if [[ -z "$ADMIN_TOKEN" ]]; then
            log_error "Admin Login | No token in response"
            add_test_result "Admin Login" "/auth/login" "POST" 200 "200" false "No token"
            return 1
        fi
        log_success "Admin Login | HTTP 200 | Token: ${ADMIN_TOKEN:0:20}..."
        add_test_result "Admin Login" "/auth/login" "POST" 200 "200" true
        return 0
    else
        log_error "Admin Login | HTTP $http_code | Expected 200"
        add_test_result "Admin Login" "/auth/login" "POST" $http_code "200" false "$body"
        return 1
    fi
}

# Test 2: Vendor Login
test_vendor_login() {
    log_section "Test 2: Vendor Authentication"

    log_info "Testing: Login vendor user"
    log_info "Email: $TEST_SELLER_EMAIL"

    local response=$(api_call "POST" "/auth/login" "" "{\"email\":\"$TEST_SELLER_EMAIL\",\"password\":\"$TEST_SELLER_PASSWORD\"}")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [[ $http_code -eq 200 ]]; then
        VENDOR_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
        if [[ -z "$VENDOR_TOKEN" ]]; then
            log_error "Vendor Login | No token in response"
            add_test_result "Vendor Login" "/auth/login" "POST" 200 "200" false "No token"
            return 1
        fi
        log_success "Vendor Login | HTTP 200 | Token: ${VENDOR_TOKEN:0:20}..."
        add_test_result "Vendor Login" "/auth/login" "POST" 200 "200" true
        return 0
    else
        log_error "Vendor Login | HTTP $http_code | Expected 200"
        add_test_result "Vendor Login" "/auth/login" "POST" $http_code "200" false "$body"
        return 1
    fi
}

# Test 3: Vendor Profile
test_vendor_profile() {
    log_section "Test 3: Vendor Profile Access & Role Verification"

    if [[ -z "$VENDOR_TOKEN" ]]; then
        log_error "No valid vendor token"
        return 1
    fi

    log_info "Testing: Fetch vendor profile"

    local response=$(api_call "GET" "/auth/me" "$VENDOR_TOKEN")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [[ $http_code -eq 200 ]]; then
        VENDOR_ROLE=$(echo "$body" | grep -o '"rol":"[^"]*' | cut -d'"' -f4 | head -1)
        log_success "Vendor Profile | HTTP 200 | Role: $VENDOR_ROLE"
        add_test_result "Vendor Profile" "/auth/me" "GET" 200 "200" true
        return 0
    else
        log_error "Vendor Profile | HTTP $http_code | Expected 200"
        add_test_result "Vendor Profile" "/auth/me" "GET" $http_code "200" false "$body"
        return 1
    fi
}

# Test 4: Vendor Dashboard
test_vendor_dashboard() {
    log_section "Test 4: Vendor Dashboard Access (Allowed)"

    if [[ -z "$VENDOR_TOKEN" ]]; then
        log_error "No valid vendor token"
        return 1
    fi

    log_info "Testing: Dashboard access - should be ALLOWED"

    local response=$(api_call "GET" "/admin/dashboard/kpis?period=30d" "$VENDOR_TOKEN")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [[ $http_code -eq 200 ]]; then
        log_success "Vendor Dashboard | HTTP 200 | Allowed"
        add_test_result "Vendor Dashboard" "/admin/dashboard/kpis" "GET" 200 "200" true
        return 0
    else
        log_error "Vendor Dashboard | HTTP $http_code | Expected 200"
        add_test_result "Vendor Dashboard" "/admin/dashboard/kpis" "GET" $http_code "200" false "$body"
        return 1
    fi
}

# Test 5: Vendor Products List
test_vendor_products() {
    log_section "Test 5: Vendor Products Module (List)"

    if [[ -z "$VENDOR_TOKEN" ]]; then
        log_error "No valid vendor token"
        return 1
    fi

    log_info "Testing: List products - should be ALLOWED"

    local response=$(api_call "GET" "/catalogo/productos" "$VENDOR_TOKEN")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [[ $http_code -eq 200 ]]; then
        log_success "Vendor List Products | HTTP 200 | Allowed"
        add_test_result "Vendor List Products" "/catalogo/productos" "GET" 200 "200" true
        return 0
    elif [[ $http_code -eq 403 ]]; then
        log_error "Vendor List Products | HTTP 403 | Access Denied (may need permission)"
        add_test_result "Vendor List Products" "/catalogo/productos" "GET" 403 "200" false "Permission denied"
        return 1
    else
        log_error "Vendor List Products | HTTP $http_code | Expected 200"
        add_test_result "Vendor List Products" "/catalogo/productos" "GET" $http_code "200" false "$body"
        return 1
    fi
}

# Test 6: Vendor Orders
test_vendor_orders() {
    log_section "Test 6: Vendor Orders Module"

    if [[ -z "$VENDOR_TOKEN" ]]; then
        log_error "No valid vendor token"
        return 1
    fi

    log_info "Testing: List orders - should be ALLOWED"

    local response=$(api_call "GET" "/ordenes" "$VENDOR_TOKEN")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [[ $http_code -eq 200 ]]; then
        log_success "Vendor List Orders | HTTP 200 | Allowed"
        add_test_result "Vendor List Orders" "/ordenes" "GET" 200 "200" true
        return 0
    elif [[ $http_code -eq 403 ]]; then
        log_error "Vendor List Orders | HTTP 403 | Access Denied"
        add_test_result "Vendor List Orders" "/ordenes" "GET" 403 "200" false "Permission denied"
        return 1
    else
        log_error "Vendor List Orders | HTTP $http_code | Expected 200"
        add_test_result "Vendor List Orders" "/ordenes" "GET" $http_code "200" false "$body"
        return 1
    fi
}

# Test 7: Vendor Clients
test_vendor_clients() {
    log_section "Test 7: Vendor Clients Module"

    if [[ -z "$VENDOR_TOKEN" ]]; then
        log_error "No valid vendor token"
        return 1
    fi

    log_info "Testing: List clients - should be ALLOWED"

    local response=$(api_call "GET" "/clientes" "$VENDOR_TOKEN")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [[ $http_code -eq 200 ]]; then
        log_success "Vendor List Clients | HTTP 200 | Allowed"
        add_test_result "Vendor List Clients" "/clientes" "GET" 200 "200" true
        return 0
    elif [[ $http_code -eq 403 ]]; then
        log_error "Vendor List Clients | HTTP 403 | Access Denied"
        add_test_result "Vendor List Clients" "/clientes" "GET" 403 "200" false "Permission denied"
        return 1
    else
        log_error "Vendor List Clients | HTTP $http_code | Expected 200"
        add_test_result "Vendor List Clients" "/clientes" "GET" $http_code "200" false "$body"
        return 1
    fi
}

# Test 8: Vendor Users Access (MUST BE DENIED)
test_vendor_users_denied() {
    log_section "Test 8: Users Module Access (MUST BE DENIED)"

    if [[ -z "$VENDOR_TOKEN" ]]; then
        log_error "No valid vendor token"
        return 1
    fi

    log_info "Testing: List users - vendor should be DENIED (admin-only)"

    local response=$(api_call "GET" "/usuarios" "$VENDOR_TOKEN")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [[ $http_code -eq 403 ]] || [[ $http_code -eq 401 ]]; then
        log_success "Vendor Users DENIED | HTTP $http_code | Correctly Restricted"
        add_test_result "Vendor Users (DENIED)" "/usuarios" "GET" $http_code "403" true
        return 0
    elif [[ $http_code -eq 200 ]]; then
        log_error "SECURITY ISSUE: Vendor can access users list! Should be admin-only"
        add_test_result "Vendor Users (DENIED)" "/usuarios" "GET" 200 "403" false "SECURITY: Unauthorized access"
        return 1
    else
        log_error "Vendor Users | HTTP $http_code | Unexpected status"
        add_test_result "Vendor Users (DENIED)" "/usuarios" "GET" $http_code "403" false "$body"
        return 1
    fi
}

# Test 9: Vendor Company Access (MUST BE DENIED)
test_vendor_company_denied() {
    log_section "Test 9: Company/Empresa Module (MUST BE DENIED)"

    if [[ -z "$VENDOR_TOKEN" ]]; then
        log_error "No valid vendor token"
        return 1
    fi

    log_info "Testing: Access company settings - vendor should be DENIED (admin-only)"

    local response=$(api_call "GET" "/empresas" "$VENDOR_TOKEN")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [[ $http_code -eq 403 ]] || [[ $http_code -eq 401 ]]; then
        log_success "Vendor Companies DENIED | HTTP $http_code | Correctly Restricted"
        add_test_result "Vendor Companies (DENIED)" "/empresas" "GET" $http_code "403" true
        return 0
    elif [[ $http_code -eq 200 ]]; then
        log_error "SECURITY ISSUE: Vendor can access companies! Should be admin-only"
        add_test_result "Vendor Companies (DENIED)" "/empresas" "GET" 200 "403" false "SECURITY: Unauthorized access"
        return 1
    elif [[ $http_code -eq 404 ]]; then
        log_info "Endpoint not found (404) - may not exist"
        add_test_result "Vendor Companies (DENIED)" "/empresas" "GET" 404 "403 or N/A" true
        return 0
    else
        log_error "Vendor Companies | HTTP $http_code | Unexpected status"
        add_test_result "Vendor Companies (DENIED)" "/empresas" "GET" $http_code "403" false "$body"
        return 1
    fi
}

# Generate JSON report
generate_report() {
    log_section "Generating Test Report"

    local test_list="["
    local first=true
    for test in "${TESTS[@]}"; do
        if [[ "$first" = true ]]; then
            test_list="$test_list $test"
            first=false
        else
            test_list="$test_list, $test"
        fi
    done
    test_list="$test_list ]"

    local total=$((PASSED + FAILED))
    local success_rate=0
    if [[ $total -gt 0 ]]; then
        success_rate=$((PASSED * 100 / total))
    fi

    cat > "$REPORT_FILE" <<EOF
{
  "testRunInfo": {
    "timestamp": "$TIMESTAMP",
    "environment": "development",
    "apiBaseUrl": "$API_BASE_URL",
    "businessHandle": "$BUSINESS_HANDLE",
    "scriptVersion": "1.0"
  },
  "vendorCredentials": {
    "email": "$TEST_SELLER_EMAIL",
    "testAccountUsed": true
  },
  "testResults": {
    "passed": $PASSED,
    "failed": $FAILED,
    "total": $total,
    "successRate": $success_rate
  },
  "detailedResults": $test_list,
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    log_success "Report saved to: $REPORT_FILE"
}

# Main execution
main() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ VENDOR ROLE E2E TEST SUITE${NC}"
    echo -e "${CYAN}║ Permission Validation for Admin Panel${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log_info "Start Time: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "API Base URL: $API_BASE_URL"
    echo ""

    # Run all tests
    test_admin_login || true
    test_vendor_login || true
    test_vendor_profile || true
    test_vendor_dashboard || true
    test_vendor_products || true
    test_vendor_orders || true
    test_vendor_clients || true
    test_vendor_users_denied || true
    test_vendor_company_denied || true

    generate_report

    log_section "Final Status"
    echo -e "Total Tests: $((PASSED + FAILED))"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"

    if [[ $FAILED -eq 0 ]]; then
        log_success "All tests passed!"
        return 0
    else
        log_error "$FAILED test(s) failed"
        return 1
    fi
}

main
exit $?
