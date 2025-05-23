# LMS Mobile App

A React Native mobile application for the Learning Management System (LMS), providing full functionality for administrators, teachers, students, and parents on mobile devices.

## Setup Instructions

### Prerequisites
- Node.js 16+ installed
- npm 7+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- Android Studio or an Android device (for testing Android)
- Xcode (for Mac users, for testing iOS)
- Expo Go app installed on your mobile device

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
```
npm install --legacy-peer-deps
```

### Running the App

#### On Windows:

**Using Expo Go (Recommended for development):**
```
npm run windows-expo
```

**Using Android Device/Emulator:**
```
npm run windows
```

#### On Any Platform:

**Using Expo Go:**
```
npm start
```

**On Android:**
```
npm run android
```

**On iOS (requires Mac):**
```
npm run ios
```

**On Web:**
```
npm run web
```

### Troubleshooting

If you encounter dependency issues or build errors:

1. Reset dependencies:
```
npm run reset-deps
```

2. Clear Expo cache:
```
npm run clear-cache
```

3. Check for specific errors in the terminal output and refer to the Expo documentation for solutions.

## Project Structure

```
src/
├── components/ - Reusable UI components
│   ├── common/ - Shared across all user roles
│   ├── admin/ - Admin-specific components
│   ├── teacher/ - Teacher-specific components
│   ├── student/ - Student-specific components
│   └── parent/ - Parent-specific components
├── screens/ - Full app screens
│   ├── auth/ - Authentication screens
│   ├── admin/ - Admin screens
│   ├── teacher/ - Teacher screens
│   ├── student/ - Student screens
│   └── parent/ - Parent screens
├── navigators/ - Navigation configuration
├── hooks/ - Custom React hooks
├── store/ - Zustand stores
├── utils/ - Utility functions
├── styles/ - Global styles
```

## Features

- Role-based access for administrators, teachers, students, and parents
- Authentication with Supabase
- Theme support with light/dark mode
- Responsive UI for different device sizes
- Offline capabilities
- Real-time messaging

## Dependencies

- React Native with Expo
- React Navigation
- Styled Components
- Zustand for state management
- Supabase for backend services 