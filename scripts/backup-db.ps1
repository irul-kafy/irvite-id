# ==============================================================================
# Irvite.id - Automated MySQL Database Backup Script (PowerShell)
# ==============================================================================
# Usage:
#   .\scripts\backup-db.ps1
#   .\scripts\backup-db.ps1 -OutputDir "C:\my-backups" -KeepDays 7
# ==============================================================================

param(
    [string]$OutputDir = "$PSScriptRoot\..\backups",
    [int]$KeepDays = 14,
    [string]$EnvFile = "$PSScriptRoot\..\.env"
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " IRVITE.ID - Database Backup Utility" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Resolve DATABASE_URL from environment or .env file
$databaseUrl = $env:DATABASE_URL

if (-not $databaseUrl -and (Test-Path $EnvFile)) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -match "^DATABASE_URL=['""]?([^'""]+)['""]?$") {
            $databaseUrl = $matches[1]
        }
    }
}

if (-not $databaseUrl) {
    Write-Error "DATABASE_URL not found in environment or $EnvFile. Please configure DATABASE_URL."
}

# 2. Parse DATABASE_URL (format: mysql://user:password@host:port/database?params)
if ($databaseUrl -match "^mysql:\/\/(?:([^:]+)(?::([^@]+))?@)?([^:\/]+)(?::(\d+))?\/([^?]+)") {
    $dbUser = $matches[1]
    $dbPass = $matches[2]
    $dbHost = $matches[3]
    $dbPort = if ($matches[4]) { $matches[4] } else { "3306" }
    $dbName = $matches[5]
} else {
    Write-Error "DATABASE_URL format is invalid or not MySQL: $databaseUrl"
}

Write-Host "Target Database : $dbName" -ForegroundColor Yellow
Write-Host "Target Host     : $dbHost:$dbPort" -ForegroundColor Yellow
Write-Host "Target User     : $dbUser" -ForegroundColor Yellow

# 3. Ensure Output Directory exists
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dumpFileName = "backup_${dbName}_${timestamp}.sql"
$dumpFilePath = Join-Path $OutputDir $dumpFileName

Write-Host "Backup Destination: $dumpFilePath" -ForegroundColor Gray

# 4. Check for mysqldump command
$mysqldump = Get-Command "mysqldump" -ErrorAction SilentlyContinue

if (-not $mysqldump) {
    Write-Warning "mysqldump executable not found in PATH."
    Write-Warning "If you are running in a managed cloud environment (e.g. Railway, PlanetScale, AWS RDS, Aiven),"
    Write-Warning "please ensure automatic snapshot/backup is enabled on your cloud provider dashboard."
    Write-Warning "To run manual backups locally, install MySQL Client Tools and ensure mysqldump is in PATH."
    exit 1
}

# 5. Execute mysqldump
Write-Host "Dumping schema and data..." -ForegroundColor Green

$dumpArgs = @(
    "--host=$dbHost",
    "--port=$dbPort",
    "--user=$dbUser",
    "--single-transaction",
    "--quick",
    "--routines",
    "--triggers",
    "--result-file=$dumpFilePath"
)

if ($dbPass) {
    $dumpArgs += "--password=$dbPass"
}

$dumpArgs += $dbName

$process = Start-Process -FilePath "mysqldump" -ArgumentList $dumpArgs -NoNewWindow -Wait -PassThru

if ($process.ExitCode -ne 0) {
    Write-Error "mysqldump failed with exit code $($process.ExitCode)."
}

# Verify output file
if ((Test-Path $dumpFilePath) -and ((Get-Item $dumpFilePath).Length -gt 0)) {
    $fileSizeKb = [math]::Round(((Get-Item $dumpFilePath).Length / 1KB), 2)
    Write-Host "Backup completed successfully! ($fileSizeKb KB)" -ForegroundColor Green
    Write-Host "File: $dumpFilePath" -ForegroundColor Green
} else {
    Write-Error "Backup file was not created or is 0 bytes."
}

# 6. Cleanup old backups older than KeepDays
if ($KeepDays -gt 0) {
    $cutoff = (Get-Date).AddDays(-$KeepDays)
    Get-ChildItem -Path $OutputDir -Filter "backup_${dbName}_*.sql" | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
        Write-Host "Removing old backup: $($_.Name)" -ForegroundColor DarkGray
        Remove-Item $_.FullName -Force
    }
}

Write-Host "Done." -ForegroundColor Cyan

