import admin from 'firebase-admin';
import { logger } from './logger.js';

const requiredFirebaseEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_CLIENT_EMAIL",
];

export const initFirebase = () => {
  try {
    // Firebase Admin SDK initialization
    if (!admin.apps.length) {
      const missingVars = requiredFirebaseEnvVars.filter(
        (key) => !process.env[key]?.trim(),
      );

      if (missingVars.length > 0) {
        throw new Error(
          `Missing Firebase environment variables: ${missingVars.join(", ")}`,
        );
      }

      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      logger.info('Firebase initialized successfully');
    }

    return admin;
  } catch (error) {
    logger.error('Firebase initialization error:', error);
    throw error;
  }
};

export const getAuth = () => admin.auth();

export const getFirestoreDb = () => {
  // Optional: if using Firestore
  return admin.firestore();
};

export const verifyToken = async (token) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token, true);
    return decodedToken;
  } catch (error) {
    logger.error('Token verification error:', error);
    throw error;
  }
};

export const revokeUserSessions = async (uid) => {
  await admin.auth().revokeRefreshTokens(uid);
};
