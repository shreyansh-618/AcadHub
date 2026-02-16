import admin from 'firebase-admin';
import { logger } from './logger.js';

export const initFirebase = () => {
  try {
    // Firebase Admin SDK initialization
    if (!admin.apps.length) {
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
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    logger.error('Token verification error:', error);
    throw error;
  }
};
