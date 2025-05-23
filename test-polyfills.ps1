# Test script to verify polyfills are working correctly

Write-Host "Starting polyfill test..." -ForegroundColor Green

# Install dependencies if needed
if (-not (Test-Path -Path "./node_modules/text-encoding")) {
    Write-Host "text-encoding package not found, installing..." -ForegroundColor Yellow
    npm install --save text-encoding --legacy-peer-deps
}

if (-not (Test-Path -Path "./node_modules/web-streams-polyfill")) {
    Write-Host "web-streams-polyfill package not found, installing..." -ForegroundColor Yellow
    npm install --save web-streams-polyfill@3.2.1 --legacy-peer-deps
}

if (-not (Test-Path -Path "./node_modules/react-native-fetch-api")) {
    Write-Host "react-native-fetch-api package not found, installing..." -ForegroundColor Yellow
    npm install --save react-native-fetch-api --legacy-peer-deps
}

# Clean Metro bundler cache manually
Write-Host "Cleaning Metro bundler cache..." -ForegroundColor Yellow
if (Test-Path -Path "./node_modules/.cache") {
    Remove-Item -Recurse -Force "./node_modules/.cache"
}

# Remove Expo cache directory if it exists
$expoCacheDir = "$env:APPDATA\Expo\Cache"
if (Test-Path -Path $expoCacheDir) {
    Write-Host "Removing Expo cache directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $expoCacheDir
}

# Run a test Metro bundler session
Write-Host "Starting Metro bundler to test polyfills..." -ForegroundColor Yellow
Write-Host "This will compile the app - if no errors are reported, the polyfills are working correctly." -ForegroundColor Yellow
Write-Host "Press Ctrl+C after you see 'Metro waiting on' message to exit the test." -ForegroundColor Yellow

# Start expo with verbose output to see if there are polyfill errors
npx expo start --clear

Write-Host "Polyfill test complete!" -ForegroundColor Green 