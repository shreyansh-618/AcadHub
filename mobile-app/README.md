# AcadHub Mobile App

Mobile application for the AcadHub AI-driven academic platform built with React Native and Expo.

## Features

- 📱 Cross-platform support (iOS & Android)
- 🔐 Firebase authentication
- 💡 AI-powered question answering
- 📚 Resource browsing and search
- 📊 Personalized recommendations
- 👤 User profile management
- 🔔 Push notifications

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
cd mobile-app
npm install
```

### Environment Variables

Create `.env.local` file:

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_FIREBASE_CONFIG={"your":"firebase_config"}
```

### Running

**Development:**

```bash
npm start
```

**iOS:**

```bash
npm run ios
```

**Android:**

```bash
npm run android
```

**Web:**

```bash
npm run web
```

## Project Structure

```
/app
  /auth         - Authentication screens (login, signup)
  /home         - Home/dashboard screen
  /resources    - Resources browsing screen
  /assistant    - AI assistant screen
  /profile      - User profile screen
/components     - Reusable components
/services       - API clients and services
/store          - State management (Zustand)
/constants      - App constants and colors
```

## Key Services

- **authService** - Authentication (login, signup, logout)
- **resourceService** - Resource operations (list, download, upload)
- **qaService** - Question answering with RAG
- **recommendationService** - Personalized recommendations
- **analyticsService** - Activity tracking
- **searchService** - Semantic search

## State Management

Using Zustand for state management:

- `useAuthStore` - Authentication and user state
- `useRecommendationStore` - Recommendations cache
- `useResourceStore` - Resources cache
- `useSearchStore` - Search history and saved resources

## Building for Production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

## Testing

```bash
npm test
```

## Deployment

Use Expo Application Services (EAS) for building and distributing:

```bash
eas build
eas submit
```

## Troubleshooting

- **Blank screen**: Check that the API URL is correct in `.env.local`
- **Auth failures**: Ensure Firebase is properly configured
- **Network errors**: Verify the backend services are running

## Documentation

- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)
- [React Navigation](https://reactnavigation.org)
