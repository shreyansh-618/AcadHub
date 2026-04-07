/**
 * QA Service - Handles all Question Answering API calls
 */

import axios from "axios";

// Use the backend API which will forward to AI service
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

const qaClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token interceptor
qaClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Ask a question and get an AI-generated answer
 * @param {string} question - The question to ask
 * @param {string[]} [resourceIds] - Optional specific resource IDs to search
 * @returns {Promise<Object>} Answer with sources and metadata
 */
export const askQuestion = async (question, resourceIds = []) => {
  try {
    const response = await qaClient.post("/api/v1/qa/ask", {
      question,
      resourceIds,
    });
    return response.data?.data || response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get user's question history
 * @param {number} [limit=10] - Maximum number of interactions to retrieve
 * @returns {Promise<Array>} Array of past QA interactions
 */
export const getUserQAHistory = async (limit = 10) => {
  try {
    const response = await qaClient.get("/api/v1/qa/history", {
      params: { limit: Math.min(limit, 50) },
    });
    return response.data?.data || response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Submit rating for an answer
 * @param {string} interactionId - The interaction/question ID
 * @param {string} rating - 'helpful' or 'not-helpful'
 * @returns {Promise<Object>} Success response
 */
export const rateAnswer = async (interactionId, rating) => {
  try {
    const response = await qaClient.post("/api/v1/qa/rate", {
      questionId: interactionId,
      rating,
    });
    return response.data?.data || response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Store a QA interaction (called after answer is displayed)
 * @param {Object} interaction - Interaction data
 * @returns {Promise<Object>} Success response
 */
export const storeInteraction = async (interaction) => {
  try {
    const response = await qaClient.post("/api/v1/qa/store-interaction", {
      userId: interaction.userId,
      question: interaction.question,
      answer: interaction.answer,
      sources: interaction.sources,
      processingTime: interaction.processingTime,
      resourceIds: interaction.resourceIds || [],
    });
    return response.data;
  } catch (error) {
    // Non-critical - don't throw
    console.warn("Failed to store interaction:", error);
    return null;
  }
};

export const qaService = {
  askQuestion,
  getUserQAHistory,
  rateAnswer,
  storeInteraction,
};

export default qaService;
