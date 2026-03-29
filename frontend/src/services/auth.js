import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { apiClient } from './api';

// Initialize Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Set persistence
setPersistence(auth, browserLocalPersistence).catch(console.error);

export const authService = {
  /**
   * Signup with email and password
   */
  async signup(
    name,
    email,
    password,
    role = 'student',
    department = 'Computer Science'
  ) {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);

      // Get ID token
      const idToken = await firebaseUser.getIdToken();
      localStorage.setItem('authToken', idToken);

      // Create user profile on backend
      const response = await apiClient.post('/auth/signup', {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name,
        role,
        department,
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Signup with Google
   */
  async signupWithGoogle(role = 'student', department = 'Computer Science') {
    try {
      const result = await signInWithPopup(auth, googleProvider);

      // Get ID token
      const idToken = await result.user.getIdToken();
      localStorage.setItem('authToken', idToken);

      // Create or get user profile on backend
      const response = await apiClient.post('/auth/google', {
        uid: result.user.uid,
        email: result.user.email,
        name: result.user.displayName || 'User',
        role,
        department,
      });

      // Wait a moment for auth state to update
      await new Promise(resolve => setTimeout(resolve, 500));

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Login with email and password
   */
  async login(email, password) {
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);

      // Get ID token
      const idToken = await firebaseUser.getIdToken();
      localStorage.setItem('authToken', idToken);

      // Get user profile from backend
      const response = await apiClient.post('/auth/login', {
        uid: firebaseUser.uid,
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Login with Google
   */
  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);

      // Get ID token
      const idToken = await result.user.getIdToken();
      localStorage.setItem('authToken', idToken);

      // Get or create user profile on backend
      const response = await apiClient.post('/auth/google', {
        uid: result.user.uid,
        email: result.user.email,
        name: result.user.displayName || 'User',
      });

      // Wait a moment for auth state to update
      await new Promise(resolve => setTimeout(resolve, 500));

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      await signOut(auth);
      localStorage.removeItem('authToken');
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Get currently authenticated user
   */
  async getCurrentUser() {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          resolve(null);
        }
      }, reject);
    });
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Refresh ID token
   */
  async refreshToken() {
    try {
      const user = await this.getCurrentUser();
      if (user) {
        const idToken = await user.getIdToken(true);
        localStorage.setItem('authToken', idToken);
        return idToken;
      }
      return null;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * Handle authentication errors
   */
  handleError(error) {
    let message = 'An error occurred during authentication';

    // Handle Firebase auth errors
    if (error.code) {
      if (error.code === 'auth/email-already-in-use') {
        message = 'Email already in use';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak (minimum 6 characters)';
      } else if (error.code === 'auth/user-not-found') {
        message = 'User not found. Please sign up first.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many login attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'This operation is not allowed. Please contact support.';
      }
    }
    // Handle API/axios errors
    else if (error.response) {
      message = error.response.data?.message || 
                error.response.data?.error ||
                `Request failed: ${error.response.statusText}`;
    } 
    // Handle network errors
    else if (error.message) {
      message = error.message;
    }

    const customError = new Error(message);
    customError.code = error.code;
    customError.originalError = error;
    return customError;
  },
};
