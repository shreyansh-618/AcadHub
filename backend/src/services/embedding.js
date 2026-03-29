import axios from "axios";
import { logger } from "../config/logger.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * Service for managing embeddings via AI service
 */

export const embeddingService = {
  /**
   * Get embedding for a single text
   */
  async getEmbedding(text) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error("Text cannot be empty");
      }

      const response = await axios.post(
        `${AI_SERVICE_URL}/api/v1/embed/text`,
        { text },
        { timeout: 10000 },
      );

      return response.data.embedding;
    } catch (error) {
      logger.error("Error getting embedding:", error.message);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  },

  /**
   * Get embeddings for multiple texts
   */
  async getEmbeddings(texts) {
    try {
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error("Texts must be a non-empty array");
      }

      const response = await axios.post(
        `${AI_SERVICE_URL}/api/v1/embed/batch`,
        { texts },
        { timeout: 30000 },
      );

      return response.data.embeddings;
    } catch (error) {
      logger.error("Error getting embeddings:", error.message);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  },

  /**
   * Get embedding dimension info
   */
  async getDimension() {
    try {
      const response = await axios.get(`${AI_SERVICE_URL}/api/v1/embed/info`, {
        timeout: 5000,
      });

      return response.data.dimension;
    } catch (error) {
      logger.error("Error getting embedding dimension:", error.message);
      // Return default dimension if AI service is down
      return 384; // all-MiniLM-L6-v2 default
    }
  },
};
