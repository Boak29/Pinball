# Build TikPinball APK locally

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== TikPinball APK Builder ===" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
$hasNode = Get-Command node -ErrorAction SilentlyContinue
$hasJava = Get-Command java -ErrorAction SilentlyContinue

if (-not $hasNode) {
    Write-Host "ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

if (-not $hasJava) {
    Write-Host "ERROR: Java JDK not found. Install JDK 17 from https://adoptium.net" -ForegroundColor Red
    exit 1
}

Write-Host "Node.js: $(node --version)" -ForegroundColor Green
Write-Host "Java:    $(java -version 2>&1 | Select-Object -First 1)" -ForegroundColor Green
Write-Host ""

# Check for ANDROID_HOME or ANDROID_SDK_ROOT
if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
    Write-Host "WARNING: ANDROID_HOME not set!" -ForegroundColor Yellow
    Write-Host "  Install Android Studio, then set:" -ForegroundColor Yellow
    Write-Host "  `$env:ANDROID_HOME = 'C:\Users\$env:USERNAME\AppData\Local\Android\Sdk'" -ForegroundColor Yellow
    Write-Host ""

    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne 'y') { exit 1 }
}

Set-Location $root

# Install Cordova if not present
$hasCordova = Get-Command cordova -ErrorAction SilentlyContinue
if (-not $hasCordova) {
    Write-Host "Installing Cordova..." -ForegroundColor Yellow
    npm install -g cordova
}

Write-Host "[1/5] Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "[2/5] Adding Android platform..." -ForegroundColor Yellow
cordova platform add android --nofetch

Write-Host "[3/5] Building APK..." -ForegroundColor Yellow
cordova build android --release

Write-Host "[4/5] Signing APK (debug)..." -ForegroundColor Yellow
$unsigned = "platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk"
$signed = "TikPinball.apk"

if (Test-Path $unsigned) {
    # Use debug keystore for local builds
    $keystore = "$env:USERPROFILE\.android\debug.keystore"
    if (Test-Path $keystore) {
        & jarsigner -keystore $keystore -storepass android -keypass android `
            -digestalg SHA1 -sigalg MD5withRSA `
            $unsigned androiddebugkey
        Copy-Item $unsigned $signed -Force
        Write-Host "[5/5] APK ready: $signed" -ForegroundColor Green
    } else {
        Write-Host "  Debug keystore not found, copying unsigned APK" -ForegroundColor Yellow
        Copy-Item $unsigned $signed -Force
    }
}

Write-Host ""
Write-Host "=== Build Complete! ===" -ForegroundColor Cyan
if (Test-Path ".\TikPinball.apk") {
    Write-Host "APK: $root\TikPinball.apk" -ForegroundColor Green
    Write-Host ""
    Write-Host "Install on phone:" -ForegroundColor White
    Write-Host "  adb install TikPinball.apk" -ForegroundColor Gray
}
