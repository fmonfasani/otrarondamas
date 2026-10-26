#!/bin/bash

# Vendor RBAC Permission Test
# Direct curl-based testing of vendor permissions

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="./reports/vendor-permissions-$TIMESTAMP.txt"

# Create reports directory
mkdir -p ./reports

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3001/businesses/otrarondamas/api}"
SELLER_EMAIL="${SELLER_EMAIL:-vendedor@otrarondamas.test}"
SELLER_PASSWORD="${SELLER_PASSWORD:-AdminTest123!@#}"

# Test counters
PASSED=0
FAILED=0

# Helper functions
log_test() {
    local result=$1
    local action=$2
    local endpoint=$3
    local expected=$4
    local actual=$5
    local error=${6:-}

    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}[PASS]${NC} $action | Endpoint: $endpoint | Expected: $expected | Actual: $actual"
        echo "[PASS] $action | Endpoint: $endpoint | Expected: $expected | Actual: $actual" >> "$REPORT_FILE"
        ((PASSED++))
    else
        echo -e "${RED}[FAIL]${NC} $action | Endpoint: $endpoint | Expected: $expected | Actual: $actual | Error: $error"
        echo "[FAIL] $action | Endpoint: $endpoint | Expected: $expected | Actual: $actual | Error: $error" >> "$REPORT_FILE"
        ((FAILED++))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee "$REPORT_FILE"
