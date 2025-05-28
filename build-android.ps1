# Set environment variable to skip React Native Directory validation
$env:EXPO_SKIP_REACT_NATIVE_DIRECTORY_CHECK = 1

# Run the build command
Write-Host "Building Android app with React Native Directory validation disabled..."
npx expo build:android

# Reset the environment variable
$env:EXPO_SKIP_REACT_NATIVE_DIRECTORY_CHECK = 0