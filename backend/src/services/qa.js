import axios from "axios";
import { logger } from "../config/logger.js";
import { Resource } from "../models/Resource.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * Service for QA operations (question answering with RAG)
 */

export const qaService = {
  /**
   * Ask a question and get an answer with sources
   */
  async askQuestion(question, resourceIds = null) {
    try {
      if (!question || question.trim().length === 0) {
        throw new Error("Question cannot be empty");
      }

      if (question.length > 500) {
        throw new Error("Question too long (max 500 characters)");
      }

      logger.info(`Processing QA: ${question.substring(0, 100)}`);

      const payload = {
        question: question.trim(),
      };

      if (resourceIds && Array.isArray(resourceIds) && resourceIds.length > 0) {
        payload.resource_ids = resourceIds;
      }

      const response = await axios.post(
        `${AI_SERVICE_URL}/api/v1/qa/answer`,
        payload,
        {
          timeout: 60000, // 60s timeout for QA
        },
      );

      return {
        answer: response.data.answer,
        sources: response.data.sources || [],
        confidence: response.data.confidence || 0,
        tokens_used: response.data.tokens_used || 0,
        processing_time: response.data.processing_time_ms || 0,
        source_count:
          response.data.source_count ||
          (response.data.sources || []).length ||
          0,
        answer_mode: response.data.answer_mode || "ai",
        answer_label: response.data.answer_label || "AI Answer",
      };
    } catch (error) {
      logger.error("Error in askQuestion:", error.message);
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error(`Failed to generate answer: ${error.message}`);
    }
  },

  /**
   * Store QA interaction for analytics
   */
  async storeInteraction(userId, question, answer, sources, resourceIds = []) {
    try {
      const payload = {
        userId,
        question,
        answer,
        sources,
        resourceIds,
        processingTime: Date.now(),
      };

      await axios.post(
        `${AI_SERVICE_URL}/api/v1/qa/store-interaction`,
        payload,
        {
          timeout: 10000,
        },
      );

      logger.info(`QA interaction stored for user: ${userId}`);
    } catch (error) {
      // Non-critical error - log but don't throw
      logger.warn("Failed to store QA interaction:", error.message);
    }
  },

  /**
   * Rate a QA answer
   */
  async rateAnswer(questionId, userId, rating) {
    try {
      if (!["helpful", "not-helpful"].includes(rating)) {
        throw new Error("Rating must be 'helpful' or 'not-helpful'");
      }

      await axios.post(`${AI_SERVICE_URL}/api/v1/qa/rate`, {
        question_id: questionId,
        user_id: userId,
        rating,
      });

      logger.info(`Answer rated: ${rating}`);
    } catch (error) {
      logger.warn("Failed to rate answer:", error.message);
    }
  },

  /**
   * Get recent questions from a user
   */
  async getRecentQuestions(userId, limit = 10) {
    try {
      const response = await axios.get(
        `${AI_SERVICE_URL}/api/v1/qa/user/${userId}/history`,
        {
          params: { limit },
          timeout: 10000,
        },
      );

      return response.data.questions || [];
    } catch (error) {
      logger.warn("Failed to fetch question history:", error.message);
      return [];
    }
  },
};
