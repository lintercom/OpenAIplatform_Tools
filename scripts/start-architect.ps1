# Start Architect Script
# Spustí Architect API a UI v samostatných oknech

Write-Host "🚀 Starting Architect..." -ForegroundColor Green

# Check if pnpm is available
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ pnpm is not installed!" -ForegroundColor Red
    Write-Host "Please install pnpm first:" -ForegroundColor Yellow
    Write-Host "  npm install -g pnpm" -ForegroundColor Yellow
    exit 1
}

# Start API in new window
Write-Host "Starting Architect API..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\apps\architect-api'; pnpm dev"

# Wait a bit
Start-Sleep -Seconds 2

# Start UI in new window
Write-Host "Starting Architect UI..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\apps\architect-ui'; pnpm dev"

# Wait a bit
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ Architect is starting!" -ForegroundColor Green
Write-Host ""
Write-Host "API: http://localhost:3001" -ForegroundColor Yellow
Write-Host "UI:  http://localhost:5174" -ForegroundColor Yellow
Write-Host ""
Write-Host "Open http://localhost:5174 in your browser" -ForegroundColor Cyan
