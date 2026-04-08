import axios from "axios";
import { logger } from "../config/logger.js";
import {
  AI_SERVICE_URL,
  getAiServiceAxiosConfig,
} from "../utils/aiService.js";

/**
 * Service for semantic search operations
 */

export const searchService = {
  /**
   * Perform semantic search
   */
  async semanticSearch(query, filters = {}, limit = 10, offset = 0) {
    try {
      if (!query || query.trim().length === 0) {
        throw new Error("Search query cannot be empty");
      }

      logger.info(`Semantic search: ${query}`);

      const response = await axios.post(
        `${AI_SERVICE_URL}/api/v1/search/semantic`,
        {
          query: query.trim(),
          filters: Object.keys(filters).length > 0 ? filters : null,
          limit,
          offset,
        },
        getAiServiceAxiosConfig({ timeout: 30000 }),
      );

      return {
        results: response.data.results || [],
        total: response.data.total || 0,
        page: response.data.page || 1,
        limit: response.data.limit || limit,
        processing_time: response.data.processing_time || 0,
      };
    } catch (error) {
      logger.error("Error in semanticSearch:", error.message);
      throw new Error(`Search failed: ${error.message}`);
    }
  },

  /**
   * Index a resource for semantic search
   */
  async indexResource(resourceId, title, description, content, metadata) {
    try {
      const payload = {
        resource_id: resourceId,
        title,
        description: description || "",
        content: content || "",
        department: metadata?.department || "",
        subject: metadata?.subject || "",
        category: metadata?.category || "",
        semester: metadata?.semester || null,
      };

      await axios.post(
        `${AI_SERVICE_URL}/api/v1/search/index`,
        payload,
        getAiServiceAxiosConfig({
          timeout: 30000,
        }),
      );

      logger.info(`Resource indexed: ${resourceId}`);
    } catch (error) {
      logger.warn(`Failed to index resource ${resourceId}:`, error.message);
      // Non-critical - don't throw
    }
  },

  /**
   * Remove resource from semantic index
   */
  async removeResourceIndex(resourceId) {
    try {
      await axios.delete(
        `${AI_SERVICE_URL}/api/v1/search/index/${resourceId}`,
        getAiServiceAxiosConfig({
          timeout: 10000,
        }),
      );

      logger.info(`Resource de-indexed: ${resourceId}`);
    } catch (error) {
      logger.warn(`Failed to de-index resource ${resourceId}:`, error.message);
    }
  },

  /**
   * Get search suggestions
   */
  async getSuggestions(query, limit = 5) {
    try {
      const response = await axios.get(
        `${AI_SERVICE_URL}/api/v1/search/suggestions`,
        getAiServiceAxiosConfig({
          params: { query, limit },
          timeout: 5000,
        }),
      );

      return response.data.suggestions || [];
    } catch (error) {
      logger.warn("Failed to get search suggestions:", error.message);
      return [];
    }
  },
};
