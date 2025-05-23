# Delete node_modules
if (Test-Path -Path "./node_modules") {
    Write-Host "Removing node_modules folder..."
    Remove-Item -Recurse -Force "./node_modules"
}

# Delete yarn.lock or package-lock.json
if (Test-Path -Path "./yarn.lock") {
    Write-Host "Removing yarn.lock file..."
    Remove-Item -Force "./yarn.lock"
}

if (Test-Path -Path "./package-lock.json") {
    Write-Host "Removing package-lock.json file..."
    Remove-Item -Force "./package-lock.json"
}

# Clear npm cache
Write-Host "Clearing npm cache..."
npm cache clean --force

# Clear Expo cache
Write-Host "Clearing Expo cache..."
npx expo-cli clean

# Reinstall dependencies
Write-Host "Reinstalling dependencies..."
npm install --legacy-peer-deps

Write-Host "Dependencies reset completed. You can now start the app." 