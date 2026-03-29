import mongoose from "mongoose";
import { logger } from "./logger.js";

let gfs = null;
let uploadsFilesCollection = null;

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    // Add connection timeout
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info("MongoDB connected successfully");

    // Initialize GridFS bucket
    const conn = mongoose.connection;
    gfs = new mongoose.mongo.GridFSBucket(conn.db, {
      bucketName: "uploads",
    });
    uploadsFilesCollection = conn.db.collection("uploads.files");

    // Create indexes
    await createIndexes();
  } catch (error) {
    console.error("================================");
    console.error("❌ MongoDB Connection Error");
    console.error("================================");
    console.error("\nError Message:", error.message);
    console.error("\n📋 To fix this issue:");
    console.error("1. Go to MongoDB Atlas Console: https://cloud.mongodb.com");
    console.error("2. Navigate to Network Access (IP Whitelist)");
    console.error(
      "3. Add your current IP address or 0.0.0.0/0 for development",
    );
    console.error("4. Wait 2-3 minutes for changes to propagate");
    console.error("5. Try running the backend again");
    console.error("================================\n");

    logger.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Indexes will be created by models when needed
    logger.info("Database indexes created");
  } catch (error) {
    logger.error("Error creating indexes:", error);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected");
  } catch (error) {
    logger.error("Error disconnecting from MongoDB:", error);
  }
};

export const getGridFS = () => {
  if (!gfs) {
    throw new Error(
      "GridFS not initialized. Make sure connectDB is called first.",
    );
  }
  return gfs;
};

export const getUploadsFilesCollection = () => {
  if (!uploadsFilesCollection) {
    throw new Error(
      "GridFS files collection not initialized. Make sure connectDB is called first.",
    );
  }
  return uploadsFilesCollection;
};
