import { initializeApp, getApp, getApps } from "@firebase/app";
import { initializeAuth, getReactNativePersistence } from "@firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// ✅ Correct way: read from Expo config ONLY
const getFirebaseConfig = () => {
  const firebase = Constants.expoConfig?.extra?.firebase;

  if (!firebase || !firebase.apiKey) {
    throw new Error("🚨 Firebase config missing. Check app.config.js and .env");
  }

  return firebase;
};

let firebaseApp = null;
let firebaseAuth = null;
let initializationPromise = null;

export const initializeFirebaseAuth = async () => {
  if (initializationPromise) return initializationPromise;

  if (firebaseApp && firebaseAuth) {
    return firebaseAuth;
  }

  initializationPromise = (async () => {
    try {
      const firebaseConfig = getFirebaseConfig();

      // Step 1: Initialize App
      if (!getApps().length) {
        firebaseApp = initializeApp(firebaseConfig);
        console.log("✓ Firebase App initialized");
      } else {
        firebaseApp = getApp();
        console.log("✓ Firebase App retrieved");
      }

      // Step 2: Initialize Auth
      if (!firebaseAuth) {
        const persistence = getReactNativePersistence(ReactNativeAsyncStorage);

        firebaseAuth = initializeAuth(firebaseApp, {
          persistence,
        });

        console.log("✓ Firebase Auth initialized");
      }

      return firebaseAuth;
    } catch (error) {
      console.error("✗ Firebase initialization error:", error.message);
      initializationPromise = null;
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
