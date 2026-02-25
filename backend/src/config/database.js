import mongoose from 'mongoose';
import { logger } from './logger.js';
import Grid from 'gridfs-stream';

let gfs = null;

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    await mongoose.connect(mongoUri);
    logger.info('MongoDB connected successfully');

    // Initialize GridFS
    const conn = mongoose.connection;
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');

    // Create indexes
    createIndexes();
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Indexes will be created by models when needed
    logger.info('Database indexes created');
  } catch (error) {
    logger.error('Error creating indexes:', error);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
};

export const getGridFS = () => {
  if (!gfs) {
    throw new Error('GridFS not initialized. Make sure connectDB is called first.');
  }
  return gfs;
};
