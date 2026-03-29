import { initializeApp, getApp, getApps } from "@firebase/app";
import { initializeAuth, getReactNativePersistence } from "@firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Firebase configuration from environment or fallback
const getFirebaseConfig = () => {
  // Try to get from Constants (Expo environment variables)
  const config = {
    apiKey:
      Constants.expoConfig?.extra?.firebaseApiKey ||
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain:
      Constants.expoConfig?.extra?.firebaseAuthDomain ||
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:
      Constants.expoConfig?.extra?.firebaseProjectId ||
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:
      Constants.expoConfig?.extra?.firebaseStorageBucket ||
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
      Constants.expoConfig?.extra?.firebaseMessagingSenderId ||
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:
      Constants.expoConfig?.extra?.firebaseAppId ||
      process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };

  // Log config for debugging
  if (__DEV__) {
    console.log("Firebase Config Keys:", {
      apiKey: config.apiKey ? "✓" : "✗",
      authDomain: config.authDomain ? "✓" : "✗",
      projectId: config.projectId ? "✓" : "✗",
      storageBucket: config.storageBucket ? "✓" : "✗",
      messagingSenderId: config.messagingSenderId ? "✓" : "✗",
      appId: config.appId ? "✓" : "✗",
    });
  }

  // Fallback to hardcoded values (for development)
  if (!config.apiKey) {
    console.warn(
      "⚠️  Using fallback Firebase config. Set env vars in app.json!",
    );
    // Throw error instead of using hardcoded keys - keys should NEVER be hardcoded
    throw new Error(
      "🚨 CRITICAL: Firebase configuration is missing! " +
        "Please set EXPO_PUBLIC_FIREBASE_* environment variables in .env or app.json. " +
        "Do NOT hardcode API keys in the source code.",
    );
  }

  return config;
};

let firebaseApp = null;
let firebaseAuth = null;
let initializationPromise = null;

export const initializeFirebaseAuth = async () => {
  // Return existing promise if already initializing
  if (initializationPromise) {
    return initializationPromise;
  }

  // Return early if already initialized
  if (firebaseApp && firebaseAuth) {
    return firebaseAuth;
  }

  // Create initialization promise to prevent race conditions
  initializationPromise = (async () => {
    try {
      const firebaseConfig = getFirebaseConfig();

      // Step 1: Get or create Firebase App
      if (!getApps().length) {
        firebaseApp = initializeApp(firebaseConfig);
        console.log("✓ Firebase App initialized");
      } else {
        firebaseApp = getApp();
        console.log("✓ Firebase App retrieved");
      }

      // Step 2: Initialize Auth with React Native persistence
      if (!firebaseAuth) {
        try {
          const persistence = getReactNativePersistence(
            ReactNativeAsyncStorage,
          );
          firebaseAuth = initializeAuth(firebaseApp, {
            persistence: persistence,
          });
          console.log(
            "✓ Firebase Auth initialized with AsyncStorage persistence",
          );
        } catch (authInitError) {
          // If we get "Component auth has not been registered", this is a critical error
          if (
            authInitError.message?.includes(
              "Component auth has not been registered",
            )
          ) {
            console.error(
              "✗ Firebase Auth component registration failed. This may be a SDK or configuration issue.",
            );
            console.error("  Full error:", authInitError.message);
          }
          throw authInitError;
        }
      }

      return firebaseAuth;
    } catch (error) {
      console.error("✗ Firebase initialization error:", error.message);
      console.error("✗ Stack:", error.stack);
      initializationPromise = null; // Reset on error to allow retry
      throw error;
    }
  })();

  return initializationPromise;
};

export const getFirebaseAuthInstance = () => {
  if (!firebaseAuth) {
    throw new Error(
      "Firebase Auth not initialized. Call initializeFirebaseAuth() first.",
    );
  }
  return firebaseAuth;
};

export default {
  initializeFirebaseAuth,
  getFirebaseAuthInstance,
};
