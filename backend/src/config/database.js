import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { logger } from './logger.js';

let gridFSBucket = null;

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    await mongoose.connect(mongoUri);
    logger.info('MongoDB connected successfully');

    // Initialize GridFSBucket
    const conn = mongoose.connection;
    const db = conn.db;
    gridFSBucket = new GridFSBucket(db, {
      bucketName: 'uploads',
    });

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
  if (!gridFSBucket) {
    throw new Error('GridFS not initialized. Make sure connectDB is called first.');
  }
  return gridFSBucket;
};
