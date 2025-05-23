# Start Metro Bundler in a new window
Start-Process powershell -ArgumentList "-Command npx expo start --dev-client"

# Allow Metro to start up
Write-Host "Starting Metro bundler... Please wait for a few seconds"
Start-Sleep -Seconds 5

# Start the mobile app
Write-Host "Starting app..."
npx expo run:android 