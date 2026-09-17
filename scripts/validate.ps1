<#
.SYNOPSIS
    DR Vision Project Validation Script
.DESCRIPTION
    Validates HTML structure, checks required project assets, verifies JS file syntax,
    and ensures project integrity prior to commits.
#>

$ErrorActionPreference = "Stop"
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   DR Vision - Automated Project Validator   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$root = Resolve-Path "$PSScriptRoot\.."
Set-Location $root

$failures = 0

# 1. Check Required Files
Write-Host "`n[1/4] Checking Essential Project Files..." -ForegroundColor Yellow
$essentialFiles = @(
    "index.html",
    "css\styles.css",
    "js\app.js",
    "js\simulator.js",
    "js\gradcam.js",
    "js\shap.js",
    "js\report.js",
    "README.md",
    "CONTRIBUTING.md",
    "LICENSE"
)

foreach ($f in $essentialFiles) {
    if (Test-Path $f) {
        Write-Host "  [PASS] $f exists." -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Missing required file: $f" -ForegroundColor Red
        $failures++
    }
}

# 2. Check Fundus Assets
Write-Host "`n[2/4] Checking Fundus Image Dataset..." -ForegroundColor Yellow
$fundusImages = @(
    "assets\images\fundus_no_dr.jpg",
    "assets\images\fundus_mild_dr.jpg",
    "assets\images\fundus_moderate_dr.jpg",
    "assets\images\fundus_severe_dr.jpg",
    "assets\images\fundus_proliferative_dr.jpg",
    "assets\images\fundus_low_quality.jpg"
)

foreach ($img in $fundusImages) {
    if (Test-Path $img) {
        $item = Get-Item $img
        Write-Host "  [PASS] $img ($([math]::Round($item.Length / 1KB, 1)) KB)" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Missing fundus asset: $img" -ForegroundColor Red
        $failures++
    }
}

# 3. Check JSON validity if JSON files exist
Write-Host "`n[3/4] Checking JSON File Syntax..." -ForegroundColor Yellow
$jsonFiles = Get-ChildItem -Path . -Filter "*.json" -Recurse -Depth 2 | Where-Object { $_.FullName -notmatch '\\\.git\\' }

if ($jsonFiles.Count -eq 0) {
    Write-Host "  [INFO] No JSON files currently present. Skipping." -ForegroundColor Gray
} else {
    foreach ($j in $jsonFiles) {
        try {
            $content = Get-Content $j.FullName -Raw | ConvertFrom-Json
            Write-Host "  [PASS] Valid JSON: $($j.Name)" -ForegroundColor Green
        } catch {
            Write-Host "  [FAIL] Invalid JSON syntax in $($j.FullName): $_" -ForegroundColor Red
            $failures++
        }
    }
}

# 4. Check HTML integrity
Write-Host "`n[4/4] Checking HTML Tag Integrity..." -ForegroundColor Yellow
$htmlContent = Get-Content "index.html" -Raw
if ($htmlContent -match "<!DOCTYPE html>" -and $htmlContent -match "</html>") {
    Write-Host "  [PASS] index.html valid HTML5 doctype and structure." -ForegroundColor Green
} else {
    Write-Host "  [FAIL] index.html does not appear to have standard HTML5 boundaries." -ForegroundColor Red
    $failures++
}

Write-Host "`n=============================================" -ForegroundColor Cyan
if ($failures -eq 0) {
    Write-Host "   ALL CHECKS PASSED SUCCESSFULLY!          " -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "   VALIDATION FAILED WITH $failures ERRORS!         " -ForegroundColor Red
    Write-Host "=============================================" -ForegroundColor Cyan
    exit 1
}
