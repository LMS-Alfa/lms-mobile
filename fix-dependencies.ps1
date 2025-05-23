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

# Create node_modules directory structure if it doesn't exist
if (-not (Test-Path -Path "./src/utils/node-modules")) {
    Write-Host "Creating node_modules directory structure..."
    New-Item -ItemType Directory -Path "./src/utils/node-modules" -Force | Out-Null
}

# Install specific versions of critical dependencies first
Write-Host "Installing critical polyfill packages..."
npm install --save react-native-get-random-values@1.9.0 base-64@1.0.0 web-streams-polyfill@3.2.1 text-encoding react-native-fetch-api --legacy-peer-deps

# Install remaining polyfills
Write-Host "Installing remaining polyfill packages..."
npm install --save react-native-url-polyfill stream-browserify buffer react-native-polyfill-globals react-native-crypto @tradle/react-native-http https-browserify react-native-os react-native-level-fs path-browserify browserify-zlib react-native-dotenv events --legacy-peer-deps

# Clean temporary npm files if any
Write-Host "Cleaning any temporary npm files..."
if (Test-Path -Path "npm-debug.log") {
    Remove-Item -Force "npm-debug.log"
}

# Remove Expo cache directory if it exists
$expoCacheDir = "$env:APPDATA\Expo\Cache"
if (Test-Path -Path $expoCacheDir) {
    Write-Host "Removing Expo cache directory..."
    Remove-Item -Recurse -Force $expoCacheDir
}

# Install all remaining dependencies
Write-Host "Installing remaining dependencies..."
npm install --legacy-peer-deps

Write-Host "Dependencies fixed! You can now start the app using: npm run windows-expo" 