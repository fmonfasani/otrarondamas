param(
    [bool]$DryRun = $false,
    [string]$Environment = 'development',
    [bool]$Verbose = $false,
    [switch]$Help
)

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommandPath
$Timestamp = (Get-Date -Format "yyyyMMdd_HHmmss")
$ReportDir = Join-Path $ScriptRoot "reports"
$ReportFile = Join-Path $ReportDir "onboarding-report-$Timestamp.json"
$TestsPassed = 0
$TestsFailed = 0

function Write-Info { param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success { param([string]$Message)
    Write-Host "[PASS] $Message" -ForegroundColor Green
    $Script:TestsPassed++
}

function Write-ErrorCustom { param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
    $Script:TestsFailed++
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
        Write-Info "Copy .env.testing.example to .env.testing and configure it"
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

    return $true
}

function Validate-Configuration {
    Write-Info "Validating configuration..."

    $RequiredVars = 'API_BASE_URL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'BUSINESS_HANDLE'
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

function Check-Prerequisites {
    Write-Section "Checking Prerequisites"

    if ($PSVersionTable.PSVersion.Major -lt 5) {
        Write-ErrorCustom "PowerShell 5.0+ is required"
        return $false
    }
    Write-Success "PowerShell version $($PSVersionTable.PSVersion.Major) is compatible"

    if (-not (Test-Path $ReportDir)) {
        New-Item -ItemType Directory -Path $ReportDir -Force | Out-Null
    }
    Write-Success "Reports directory ready: $ReportDir"

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
        }

        if ($Body) {
            $Params['Body'] = (ConvertTo-Json $Body)
        }

        $Response = Invoke-WebRequest @Params -ErrorAction Stop

        Write-DebugCustom "HTTP Status: $($Response.StatusCode)"

        return @{
            StatusCode = $Response.StatusCode
            Content = $Response.Content
        }
    }
    catch {
        Write-DebugCustom "Error: $_"
        return @{
            StatusCode = 0
            Content = $_
            Error = $true
        }
    }
}

