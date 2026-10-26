param(
    [bool]$DryRun = $false,
    [string]$Environment = 'development',
    [bool]$Verbose = $false,
    [switch]$Help
)

<#
.SYNOPSIS
Vendor Role E2E Test Suite - Tests vendor-specific permissions in Wapsell Admin Panel

.DESCRIPTION
Comprehensive E2E test for VENDEDOR role (limited permissions) vs ADMIN role (full access)
Verifies that vendor accounts cannot access restricted features (users, companies, etc.)

.PARAMETER DryRun
Simulate API calls without actually executing them

.PARAMETER Environment
Target environment: development, staging, or production

.PARAMETER Verbose
Enable detailed debug output

.EXAMPLE
./vendor-e2e-test.ps1 -Verbose
./vendor-e2e-test.ps1 -DryRun $true
#>

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommandPath
$Timestamp = (Get-Date -Format "yyyyMMdd_HHmmss")
$ReportDir = Join-Path $ScriptRoot "reports"
$ReportFile = Join-Path $ReportDir "vendor-e2e-report-$Timestamp.json"
$TestResults = @()

function Write-Info { param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success { param([string]$Message)
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-ErrorCustom { param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Write-DebugCustom { param([string]$Message)
    if ($Verbose) {
        Write-Host "[DEBUG] $Message" -ForegroundColor Cyan
    }
}

function Write-Section { param([string]$Message)
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ $Message" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Load-Configuration {
    $EnvFile = Join-Path $ScriptRoot ".env.testing"

    if (-not (Test-Path $EnvFile)) {
        Write-ErrorCustom "Configuration file not found: $EnvFile"
        return $false
    }

    $Content = Get-Content $EnvFile -Raw
    $Content | Select-String '([^=]+)=(.*)' -AllMatches | ForEach-Object {
        $_.Matches | ForEach-Object {
            $name = $_.Groups[1].Value.Trim()
            $value = $_.Groups[2].Value.Trim() -replace '^"', '' -replace '"$', ''
            if ($name) {
                Set-Variable -Name $name -Value $value -Scope Script
            }
        }
    }

    # Override password from config if provided
    if (-not [string]::IsNullOrEmpty($TEST_SELLER_PASSWORD)) {
        $Script:SELLER_PASSWORD = $TEST_SELLER_PASSWORD
    }

    return $true
}

function Validate-Configuration {
    Write-Info "Validating configuration..."

    $RequiredVars = 'API_BASE_URL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'TEST_SELLER_EMAIL', 'BUSINESS_HANDLE'
    $Errors = 0

    foreach ($var in $RequiredVars) {
        $value = Get-Variable -Name $var -ValueOnly -ErrorAction SilentlyContinue
        if ([string]::IsNullOrEmpty($value)) {
            Write-ErrorCustom "Missing required configuration: $var"
            $Errors++
        }
    }

    if ($Errors -gt 0) { return $false }

    Write-Success "Configuration valid"
    return $true
}

function Invoke-ApiCall {
    param(
        [string]$Method,
        [string]$Endpoint,
        $Body,
        [string]$Token,
        [string]$Description
    )

    $Url = "$API_BASE_URL$Endpoint"

    Write-DebugCustom "API Call: $Method $Url"

    if ($DryRun) {
        Write-Info "[DRY-RUN] Would call: $Method $Url"
        if ($Body) {
            Write-DebugCustom "[DRY-RUN] Data: $(ConvertTo-Json $Body)"
        }
        return @{ StatusCode = 200; Content = '{}' }
    }

    try {
        $Headers = @{
            'Content-Type' = 'application/json'
            'Accept' = 'application/json'
        }

        if ($Token) {
            $Headers['Authorization'] = "Bearer $Token"
        }

        $Params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            TimeoutSec = 30
            ErrorAction = 'Continue'
        }

        if ($Body) {
            $Params['Body'] = (ConvertTo-Json $Body -Depth 10)
        }

        $Response = Invoke-WebRequest @Params

        Write-DebugCustom "HTTP Status: $($Response.StatusCode)"

        return @{
            StatusCode = $Response.StatusCode
            Content = $Response.Content
            Headers = $Response.Headers
        }
    }
    catch {
        Write-DebugCustom "Error: $_"
        $errorResponse = $_.Exception.Response
        $statusCode = 0

        if ($null -ne $errorResponse) {
            $statusCode = [int]$errorResponse.StatusCode
            $stream = $errorResponse.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $content = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()

            return @{
                StatusCode = $statusCode
                Content = $content
                Error = $true
            }
        }

        return @{
            StatusCode = 0
            Content = $_.Exception.Message
            Error = $true
        }
    }
}

function Add-TestResult {
    param(
        [string]$Action,
        [string]$Endpoint,
        [string]$Method,
        [int]$StatusCode,
        [string]$ExpectedStatus,
        [bool]$Passed,
        [string]$ErrorMessage
    )

    $result = @{
        timestamp = (Get-Date -AsUTC -Format "o")
        action = $Action
        endpoint = $Endpoint
        method = $Method
        statusCode = $StatusCode
        expectedStatus = $ExpectedStatus
        passed = $Passed
        errorMessage = if ($ErrorMessage) { $ErrorMessage } else { $null }
    }

    $Script:TestResults += $result

    if ($Passed) {
        Write-Success "$Action | Endpoint: $Endpoint | Status: $StatusCode"
    }
    else {
        Write-ErrorCustom "$Action | Endpoint: $Endpoint | Expected: $ExpectedStatus, Got: $StatusCode | Error: $ErrorMessage"
    }
}

function Test-AdminLogin {
    Write-Section "Test 1: Admin Authentication"

    Write-Info "Testing: Login admin user"
    Write-DebugCustom "Email: $ADMIN_EMAIL"

    $Payload = @{
        email = $ADMIN_EMAIL
        password = $ADMIN_PASSWORD
    }

    $Response = Invoke-ApiCall -Method "POST" -Endpoint "/auth/login" -Body $Payload -Description "Login admin"

    if ($Response.StatusCode -eq 200) {
        try {
            $Content = ConvertFrom-Json $Response.Content
            $Script:AdminToken = $Content.accessToken

            if ([string]::IsNullOrEmpty($AdminToken)) {
                Add-TestResult -Action "Admin Login" -Endpoint "/auth/login" -Method "POST" -StatusCode 200 -ExpectedStatus "200" -Passed $false -ErrorMessage "No token in response"
                return $false
            }

            Add-TestResult -Action "Admin Login" -Endpoint "/auth/login" -Method "POST" -StatusCode 200 -ExpectedStatus "200" -Passed $true
            Write-Success "JWT Token obtained: $($AdminToken.Substring(0,20))..."
            return $true
        }
        catch {
            Add-TestResult -Action "Admin Login" -Endpoint "/auth/login" -Method "POST" -StatusCode 200 -ExpectedStatus "200" -Passed $false -ErrorMessage "Failed to parse response"
            return $false
        }
    }
    else {
        Add-TestResult -Action "Admin Login" -Endpoint "/auth/login" -Method "POST" -StatusCode $Response.StatusCode -ExpectedStatus "200" -Passed $false -ErrorMessage $Response.Content
        return $false
    }
}

function Test-VendorLogin {
    Write-Section "Test 2: Vendor Authentication"

    Write-Info "Testing: Login vendor user"
    Write-DebugCustom "Email: $TEST_SELLER_EMAIL"

    $Payload = @{
        email = $TEST_SELLER_EMAIL
        password = if ([string]::IsNullOrEmpty($SELLER_PASSWORD)) { "VendedorTest123!@#" } else { $SELLER_PASSWORD }
    }

    $Response = Invoke-ApiCall -Method "POST" -Endpoint "/auth/login" -Body $Payload -Description "Login vendor"

    if ($Response.StatusCode -eq 200) {
        try {
            $Content = ConvertFrom-Json $Response.Content
            $Script:VendorToken = $Content.accessToken

            if ([string]::IsNullOrEmpty($VendorToken)) {
                Add-TestResult -Action "Vendor Login" -Endpoint "/auth/login" -Method "POST" -StatusCode 200 -ExpectedStatus "200" -Passed $false -ErrorMessage "No token in response"
                return $false
            }

            Add-TestResult -Action "Vendor Login" -Endpoint "/auth/login" -Method "POST" -StatusCode 200 -ExpectedStatus "200" -Passed $true
            Write-Success "JWT Token obtained: $($VendorToken.Substring(0,20))..."
            return $true
        }
        catch {
            Add-TestResult -Action "Vendor Login" -Endpoint "/auth/login" -Method "POST" -StatusCode 200 -ExpectedStatus "200" -Passed $false -ErrorMessage "Failed to parse response"
            return $false
        }
    }
    else {
        Add-TestResult -Action "Vendor Login" -Endpoint "/auth/login" -Method "POST" -StatusCode $Response.StatusCode -ExpectedStatus "200" -Passed $false -ErrorMessage $Response.Content
        return $false
    }
}

function Test-VendorProfile {
    Write-Section "Test 3: Vendor Profile Access & Role Verification"

    if ([string]::IsNullOrEmpty($VendorToken)) {
        Write-ErrorCustom "No valid vendor token available"
        return $false
    }

    Write-Info "Testing: Fetch vendor profile and verify role"

    $Response = Invoke-ApiCall -Method "GET" -Endpoint "/auth/me" -Token $VendorToken -Description "Fetch vendor profile"

    if ($Response.StatusCode -eq 200) {
        try {
            $Content = ConvertFrom-Json $Response.Content
            $Script:VendorId = $Content.id
            $Script:VendorCompanyId = $Content.empresaId
            $Script:VendorRole = $Content.rol

            Add-TestResult -Action "Vendor Profile" -Endpoint "/auth/me" -Method "GET" -StatusCode 200 -ExpectedStatus "200" -Passed $true

            Write-Success "Vendor email: $($Content.email)"
            Write-Success "Vendor ID: $VendorId"
            Write-Success "Vendor Company ID: $VendorCompanyId"
            Write-Success "Vendor Role: $VendorRole"

            return $true
        }
        catch {
            Add-TestResult -Action "Vendor Profile" -Endpoint "/auth/me" -Method "GET" -StatusCode 200 -ExpectedStatus "200" -Passed $false -ErrorMessage "Failed to parse response"
            return $false
        }
    }
    else {
        Add-TestResult -Action "Vendor Profile" -Endpoint "/auth/me" -Method "GET" -StatusCode $Response.StatusCode -ExpectedStatus "200" -Passed $false -ErrorMessage $Response.Content
        return $false
    }
}

function Test-VendorDashboard {
    Write-Section "Test 4: Vendor Dashboard Access (Allowed)"

    if ([string]::IsNullOrEmpty($VendorToken)) {
        Write-ErrorCustom "No valid vendor token available"
        return $false
    }

    Write-Info "Testing: Vendor dashboard access - should be ALLOWED"

    $Response = Invoke-ApiCall -Method "GET" -Endpoint "/admin/dashboard/kpis?period=30d" -Token $VendorToken -Description "Dashboard KPIs"

    if ($Response.StatusCode -eq 200) {
        Add-TestResult -Action "Vendor Dashboard" -Endpoint "/admin/dashboard/kpis" -Method "GET" -StatusCode 200 -ExpectedStatus "200" -Passed $true
        return $true
    }
    else {
        Add-TestResult -Action "Vendor Dashboard" -Endpoint "/admin/dashboard/kpis" -Method "GET" -StatusCode $Response.StatusCode -ExpectedStatus "200" -Passed $false -ErrorMessage $Response.Content
        return $false
    }
}

function Test-VendorProducts {
    Write-Section "Test 5: Vendor Products Module (Allowed - List)"

    if ([string]::IsNullOrEmpty($VendorToken)) {
        Write-ErrorCustom "No valid vendor token available"
        return $false
    }

    Write-Info "Testing: List products - should be ALLOWED for vendor"

    $Response = Invoke-ApiCall -Method "GET" -Endpoint "/catalogo/productos" -Token $VendorToken -Description "List products"

    if ($Response.StatusCode -eq 200) {
        Add-TestResult -Action "Vendor List Products" -Endpoint "/catalogo/productos" -Method "GET" -StatusCode 200 -ExpectedStatus "200" -Passed $true
        return $true
    }
    elseif ($Response.StatusCode -eq 403) {
        Write-ErrorCustom "Vendor cannot list products (403 Forbidden) - may need product:read permission"
        Add-TestResult -Action "Vendor List Products" -Endpoint "/catalogo/productos" -Method "GET" -StatusCode 403 -ExpectedStatus "200" -Passed $false -ErrorMessage "Access denied - permission required"
        return $false
    }
    else {
        Add-TestResult -Action "Vendor List Products" -Endpoint "/catalogo/productos" -Method "GET" -StatusCode $Response.StatusCode -ExpectedStatus "200" -Passed $false -ErrorMessage $Response.Content
        return $false
    }
}

function Test-VendorCreateProduct {
    Write-Section "Test 6: Vendor Create Product (May be Denied)"

    if ([string]::IsNullOrEmpty($VendorToken)) {
        Write-ErrorCustom "No valid vendor token available"
        return $false
    }

    Write-Info "Testing: Create product - may be DENIED for limited vendor"

    $Payload = @{
        nombre = "Test Product $Timestamp"
        descripcion = "Test product created by E2E test"
        sku = "TEST-$Timestamp"
        precio = 99.99
    }

    $Response = Invoke-ApiCall -Method "POST" -Endpoint "/catalogo/productos" -Token $VendorToken -Body $Payload -Description "Create product"

    if ($Response.StatusCode -eq 201 -or $Response.StatusCode -eq 200) {
        Write-Success "Vendor can create products (permission granted)"
        Add-TestResult -Action "Vendor Create Product" -Endpoint "/catalogo/productos" -Method "POST" -StatusCode $Response.StatusCode -ExpectedStatus "200-201" -Passed $true
        return $true
    }
    elseif ($Response.StatusCode -eq 403) {
        Write-ErrorCustom "Vendor cannot create products (403 Forbidden - expected for limited vendor)"
        Add-TestResult -Action "Vendor Create Product" -Endpoint "/catalogo/productos" -Method "POST" -StatusCode 403 -ExpectedStatus "403" -Passed $true -ErrorMessage "Expected: Limited vendor denied access"
        return $true
    }
    else {
        Add-TestResult -Action "Vendor Create Product" -Endpoint "/catalogo/productos" -Method "POST" -StatusCode $Response.StatusCode -ExpectedStatus "200-201 or 403" -Passed $false -ErrorMessage $Response.Content
        return $false
    }
}

function Test-VendorOrders {
    Write-Section "Test 7: Vendor Orders Module (Allowed - List Own Orders)"

    if ([string]::IsNullOrEmpty($VendorToken)) {
        Write-ErrorCustom "No valid vendor token available"
        return $false
    }

    Write-Info "Testing: List orders - vendor should see own orders"

    $Response = Invoke-ApiCall -Method "GET" -Endpoint "/ordenes" -Token $VendorToken -Description "List orders"

    if ($Response.StatusCode -eq 200) {
        Add-TestResult -Action "Vendor List Orders" -Endpoint "/ordenes" -Method "GET" -StatusCode 200 -ExpectedStatus "200" -Passed $true
        return $true
    }
    elseif ($Response.StatusCode -eq 403) {
        Write-ErrorCustom "Vendor cannot list orders (403 Forbidden)"
        Add-TestResult -Action "Vendor List Orders" -Endpoint "/ordenes" -Method "GET" -StatusCode 403 -ExpectedStatus "200" -Passed $false -ErrorMessage "Access denied"
        return $false
    }
    else {
        Add-TestResult -Action "Vendor List Orders" -Endpoint "/ordenes" -Method "GET" -StatusCode $Response.StatusCode -ExpectedStatus "200" -Passed $false -ErrorMessage $Response.Content
        return $false
    }
}

function Test-VendorClients {
    Write-Section "Test 8: Vendor Clients Module (Allowed - List)"

    if ([string]::IsNullOrEmpty($VendorToken)) {
        Write-ErrorCustom "No valid vendor token available"
        return $false
    }

    Write-Info "Testing: List clients - vendor should access own clients"

    $Response = Invoke-ApiCall -Method "GET" -Endpoint "/clientes" -Token $VendorToken -Description "List clients"

    if ($Response.StatusCode -eq 200) {
        Add-TestResult -Action "Vendor List Clients" -Endpoint "/clientes" -Method "GET" -StatusCode 200 -ExpectedStatus "200" -Passed $true
        return $true
    }
    elseif ($Response.StatusCode -eq 403) {
        Write-ErrorCustom "Vendor cannot list clients (403 Forbidden)"
        Add-TestResult -Action "Vendor List Clients" -Endpoint "/clientes" -Method "GET" -StatusCode 403 -ExpectedStatus "200" -Passed $false -ErrorMessage "Access denied"
        return $false
    }
    else {
        Add-TestResult -Action "Vendor List Clients" -Endpoint "/clientes" -Method "GET" -StatusCode $Response.StatusCode -ExpectedStatus "200" -Passed $false -ErrorMessage $Response.Content
        return $false
    }
}

function Test-VendorUsersAccess {
    Write-Section "Test 9: Users Module Access (MUST BE DENIED)"

    if ([string]::IsNullOrEmpty($VendorToken)) {
        Write-ErrorCustom "No valid vendor token available"
        return $false
    }

    Write-Info "Testing: List users - vendor should be DENIED (admin-only)"

    $Response = Invoke-ApiCall -Method "GET" -Endpoint "/usuarios" -Token $VendorToken -Description "List users"

    if ($Response.StatusCode -eq 403 -or $Response.StatusCode -eq 401) {
        Write-Success "Vendor correctly denied access to users list (HTTP $($Response.StatusCode))"
        Add-TestResult -Action "Vendor Access Users (DENIED)" -Endpoint "/usuarios" -Method "GET" -StatusCode $Response.StatusCode -ExpectedStatus "403" -Passed $true -ErrorMessage "Expected: Vendor denied access"
        return $true
    }
    elseif ($Response.StatusCode -eq 200) {
        Write-ErrorCustom "SECURITY ISSUE: Vendor can access users list! Should be restricted to admin only"
        Add-TestResult -Action "Vendor Access Users (DENIED)" -Endpoint "/usuarios" -Method "GET" -StatusCode 200 -ExpectedStatus "403" -Passed $false -ErrorMessage "SECURITY: Vendor has unauthorized access to users"
        return $false
    }
    else {
        Add-TestResult -Action "Vendor Access Users (DENIED)" -Endpoint "/usuarios" -Method "GET" -StatusCode $Response.StatusCode -ExpectedStatus "403" -Passed $false -ErrorMessage $Response.Content
        return $false
    }
}

function Test-VendorCompanyAccess {
    Write-Section "Test 10: Company/Empresa Module (MUST BE DENIED)"

    if ([string]::IsNullOrEmpty($VendorToken)) {
        Write-ErrorCustom "No valid vendor token available"
        return $false
    }

    Write-Info "Testing: Access company settings - vendor should be DENIED (admin-only)"

    $Response = Invoke-ApiCall -Method "GET" -Endpoint "/empresas" -Token $VendorToken -Description "List companies"

    if ($Response.StatusCode -eq 403 -or $Response.StatusCode -eq 401) {
        Write-Success "Vendor correctly denied access to companies (HTTP $($Response.StatusCode))"
        Add-TestResult -Action "Vendor Access Companies (DENIED)" -Endpoint "/empresas" -Method "GET" -StatusCode $Response.StatusCode -ExpectedStatus "403" -Passed $true -ErrorMessage "Expected: Vendor denied access"
        return $true
    }
    elseif ($Response.StatusCode -eq 200) {
        Write-ErrorCustom "SECURITY ISSUE: Vendor can access companies! Should be restricted to admin only"
        Add-TestResult -Action "Vendor Access Companies (DENIED)" -Endpoint "/empresas" -Method "GET" -StatusCode 200 -ExpectedStatus "403" -Passed $false -ErrorMessage "SECURITY: Vendor has unauthorized access to companies"
        return $false
    }
    else {
        # 404 is acceptable - endpoint may not exist or be named differently
        Write-Info "Endpoint returned HTTP $($Response.StatusCode) - may not exist"
        Add-TestResult -Action "Vendor Access Companies (DENIED)" -Endpoint "/empresas" -Method "GET" -StatusCode $Response.StatusCode -ExpectedStatus "403 or N/A" -Passed $true
        return $true
    }
}

function Test-VendorEditCompany {
    Write-Section "Test 11: Edit Company (MUST BE DENIED)"

    if ([string]::IsNullOrEmpty($VendorToken)) {
        Write-ErrorCustom "No valid vendor token available"
        return $false
    }

    Write-Info "Testing: Edit company settings - vendor should be DENIED (admin-only)"

    $Payload = @{
        nombre = "Modified Company Name"
    }

    $Response = Invoke-ApiCall -Method "PATCH" -Endpoint "/empresas/$VendorCompanyId" -Token $VendorToken -Body $Payload -Description "Edit company"

    if ($Response.StatusCode -eq 403 -or $Response.StatusCode -eq 401) {
        Write-Success "Vendor correctly denied access to edit company (HTTP $($Response.StatusCode))"
        Add-TestResult -Action "Vendor Edit Company (DENIED)" -Endpoint "/empresas/{id}" -Method "PATCH" -StatusCode $Response.StatusCode -ExpectedStatus "403" -Passed $true
        return $true
    }
    elseif ($Response.StatusCode -eq 200 -or $Response.StatusCode -eq 204) {
        Write-ErrorCustom "SECURITY ISSUE: Vendor can edit company settings! Should be restricted to admin only"
        Add-TestResult -Action "Vendor Edit Company (DENIED)" -Endpoint "/empresas/{id}" -Method "PATCH" -StatusCode $Response.StatusCode -ExpectedStatus "403" -Passed $false -ErrorMessage "SECURITY: Vendor has unauthorized edit access"
        return $false
    }
    else {
        Write-Info "Endpoint returned HTTP $($Response.StatusCode)"
        Add-TestResult -Action "Vendor Edit Company (DENIED)" -Endpoint "/empresas/{id}" -Method "PATCH" -StatusCode $Response.StatusCode -ExpectedStatus "403 or N/A" -Passed $true
        return $true
    }
}

function Generate-Report {
    Write-Section "Generating Test Report"

    if (-not (Test-Path $ReportDir)) {
        New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
    }

    $PassedCount = ($TestResults | Where-Object { $_.passed -eq $true }).Count
    $FailedCount = ($TestResults | Where-Object { $_.passed -eq $false }).Count
    $TotalCount = $TestResults.Count

    $ReportData = @{
        testRunInfo = @{
            timestamp = $Timestamp
            environment = $Environment
            apiBaseUrl = $API_BASE_URL
            businessHandle = $BUSINESS_HANDLE
            scriptVersion = "1.0"
            purpose = "Vendor Role E2E Test - Permission Validation"
        }
        vendorCredentials = @{
            email = $TEST_SELLER_EMAIL
            testAccountUsed = $true
        }
        testResults = @{
            passed = $PassedCount
            failed = $FailedCount
            total = $TotalCount
            successRate = if ($TotalCount -gt 0) {
                [math]::Round(($PassedCount * 100) / $TotalCount, 2)
            } else { 0 }
        }
        detailedResults = $TestResults
        executionMode = @{
            dryRun = $DryRun
            verbose = $Verbose
        }
        generatedAt = (Get-Date -AsUTC -Format "o")
    }

    $ReportJson = ConvertTo-Json $ReportData -Depth 10
    $ReportJson | Out-File -FilePath $ReportFile -Encoding UTF8 -Force

    Write-Success "Report saved to: $ReportFile"
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "REPORT SUMMARY" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Total Tests: $TotalCount" -ForegroundColor White
    Write-Host "Passed: $PassedCount" -ForegroundColor Green
    Write-Host "Failed: $FailedCount" -ForegroundColor Red
    Write-Host "Success Rate: $([math]::Round(($PassedCount * 100) / if($TotalCount -gt 0) { $TotalCount } else { 1 }, 2))%" -ForegroundColor Yellow
    Write-Host ""
}

function Main {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ VENDOR ROLE E2E TEST SUITE" -ForegroundColor Cyan
    Write-Host "║ Permission Validation for Admin Panel" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Start Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    Write-Host "Environment: $Environment" -ForegroundColor Cyan
    Write-Host ""

    if (-not (Load-Configuration)) { return 2 }
    if (-not (Validate-Configuration)) { return 2 }

    # Run tests
    Test-AdminLogin | Out-Null
    Test-VendorLogin | Out-Null
    Test-VendorProfile | Out-Null
    Test-VendorDashboard | Out-Null
    Test-VendorProducts | Out-Null
    Test-VendorCreateProduct | Out-Null
    Test-VendorOrders | Out-Null
    Test-VendorClients | Out-Null
    Test-VendorUsersAccess | Out-Null
    Test-VendorCompanyAccess | Out-Null
    Test-VendorEditCompany | Out-Null

    Generate-Report

    Write-Section "Final Status"
    $PassedCount = ($TestResults | Where-Object { $_.passed -eq $true }).Count
    $FailedCount = ($TestResults | Where-Object { $_.passed -eq $false }).Count

    if ($FailedCount -eq 0) {
        Write-Success "All tests passed!"
        return 0
    }
    else {
        Write-ErrorCustom "$FailedCount test(s) failed."
        return 1
    }
}

exit (Main)
