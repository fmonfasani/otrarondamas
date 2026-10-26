# Wapsell Admin Onboarding Flow - Automated Testing Guide

## Overview

This testing framework provides automated validation of the Wapsell admin onboarding flow for Otra Ronda Más. It tests end-to-end authentication, authorization, user provisioning, and dashboard access through the REST API.

**Version:** 1.0  
**Last Updated:** 2026-10-25  
**Maintained By:** Engineering Team

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Requirements](#requirements)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [Test Scenarios](#test-scenarios)
7. [API Endpoints Tested](#api-endpoints-tested)
8. [Troubleshooting](#troubleshooting)
9. [Report Format](#report-format)
10. [Contributing](#contributing)

---

## Quick Start

### Basic Test Run

```bash
# Navigate to scripts directory
cd scripts/

# Copy and configure environment file
cp .env.testing.example .env.testing
# Edit .env.testing with your test credentials

# Make script executable
chmod +x onboarding-test.sh

# Run tests against development environment
./onboarding-test.sh --env development

# Run tests with verbose output
./onboarding-test.sh --verbose

# Dry-run mode (no actual API calls)
./onboarding-test.sh --dry-run
```

### Quick Result Check

```bash
# View the latest test report
cat reports/onboarding-report-*.json | jq .

# List all test reports
ls -lt reports/onboarding-report-*.json | head -5
```

---

## Requirements

### System Requirements

- **Bash:** 4.0 or later
- **curl:** 7.0 or later (HTTP client)
- **jq:** 1.6 or later (JSON processor)

### Environment Requirements

- **Test Admin Account:** Valid credentials for the business
- **API Access:** Network connectivity to the API endpoint
- **Permissions:** Admin role with dashboard, audit, and user management access

### Optional

- **Git:** For version control (included in most development environments)
- **GNU utilities:** For advanced log analysis

### Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS    | ✓ Full | Tested on macOS 13+ |
| Linux    | ✓ Full | Tested on Ubuntu 20.04+ and CentOS 7+ |
| Windows  | ✓ Full | Requires WSL2 or Git Bash |
| Docker   | ✓ Full | See Docker section below |

---

## Installation

### 1. Clone or Download

```bash
# If using a fresh checkout
git clone <repository-url>
cd OtraRondaMas/scripts
```

### 2. Install Prerequisites

#### macOS
```bash
# Using Homebrew
brew install curl jq
```

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install curl jq
```

#### CentOS/RHEL
```bash
sudo yum install curl jq
```

#### Windows (WSL2)
```bash
# Inside WSL2 terminal
sudo apt-get update
sudo apt-get install curl jq
```

### 3. Set Execute Permissions

```bash
chmod +x onboarding-test.sh
```

### 4. Verify Installation

```bash
# Check curl version
curl --version

# Check jq version
jq --version

# Check bash version
bash --version

# List test data available
ls -la test-data/
```

---

## Configuration

### Environment File Setup

1. **Create configuration file:**
   ```bash
   cp .env.testing.example .env.testing
   ```

2. **Edit with your test credentials:**
   ```bash
   nano .env.testing  # or your preferred editor
   ```

3. **Required Variables:**

   | Variable | Description | Example |
   |----------|-------------|---------|
   | `API_BASE_URL` | API base URL for the business | `https://api.otrarondamas.wapsell.com/businesses/otrarondamas/api` |
   | `BUSINESS_HANDLE` | Business identifier | `otrarondamas` |
   | `ADMIN_EMAIL` | Test admin email | `admin@otrarondamas.test` |
   | `ADMIN_PASSWORD` | Test admin password | `secure-password` |

4. **Optional Variables:**

   | Variable | Description | Default |
   |----------|-------------|---------|
   | `TEST_SELLER_EMAIL` | Test seller email | `vendedor@otrarondamas.test` |
   | `TEST_ROLE_NAME` | Test role name | `Gerente` |
   | `API_TIMEOUT` | Request timeout (seconds) | `30` |
   | `DEBUG` | Enable debug output | `false` |

### Environment-Specific Configuration

Create separate config files for different environments:

```bash
# Development
cp .env.testing.example .env.testing.development
nano .env.testing.development

# Staging
cp .env.testing.example .env.testing.staging
nano .env.testing.staging

# Production
cp .env.testing.example .env.testing.production
nano .env.testing.production
```

Then reference them:
```bash
./onboarding-test.sh --env development
./onboarding-test.sh --env staging
./onboarding-test.sh --env production
```

### Security Best Practices

- ✅ **DO:** Use test accounts with limited privileges
- ✅ **DO:** Rotate test passwords regularly
- ✅ **DO:** Keep `.env.testing` files out of version control
- ✅ **DO:** Use `.gitignore` to prevent accidental commits
- ❌ **DON'T:** Use production credentials
- ❌ **DON'T:** Share test credentials in version control
- ❌ **DON'T:** Log sensitive data

---

## Usage

### Command Line Options

```bash
./onboarding-test.sh [OPTIONS]

OPTIONS:
  --env <environment>    Environment to test (development|staging|production)
  --dry-run             Run without making actual API calls
  --verbose             Enable verbose/debug output
  --help               Display help message
```

### Common Use Cases

#### 1. Test Development Environment
```bash
./onboarding-test.sh --env development
```

#### 2. Pre-Deployment Validation
```bash
# Verbose output for troubleshooting
./onboarding-test.sh --env staging --verbose
```

#### 3. Dry-Run for Configuration Testing
```bash
# Verify config without making API calls
./onboarding-test.sh --dry-run
```

#### 4. Continuous Integration
```bash
# Run silently, capture exit code
./onboarding-test.sh --env production
echo "Test exit code: $?"
```

#### 5. Debug Mode with Full Output
```bash
./onboarding-test.sh --verbose --env development
```

### Output Interpretation

#### Success Output
```
[PASS] Login admin user (HTTP 200)
[PASS] JWT Token obtained: eyJhbGciOiJIUzI1NiIsIn...
[PASS] Admin user: admin@otrarondamas.test
[PASS] Company ID: company-123
```

#### Failure Output
```
[FAIL] Login admin user (Expected HTTP 200, got HTTP 401)
[DEBUG] Response: {"error": "Invalid credentials"}
```

### Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| `0` | All tests passed | ✓ Continue with deployment |
| `1` | One or more tests failed | ✗ Fix issues and retry |
| `2` | Configuration error | ⚠ Fix config and retry |
| `3` | Missing prerequisites | ⚠ Install required tools |

---

## Test Scenarios

### Scenario 1: Basic Authentication (Default)

**Objective:** Verify admin login and token generation

**Steps:**
1. Send login request with credentials
2. Validate HTTP 200 response
3. Extract JWT token from response
4. Verify token format

**Expected Results:**
- Login succeeds with valid credentials
- JWT token is returned
- Token contains necessary claims

**Typical Runtime:** < 2 seconds

### Scenario 2: User Profile Verification

**Objective:** Confirm authenticated user can retrieve own profile

**Steps:**
1. Authenticate as admin user
2. Request `/auth/me` endpoint
3. Extract company and user information
4. Validate business membership

**Expected Results:**
- Profile retrieval succeeds
- Company ID matches business handle
- User role is correctly assigned
- Permissions are populated

**Typical Runtime:** < 2 seconds

### Scenario 3: Dashboard Access

**Objective:** Validate dashboard metrics are accessible

**Steps:**
1. Authenticate as admin user
2. Request dashboard KPIs
3. Parse metric responses
4. Verify data format

**Expected Results:**
- KPI endpoint returns 200
- Metrics include revenue, orders, conversion rate
- Data format is consistent and valid
- Audit trail records access

**Typical Runtime:** < 3 seconds

### Scenario 4: Audit Log Access

**Objective:** Ensure audit logging is functional

**Steps:**
1. Authenticate as admin user
2. Request audit logs endpoint
3. Verify pagination parameters work
4. Check log format

**Expected Results:**
- Audit logs are accessible
- Pagination is supported
- Log entries are properly formatted
- Access is properly audited

**Typical Runtime:** < 2 seconds

### Scenario 5: User Management

**Objective:** Verify user listing functionality

**Steps:**
1. Authenticate as admin user
2. Request users list
3. Parse user records
4. Validate data completeness

**Expected Results:**
- User list returns successfully
- Records include name and email
- Only active users are returned
- Proper sorting is applied

**Typical Runtime:** < 2 seconds

---

## API Endpoints Tested

### Authentication

#### POST `/auth/login`
- **Purpose:** Authenticate admin user
- **Request:** Email and password credentials
- **Response:** JWT access token
- **Expected Status:** 200

#### GET `/auth/me`
- **Purpose:** Retrieve authenticated user profile
- **Requires:** Valid JWT token
- **Response:** User details, company info, permissions
- **Expected Status:** 200

### Dashboard

#### GET `/admin/dashboard/kpis`
- **Purpose:** Retrieve KPI metrics
- **Query Parameters:** `period` (7d, 30d, 90d)
- **Response:** Revenue, orders, conversion rate
- **Expected Status:** 200
- **Requires Permission:** `dashboard.view`

#### GET `/admin/dashboard/trends`
- **Purpose:** Retrieve trend chart data
- **Query Parameters:** `metric`, `period`
- **Response:** Time-series data points
- **Expected Status:** 200
- **Requires Permission:** `dashboard.view`

### Audit

#### GET `/admin/audit/logs`
- **Purpose:** Retrieve audit logs
- **Query Parameters:** `page`, `limit`, `accion`, `entidad`
- **Response:** Paginated audit log entries
- **Expected Status:** 200
- **Requires Permission:** `audit.view`

#### GET `/admin/audit/logs/export`
- **Purpose:** Export audit logs
- **Query Parameters:** `format` (csv, json)
- **Response:** Formatted export data
- **Expected Status:** 200
- **Requires Permission:** `audit.view`

### Users

#### GET `/usuarios`
- **Purpose:** List company users
- **Requires:** JWT token and company membership
- **Response:** Array of user objects
- **Expected Status:** 200
- **Filters:** Active users only

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "curl is not installed"
```bash
# Diagnosis
curl --version

# Solution
# macOS: brew install curl
# Linux: sudo apt-get install curl
# Windows (WSL2): sudo apt-get install curl
```

#### 2. "jq is not installed"
```bash
# Diagnosis
jq --version

# Solution
# macOS: brew install jq
# Linux: sudo apt-get install jq
# Windows (WSL2): sudo apt-get install jq
```

#### 3. "Configuration file not found"
```bash
# Diagnosis
ls -la .env.testing*

# Solution
cp .env.testing.example .env.testing
nano .env.testing
# Fill in required values
```

#### 4. "Invalid credentials" (HTTP 401)
```bash
# Diagnosis
echo "Admin Email: $ADMIN_EMAIL"
echo "Has Password: $(test -n "$ADMIN_PASSWORD" && echo 'yes' || echo 'no')"

# Solutions
# 1. Verify email and password in .env.testing
# 2. Check if test admin account exists
# 3. Verify account is not locked or disabled
# 4. Check if password has expired
```

#### 5. "Connection refused" or "Cannot reach API"
```bash
# Diagnosis
curl -v ${API_BASE_URL}/auth/login

# Solutions
# 1. Check API_BASE_URL is correct
# 2. Verify network connectivity: ping api.otrarondamas.wapsell.com
# 3. Check firewall rules
# 4. Verify API server is running
# 5. Check for VPN/proxy requirements
```

#### 6. "Permission denied" (HTTP 403)
```bash
# Diagnosis
# Check admin account permissions in dashboard

# Solutions
# 1. Verify admin has dashboard.view permission
# 2. Verify admin has audit.view permission
# 3. Check company association is correct
# 4. Verify account is not restricted
```

#### 7. Script won't execute
```bash
# Solution
chmod +x onboarding-test.sh

# Or run with explicit bash
bash onboarding-test.sh
```

#### 8. "Bash version too old"
```bash
# Solution
# Upgrade bash:
# macOS: brew install bash
# Linux: sudo apt-get install bash
# Windows: Update WSL2
```

### Debug Mode

Enable detailed logging:

```bash
# Run with verbose output
./onboarding-test.sh --verbose

# Redirect output to log file
./onboarding-test.sh --verbose 2>&1 | tee test-debug.log

# Use bash debugging
bash -x onboarding-test.sh
```

### Manual API Testing

Test individual endpoints manually:

```bash
# Get auth token
TOKEN=$(curl -s -X POST "https://api.otrarondamas.wapsell.com/businesses/otrarondamas/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}' \
  | jq -r '.accessToken')

# Test dashboard endpoint
curl -X GET "https://api.otrarondamas.wapsell.com/businesses/otrarondamas/api/admin/dashboard/kpis" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
```

---

## Report Format

### Report Location
```
scripts/reports/onboarding-report-YYYYMMDD_HHMMSS.json
```

### Example Report Structure
```json
{
  "testRunInfo": {
    "timestamp": "20261025_143022",
    "environment": "development",
    "apiBaseUrl": "https://api.otrarondamas.wapsell.com/...",
    "businessHandle": "otrarondamas",
    "scriptVersion": "1.0"
  },
  "authentication": {
    "adminEmail": "admin@otrarondamas.test",
    "companyId": "comp-123",
    "companyName": "Otra Ronda Más",
    "tokenObtained": true
  },
  "testResults": {
    "passed": 5,
    "failed": 0,
    "total": 5,
    "successRate": 100
  },
  "executionMode": {
    "dryRun": false,
    "verbose": false
  },
  "generatedAt": "2026-10-25T14:30:22Z"
}
```

### Parsing Reports

```bash
# View all reports
ls -1t reports/onboarding-report-*.json

# Get latest report
LATEST=$(ls -1t reports/onboarding-report-*.json | head -1)
cat "$LATEST" | jq .

# Extract success rate
cat "$LATEST" | jq '.testResults.successRate'

# Compare reports
diff <(jq '.testResults' report1.json) <(jq '.testResults' report2.json)

# Generate CSV summary
for f in reports/*.json; do
  jq -r '[.testRunInfo.timestamp, .testResults.successRate] | @csv' "$f"
done
```

---

## Contributing

### Reporting Issues

If you encounter problems:

1. **Gather information:**
   ```bash
   ./onboarding-test.sh --verbose 2>&1 | tee debug.log
   git log --oneline -5
   uname -a
   curl --version
   jq --version
   ```

2. **File an issue with:**
   - Error message and exit code
   - Environment (dev/staging/prod)
   - Debug log output
   - System information

### Extending the Test Suite

To add new test cases:

1. **Create a new test function:**
   ```bash
   test_my_feature() {
       log_section "Test N: My Feature"
       local description="Feature description"
       local endpoint="/api/endpoint"
       
       log_info "Testing: $description"
       
       local response_file
       response_file=$(call_api "GET" "$endpoint" "" "$ADMIN_TOKEN")
       
       local response
       response=$(validate_response "$response_file" "200" "$description")
       
       [[ $? -eq 0 ]] || return 1
       
       # Your assertions here
       
       return 0
   }
   ```

2. **Add to main() function:**
   ```bash
   test_my_feature || ((TEST_FAILED++))
   ```

3. **Update documentation** in this README

4. **Test thoroughly** before submitting

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-10-25 | Initial release with 5 core test scenarios |

---

## Additional Resources

- **API Documentation:** See `docs/WAPSELL-DOCUMENTATION/API.md`
- **Authentication Guide:** See `docs/WAPSELL-DOCUMENTATION/AUTHENTICATION.md`
- **Permission Matrix:** See test-data/users.json
- **Deployment Guide:** See scripts/README-DEPLOYMENT.md

---

## Support

For questions or issues:

1. Check this README for troubleshooting
2. Review API logs for error details
3. Contact the engineering team
4. Review GitHub issues for similar problems

---

**Generated:** 2026-10-25  
**Script Version:** 1.0  
**Status:** Production Ready
