[CmdletBinding()]
param(
    [string]$RepoPath = 'D:\Software Development\Porfolio\OtraRondaMas',
    [string[]]$AdditionalRepoPaths = @(),
    [string]$HetznerHost = '',
    [string]$OutputRoot = (Join-Path $PWD 'phase5-r0-capture')
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outDir = Join-Path $OutputRoot $stamp
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

function Add-Section {
    param([System.Collections.Generic.List[string]]$Lines,[string]$Title,[scriptblock]$Action)
    $Lines.Add("")
    $Lines.Add("### $Title")
    try {
        $result = & $Action 2>&1
        if ($null -eq $result -or $result.Count -eq 0) { $Lines.Add("(sin salida)") }
        else { foreach ($item in $result) { $Lines.Add([string]$item) } }
    } catch { $Lines.Add("ERROR: $($_.Exception.Message)") }
}

function Write-RepoReport {
    param([string]$CandidatePath)
    if (-not (Test-Path -LiteralPath $CandidatePath -PathType Container)) { return $null }
    $root = & git -C $CandidatePath rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $root) { return $null }
    $root = [string]$root
    $safeName = ($root -replace '[:\\\/ ]', '_')
    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# Git inventory — $root")
    $lines.Add("Captured UTC: $([DateTime]::UtcNow.ToString('o'))")
    Add-Section $lines 'HEAD' { git -C $root rev-parse HEAD }
    Add-Section $lines 'Current branch' { git -C $root branch --show-current }
    Add-Section $lines 'Status (including untracked paths)' { git -C $root status --porcelain=v2 --branch --untracked-files=all }
    Add-Section $lines 'Branches and tracking' { git -C $root branch -avv }
    Add-Section $lines 'Recent graph' { git -C $root log --all --graph --decorate --oneline -30 }
    Add-Section $lines 'Remotes (credentials redacted)' {
        git -C $root remote -v 2>&1 | ForEach-Object { ([string]$_) -replace '(?i)(https?|ssh)://[^/@\s]+@', '$1://[REDACTED]@' }
    }
    Add-Section $lines 'Worktrees' { git -C $root worktree list --porcelain }
    Add-Section $lines 'Stashes' { git -C $root stash list }
    Add-Section $lines 'Submodules' { git -C $root submodule status --recursive }
    Add-Section $lines 'Tracked changes (name/status)' { git -C $root diff --name-status HEAD }
    Add-Section $lines 'Tracked changes (stat)' { git -C $root diff --stat HEAD }
    Add-Section $lines 'Untracked paths' { git -C $root ls-files --others --exclude-standard }

    $worktrees = & git -C $root worktree list --porcelain 2>$null
    foreach ($line in $worktrees) {
        if ([string]$line -match '^worktree (.+)$') {
            $wtPath = $Matches[1]
            if ($wtPath -ne $root -and (Test-Path -LiteralPath $wtPath -PathType Container)) {
                Add-Section $lines "Worktree status: $wtPath" { git -C $wtPath status --short --branch --untracked-files=all }
            }
        }
    }
    $file = Join-Path $outDir "git-$safeName.txt"
    $lines | Out-File -LiteralPath $file -Encoding utf8
    return $file
}

$repoCandidates = @($RepoPath) + @($AdditionalRepoPaths)
foreach ($candidate in $repoCandidates) { [void](Write-RepoReport -CandidatePath $candidate) }