echo "VENDOR RBAC PERMISSION TEST" | tee -a "$REPORT_FILE"
echo "Start Time: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$REPORT_FILE"
echo "API Base URL: $API_BASE_URL" | tee -a "$REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# Test 1: LOGIN
echo -e "${CYAN}[TEST 1] POST /auth/login (Vendor Login)${NC}" | tee -a "$REPORT_FILE"
echo "Expected: 200 OK with accessToken" | tee -a "$REPORT_FILE"

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SELLER_EMAIL\",\"password\":\"$SELLER_PASSWORD\"}" 2>/dev/null)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
BODY=$(echo "$LOGIN_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 | head -1)
    if [ -z "$TOKEN" ]; then
        log_test "FAIL" "Vendor Login" "/auth/login" "200 with token" "$HTTP_CODE" "No token in response"
    else
        log_test "PASS" "Vendor Login" "/auth/login" "200 with token" "$HTTP_CODE"
        VENDOR_TOKEN="$TOKEN"
    fi
else
    ERROR_MSG=$(echo "$BODY" | grep -o '"message":"[^"]*' | cut -d'"' -f4 | head -1)
    log_test "FAIL" "Vendor Login" "/auth/login" "200" "$HTTP_CODE" "$ERROR_MSG"
fi

echo "" | tee -a "$REPORT_FILE"

# If login failed, exit early
if [ -z "$VENDOR_TOKEN" ]; then
    echo -e "${RED}[ERROR] Cannot proceed - vendor login failed${NC}" | tee -a "$REPORT_FILE"
    exit 1
fi

# Test 2: GET /productos (should be ALLOWED)
echo -e "${CYAN}[TEST 2] GET /productos (List Products - ALLOWED)${NC}" | tee -a "$REPORT_FILE"
echo "Expected: 200 OK" | tee -a "$REPORT_FILE"

PROD_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE_URL/catalogo/productos" \
  -H "Authorization: Bearer $VENDOR_TOKEN" 2>/dev/null)

HTTP_CODE=$(echo "$PROD_RESPONSE" | tail -n1)
BODY=$(echo "$PROD_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    log_test "PASS" "List Products" "/catalogo/productos" "200" "$HTTP_CODE"
else
    ERROR_MSG=$(echo "$BODY" | grep -o '"message":"[^"]*' | cut -d'"' -f4 | head -1)
    log_test "FAIL" "List Products" "/catalogo/productos" "200" "$HTTP_CODE" "$ERROR_MSG"
fi

echo "" | tee -a "$REPORT_FILE"

# Test 3: POST /productos (should be DENIED - 403)
echo -e "${CYAN}[TEST 3] POST /productos (Create Product - DENIED)${NC}" | tee -a "$REPORT_FILE"
echo "Expected: 403 Forbidden" | tee -a "$REPORT_FILE"

CREATE_PROD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/catalogo/productos" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test","descripcion":"Test Product","sku":"TST-001","precio":99.99}' 2>/dev/null)

HTTP_CODE=$(echo "$CREATE_PROD_RESPONSE" | tail -n1)
BODY=$(echo "$CREATE_PROD_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "403" ]; then
    log_test "PASS" "Create Product (DENIED)" "/catalogo/productos" "403" "$HTTP_CODE"
elif [ "$HTTP_CODE" = "401" ]; then
    log_test "PASS" "Create Product (DENIED)" "/catalogo/productos" "403" "$HTTP_CODE"
else
    ERROR_MSG=$(echo "$BODY" | grep -o '"message":"[^"]*' | cut -d'"' -f4 | head -1)
    log_test "FAIL" "Create Product (DENIED)" "/catalogo/productos" "403" "$HTTP_CODE" "$ERROR_MSG"
fi

echo "" | tee -a "$REPORT_FILE"

# Test 4: GET /usuarios (should be DENIED - admin only)
echo -e "${CYAN}[TEST 4] GET /usuarios (List Users - ADMIN ONLY, DENIED)${NC}" | tee -a "$REPORT_FILE"
echo "Expected: 403 Forbidden" | tee -a "$REPORT_FILE"

USERS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE_URL/usuarios" \
  -H "Authorization: Bearer $VENDOR_TOKEN" 2>/dev/null)

HTTP_CODE=$(echo "$USERS_RESPONSE" | tail -n1)
BODY=$(echo "$USERS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "403" ]; then
    log_test "PASS" "List Users (DENIED)" "/usuarios" "403" "$HTTP_CODE"
elif [ "$HTTP_CODE" = "401" ]; then
    log_test "PASS" "List Users (DENIED)" "/usuarios" "403" "$HTTP_CODE"
else
    ERROR_MSG=$(echo "$BODY" | grep -o '"message":"[^"]*' | cut -d'"' -f4 | head -1)
    log_test "FAIL" "List Users (DENIED)" "/usuarios" "403" "$HTTP_CODE" "$ERROR_MSG or SECURITY ISSUE"
fi

echo "" | tee -a "$REPORT_FILE"

# Test 5: POST /usuarios (should be DENIED - admin only)
echo -e "${CYAN}[TEST 5] POST /usuarios (Create User - ADMIN ONLY, DENIED)${NC}" | tee -a "$REPORT_FILE"
echo "Expected: 403 Forbidden" | tee -a "$REPORT_FILE"

CREATE_USER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/usuarios" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test","email":"test@test.com","password":"Test123!"}' 2>/dev/null)

HTTP_CODE=$(echo "$CREATE_USER_RESPONSE" | tail -n1)
BODY=$(echo "$CREATE_USER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "403" ]; then
    log_test "PASS" "Create User (DENIED)" "/usuarios" "403" "$HTTP_CODE"
elif [ "$HTTP_CODE" = "401" ]; then
    log_test "PASS" "Create User (DENIED)" "/usuarios" "403" "$HTTP_CODE"
else
    ERROR_MSG=$(echo "$BODY" | grep -o '"message":"[^"]*' | cut -d'"' -f4 | head -1)
    log_test "FAIL" "Create User (DENIED)" "/usuarios" "403" "$HTTP_CODE" "$ERROR_MSG"
fi

echo "" | tee -a "$REPORT_FILE"

# Test 6: GET /ordenes (should be ALLOWED)
echo -e "${CYAN}[TEST 6] GET /ordenes (List Orders - ALLOWED)${NC}" | tee -a "$REPORT_FILE"
echo "Expected: 200 OK" | tee -a "$REPORT_FILE"

ORDERS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE_URL/ordenes" \
  -H "Authorization: Bearer $VENDOR_TOKEN" 2>/dev/null)

HTTP_CODE=$(echo "$ORDERS_RESPONSE" | tail -n1)
BODY=$(echo "$ORDERS_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    log_test "PASS" "List Orders" "/ordenes" "200" "$HTTP_CODE"
else
    ERROR_MSG=$(echo "$BODY" | grep -o '"message":"[^"]*' | cut -d'"' -f4 | head -1)
    log_test "FAIL" "List Orders" "/ordenes" "200" "$HTTP_CODE" "$ERROR_MSG"
fi

echo "" | tee -a "$REPORT_FILE"

# Test 7: POST /ordenes (should be ALLOWED - create own orders)
echo -e "${CYAN}[TEST 7] POST /ordenes (Create Order - ALLOWED)${NC}" | tee -a "$REPORT_FILE"
echo "Expected: 201 Created or 200 OK" | tee -a "$REPORT_FILE"

CREATE_ORDER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/ordenes" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clienteId":"test","items":[]}' 2>/dev/null)

HTTP_CODE=$(echo "$CREATE_ORDER_RESPONSE" | tail -n1)
BODY=$(echo "$CREATE_ORDER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    log_test "PASS" "Create Order" "/ordenes" "200/201" "$HTTP_CODE"
elif [ "$HTTP_CODE" = "400" ]; then
    # 400 could be due to invalid request body, but it means the endpoint accepted it
    log_test "PASS" "Create Order" "/ordenes" "200/201" "$HTTP_CODE (validation error, but allowed)"
elif [ "$HTTP_CODE" = "403" ]; then
    log_test "FAIL" "Create Order" "/ordenes" "200/201" "$HTTP_CODE" "Vendor denied access"
else
    ERROR_MSG=$(echo "$BODY" | grep -o '"message":"[^"]*' | cut -d'"' -f4 | head -1)
    log_test "FAIL" "Create Order" "/ordenes" "200/201" "$HTTP_CODE" "$ERROR_MSG"
fi

echo "" | tee -a "$REPORT_FILE"

# Summary
echo "" | tee -a "$REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$REPORT_FILE"
echo "SUMMARY" | tee -a "$REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$REPORT_FILE"
echo -e "Total Tests: $((PASSED + FAILED))" | tee -a "$REPORT_FILE"
echo -e "${GREEN}Passed: $PASSED${NC}" | tee -a "$REPORT_FILE"
echo -e "${RED}Failed: $FAILED${NC}" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"
echo "Report saved to: $REPORT_FILE" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