function Validate-Response {
    param(
        $Response,
        [int]$ExpectedCode,
        [string]$Description
    )

    if ($Response.StatusCode -eq $ExpectedCode) {
        Write-Success "$Description (HTTP $($Response.StatusCode))"

        if ($Response.Content) {
            try {
                return (ConvertFrom-Json $Response.Content)
            }
            catch {
                return $Response.Content
            }
        }
        return $null
    }
    else {
        Write-ErrorCustom "$Description (Expected HTTP $ExpectedCode, got HTTP $($Response.StatusCode))"
        if ($Response.Content) {
            Write-DebugCustom "Response: $($Response.Content)"
        }
        return $null
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

    $Response = Invoke-ApiCall -Method "POST" -Endpoint "/auth/login" -Body $Payload
    $Result = Validate-Response -Response $Response -ExpectedCode 200 -Description "Login admin user"

    if ($null -eq $Result) { return $false }

    $Script:AdminToken = $Result.accessToken

    if ([string]::IsNullOrEmpty($AdminToken)) {
        Write-ErrorCustom "Failed to extract JWT token from response"
        return $false
    }

    Write-Success "JWT Token obtained: $($AdminToken.Substring(0,20))..."

    return $true
}

function Test-GetUserProfile {
    Write-Section "Test 2: Retrieve Admin User Profile"

    if ([string]::IsNullOrEmpty($AdminToken)) {
        Write-ErrorCustom "No valid token available"
        return $false
    }

    Write-Info "Testing: Fetch authenticated user profile"

    $Response = Invoke-ApiCall -Method "GET" -Endpoint "/auth/me" -Token $AdminToken
    $Result = Validate-Response -Response $Response -ExpectedCode 200 -Description "Fetch profile"

    if ($null -eq $Result) { return $false }

    $Script:CompanyId = $Result.empresaId
    $Script:CompanyName = $Result.empresaNombre
    $Script:UserId = $Result.id
    $Script:UserRole = $Result.rol

    Write-Success "Admin user: $ADMIN_EMAIL"
    Write-Success "Company ID: $CompanyId"
    Write-Success "Company Name: $CompanyName"

    if ([string]::IsNullOrEmpty($CompanyId)) {
        Write-ErrorCustom "Failed to extract company information"
        return $false
    }

    return $true
}

function Test-DashboardAccess {
    Write-Section "Test 3: Dashboard Metrics Access"

    if ([string]::IsNullOrEmpty($AdminToken)) {
        Write-ErrorCustom "No valid token available"
        return $false
    }

    Write-Info "Testing: Load dashboard KPIs"

    $Response = Invoke-ApiCall -Method "GET" -Endpoint "/admin/dashboard/kpis?period=30d" -Token $AdminToken
    $Result = Validate-Response -Response $Response -ExpectedCode 200 -Description "Load dashboard KPIs"

    if ($null -eq $Result) { return $false }

    Write-Success "Dashboard KPIs loaded"
    Write-Info "  Data retrieved successfully"

    return $true
}

function Test-AuditLogsAccess {
    Write-Section "Test 4: Audit Logs Access"

    if ([string]::IsNullOrEmpty($AdminToken)) {
        Write-ErrorCustom "No valid token available"
        return $false
    }

    Write-Info "Testing: Retrieve audit logs"

    $Response = Invoke-ApiCall -Method "GET" -Endpoint "/admin/audit/logs?limit=10&page=1" -Token $AdminToken
    $Result = Validate-Response -Response $Response -ExpectedCode 200 -Description "Retrieve audit logs"

    if ($null -eq $Result) { return $false }

    Write-Success "Audit logs accessible"

    return $true
}

function Test-UsersList {
    Write-Section "Test 5: Retrieve Users List"

    if ([string]::IsNullOrEmpty($AdminToken)) {
        Write-ErrorCustom "No valid token available"
        return $false
    }

    Write-Info "Testing: Fetch authorized users list"

    $Response = Invoke-ApiCall -Method "GET" -Endpoint "/usuarios" -Token $AdminToken
    $Result = Validate-Response -Response $Response -ExpectedCode 200 -Description "Fetch users list"

    if ($null -eq $Result) { return $false }

    Write-Success "Users list retrieved"

    return $true
}

function Generate-Report {
    Write-Section "Generating Test Report"

    $ReportData = @{
        testRunInfo = @{
            timestamp = $Timestamp
            environment = $Environment
            apiBaseUrl = $API_BASE_URL
            businessHandle = $BUSINESS_HANDLE
            scriptVersion = "1.0"
        }
        authentication = @{
            adminEmail = $ADMIN_EMAIL
            companyId = if ($CompanyId) { $CompanyId } else { "N/A" }
            companyName = if ($CompanyName) { $CompanyName } else { "N/A" }
            tokenObtained = -not [string]::IsNullOrEmpty($AdminToken)
        }
        testResults = @{
            passed = $TestsPassed
            failed = $TestsFailed
            total = $TestsPassed + $TestsFailed
            successRate = if (($TestsPassed + $TestsFailed) -gt 0) {
                [math]::Round(($TestsPassed * 100) / ($TestsPassed + $TestsFailed), 2)
            } else { 0 }
        }
        executionMode = @{
            dryRun = $DryRun
            verbose = $Verbose
        }
        generatedAt = (Get-Date -AsUTC -Format "o")
    }

    $ReportJson = ConvertTo-Json $ReportData -Depth 10
    $ReportJson | Out-File -FilePath $ReportFile -Encoding UTF8 -Force

    Write-Success "Report saved to: $ReportFile"
}

function Main {
    Write-Info "Wapsell Admin Onboarding Flow Test Suite"
    Write-Info "Version: 1.0"
    Write-Info "Timestamp: $Timestamp"
    Write-Host ""

    if (-not (Check-Prerequisites)) { return 3 }
    if (-not (Load-Configuration)) { return 2 }
    if (-not (Validate-Configuration)) { return 2 }

    if (-not (Test-AdminLogin)) { $Script:TestsFailed++ }
    if (-not (Test-GetUserProfile)) { $Script:TestsFailed++ }
    if (-not (Test-DashboardAccess)) { $Script:TestsFailed++ }
    if (-not (Test-AuditLogsAccess)) { $Script:TestsFailed++ }
    if (-not (Test-UsersList)) { $Script:TestsFailed++ }

    Generate-Report

    Write-Section "Test Summary"
    Write-Info "Tests Passed: $TestsPassed"
    Write-Info "Tests Failed: $TestsFailed"
    Write-Info "Total Tests: $($TestsPassed + $TestsFailed)"

    if ($TestsFailed -eq 0) {
        Write-Success "All tests passed!"
        Write-Host ""
        return 0
    }
    else {
        Write-ErrorCustom "Some tests failed. See report: $ReportFile"
        Write-Host ""
        return 1
    }
}

exit (Main)
