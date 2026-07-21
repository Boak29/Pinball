# Pinball TikTok - Deployment Script
# Jalankan skrip ini untuk push ke GitHub dan auto-deploy ke Pages

param(
    [Parameter(Mandatory=$true)]
    [string]$RepoUrl,
    
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== Pinball TikTok Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Check if git repo exists
if (-not (Test-Path "$root\.git")) {
    Write-Host "[1/4] Initializing git repository..." -ForegroundColor Yellow
    git -C $root init
    git -C $root branch -M $Branch
} else {
    Write-Host "[1/4] Git repository already initialized" -ForegroundColor Green
}

# Verify remote
$remote = git -C $root remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "[2/4] Adding remote origin..." -ForegroundColor Yellow
    git -C $root remote add origin $RepoUrl
} else {
    Write-Host "[2/4] Remote origin: $remote" -ForegroundColor Green
    if ($remote -ne $RepoUrl) {
        Write-Host "  Warning: Existing remote differs from provided URL" -ForegroundColor Yellow
        Write-Host "  Existing: $remote" -ForegroundColor Yellow
        Write-Host "  Provided: $RepoUrl" -ForegroundColor Yellow
    }
}

Write-Host "[3/4] Committing files..." -ForegroundColor Yellow
git -C $root add -A
$status = git -C $root status --porcelain
if ($status) {
    git -C $root commit -m "Pinball TikTok Interactive - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    Write-Host "  Committed changes" -ForegroundColor Green
} else {
    Write-Host "  Nothing to commit" -ForegroundColor Green
}

Write-Host "[4/4] Pushing to GitHub..." -ForegroundColor Yellow
git -C $root push -u origin $Branch

Write-Host ""
Write-Host "=== Deployment Complete! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "GitHub Pages URL:" -ForegroundColor White
Write-Host "  https://$(($RepoUrl -replace 'https://github.com/','') -replace '\.git','')/PinballGame.htm" -ForegroundColor Green
Write-Host ""
Write-Host "TikTok LIVE URL:" -ForegroundColor White
Write-Host "  https://$(($RepoUrl -replace 'https://github.com/','') -replace '\.git','')/PinballGame.htm?user=USER_TIKTOK&ws=wss://RELAY_SERVER" -ForegroundColor Green
Write-Host ""
Write-Host "Note: GitHub Pages deployment takes ~1-2 minutes." -ForegroundColor Yellow
Write-Host "Check progress at: $RepoUrl/actions" -ForegroundColor Yellow