if (-not $HetznerHost) {
    Write-Warning 'HetznerHost no informado: se omite la captura remota.'
} else {
    $remoteScript = @'
set +e
echo "UTC: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "HOST: $(hostname)"
echo "OS: $(uname -a)"
mapfile -t candidates < <(find /opt -mindepth 1 -maxdepth 2 -type d \( -iname "*wapsell*" -o -iname "*otraronda*" -o -iname "*waseller*" \) -print 2>/dev/null | sort -u)
for d in "\${candidates[@]}" /opt/devps/repo; do
  [ -d "$d" ] || continue
  root=$(git -C "$d" rev-parse --show-toplevel 2>/dev/null) || continue
  echo; echo "===== REPOSITORY: $root ====="
  echo "--- HEAD ---"; git -C "$root" rev-parse HEAD
  echo "--- BRANCH ---"; git -C "$root" branch --show-current
  echo "--- STATUS ---"; git -C "$root" status --porcelain=v2 --branch --untracked-files=all
  echo "--- BRANCHES ---"; git -C "$root" branch -avv
  echo "--- RECENT GRAPH ---"; git -C "$root" log --all --graph --decorate --oneline -20
  echo "--- REMOTES (credentials redacted) ---"; git -C "$root" remote -v 2>&1 | sed -E 's#(https?|ssh)://[^/@[:space:]]+@#\1://[REDACTED]@#g'
  echo "--- WORKTREES ---"; git -C "$root" worktree list --porcelain
  echo "--- STASHES ---"; git -C "$root" stash list
  echo "--- SUBMODULES ---"; git -C "$root" submodule status --recursive
  echo "--- TRACKED DIFF NAME-STATUS ---"; git -C "$root" diff --name-status HEAD
  echo "--- TRACKED DIFF STAT ---"; git -C "$root" diff --stat HEAD
  echo "--- UNTRACKED PATHS ---"; git -C "$root" ls-files --others --exclude-standard
done
echo
echo "===== HOST INVENTORY (NO CONTAINER ENV/SECRETS) ====="
echo "--- COMPOSE PROJECTS ---"; docker compose ls 2>&1
echo "--- RUNNING CONTAINERS ---"; docker ps --no-trunc --format '{{.Names}} | {{.Image}} | {{.Status}} | {{.Ports}}' 2>&1
echo "--- IMAGES ---"; docker images --format '{{.Repository}}:{{.Tag}} | {{.ID}} | {{.CreatedSince}} | {{.Size}}' 2>&1
echo "--- VOLUMES ---"; docker volume ls 2>&1
echo "--- NETWORKS ---"; docker network ls 2>&1
echo "--- DISK ---"; df -h 2>&1
echo "--- NGINX ROUTING DIRECTIVES (FILTERED) ---"
if command -v nginx >/dev/null 2>&1; then nginx -T 2>&1 | grep -E '^[[:space:]]*(listen|server_name|proxy_pass|ssl_certificate)' | head -300; else echo "nginx binary not found"; fi
'@
    $remoteFile = Join-Path $outDir 'hetzner-readonly-inventory.txt'
    $remoteScript | & ssh -o BatchMode=yes -o ConnectTimeout=10 $HetznerHost 'bash -s' 2>&1 | Out-File -LiteralPath $remoteFile -Encoding utf8
    if ($LASTEXITCODE -ne 0) { Write-Warning "SSH terminó con código $LASTEXITCODE. Revisar $remoteFile." }
}

$manifest = @(
    "Capture UTC: $([DateTime]::UtcNow.ToString('o'))",
    "Local repo candidates: $($repoCandidates -join '; ')",
    "Hetzner host supplied: $([bool]$HetznerHost)",
    "Read-only: yes",
    "No git fetch/pull/checkout/reset/clean/commit/push executed.",
    "No Docker stop/restart/remove/build/deploy executed.",
    "No .env, container inspect, environment variables, keys, or secret file contents collected."
)
$manifest | Out-File -LiteralPath (Join-Path $outDir 'CAPTURE-MANIFEST.txt') -Encoding utf8
$zipPath = "$outDir.zip"
Compress-Archive -Path (Join-Path $outDir '*') -DestinationPath $zipPath -Force
Write-Host "Capture complete: $zipPath"
Write-Host "Review the archive locally before sharing; redact any sensitive host/user/IP/path metadata if needed."
