import express from "express";
import { validateQuestion } from "../middleware/validation.js";
import axios from "axios";
import { Resource } from "../models/Resource.js";
import { User } from "../models/User.js";
import { logger } from "../config/logger.js";
import { buildResourceContent } from "../services/resourceContent.js";
import { syncResourceToSemanticIndex } from "../controllers/resourceController.js";
import {
  isValidObjectId,
  normalizeString,
  parseBoundedInteger,
} from "../utils/security.js";
import {
  AI_SERVICE_URL,
  getAiServiceAxiosConfig,
} from "../utils/aiService.js";

const router = express.Router();
const AI_QA_BASE_URL = `${AI_SERVICE_URL}/qa`;

// POST /api/qa/ask - Ask a question about a resource
router.post("/ask", validateQuestion, async (req, res) => {
  try {
    const { question, resourceId, resourceIds } = req.body;
    const userId = req.user.uid;
    const normalizedQuestion = normalizeString(question, { maxLength: 500 });

    // Verify user exists
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    // Get resource IDs to search (if specific resource, use that; otherwise search all)
    let targetResourceIds = [];
    if (Array.isArray(resourceIds) && resourceIds.length > 0) {
      targetResourceIds = resourceIds.filter((id) => isValidObjectId(id)).slice(0, 10);
    } else if (resourceId) {
      targetResourceIds = isValidObjectId(resourceId) ? [resourceId] : [];
    }

    if (!normalizedQuestion) {
      return res.status(400).json({
        success: false,
        message: "Question must be a non-empty string",
      });
    }

    if ((resourceId || resourceIds) && targetResourceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "One or more resource IDs are invalid",
      });
    }

    if (targetResourceIds.length > 0) {
      for (const id of targetResourceIds) {
        const resource = await Resource.findById(id);
        if (!resource) {
          return res
            .status(404)
            .json({ success: false, message: "Resource not found" });
        }

        // Ensure selected resources have meaningful extracted text and a fresh index.
        try {
          let extractedContent = (resource.extractedContent || "").trim();
          if (!extractedContent || extractedContent.length < 40) {
            extractedContent = await buildResourceContent(resource);
            if (extractedContent) {
              resource.extractedContent = extractedContent;
              await resource.save();
            }
          }

          if (extractedContent) {
            await syncResourceToSemanticIndex(resource, extractedContent);
          }
        } catch (indexError) {
          logger.warn(
            `Pre-QA reindex skipped for resource ${resource._id}: ${indexError.message}`,
          );
        }
      }
    }

    // Call AI Service RAG endpoint
    const startTime = Date.now();
    let ragResponse;

    try {
      ragResponse = await axios.post(
        `${AI_QA_BASE_URL}/answer`,
        {
          question: normalizedQuestion,
          resource_ids: targetResourceIds.map((id) => id.toString()),
        },
        getAiServiceAxiosConfig({
          timeout: 45000, // 45 second timeout
        }),
      );
    } catch (error) {
      logger.error("AI Service error:", error.message);

      if (error.code === "ECONNREFUSED") {
        return res.status(503).json({
          success: false,
          message: "AI Service unavailable. Please try again later.",
        });
      }

      if (error.response?.status === 429) {
        return res.status(429).json({
          success: false,
          message:
            "Rate limit exceeded. Please wait before asking another question.",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Error generating answer. Please try again.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }

    const processingTime = Date.now() - startTime;

    // Store QA interaction in database
    try {
      await axios.post(
        `${AI_QA_BASE_URL}/store-interaction`,
        {
          userId,
          question: normalizedQuestion,
          answer: ragResponse.data.answer,
          sources: ragResponse.data.sources,
          processingTime,
          resourceIds: targetResourceIds,
        },
        getAiServiceAxiosConfig(),
      );
    } catch (error) {
      logger.warn("Failed to store QA interaction:", error.message);
      // Don't fail the request if storage fails
    }

    res.json({
      success: true,
      data: {
        answer: ragResponse.data.answer,
        sources: ragResponse.data.sources || [],
        confidence: ragResponse.data.confidence || 0,
        processingTime,
        tokensUsed: ragResponse.data.tokens_used || 0,
        answerMode: ragResponse.data.answer_mode || "ai",
        answerLabel: ragResponse.data.answer_label || "AI Answer",
        sourceCount:
          ragResponse.data.source_count ||
          (ragResponse.data.sources || []).length ||
          0,
      },
    });
  } catch (error) {
    logger.error("QA endpoint error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/qa/history - Get user's question history
router.get("/history", async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = parseBoundedInteger(req.query.limit, {
      min: 1,
      max: 50,
      fallback: 10,
    });

    const history = await axios.get(
      `${AI_QA_BASE_URL}/user-history`,
      getAiServiceAxiosConfig({
        params: {
          user_id: userId,
          limit,
        },
      }),
    );

    res.json({
      success: true,
      data: history.data.interactions || [],
    });
  } catch (error) {
    logger.error("Get history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve history",
    });
  }
});

// POST /api/qa/rate - Rate an answer
router.post("/rate", async (req, res) => {
  try {
    const { questionId, rating } = req.body;
    const userId = req.user.uid;

    if (!["helpful", "not-helpful"].includes(rating)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rating. Must be "helpful" or "not-helpful"',
      });
    }

    await axios.post(
      `${AI_QA_BASE_URL}/rate-answer`,
      {
        question_id: questionId,
        user_id: userId,
        rating,
      },
      getAiServiceAxiosConfig(),
    );

    res.json({
      success: true,
      message: "Rating submitted",
    });
  } catch (error) {
    logger.error("Rate answer error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit rating",
    });
  }
});

// POST /api/qa/store-interaction - store interaction (non-critical)
router.post("/store-interaction", async (req, res) => {
  try {
    const {
      question,
      answer,
      sources = [],
      processingTime,
      resourceIds = [],
    } = req.body;
    const userId = req.user.uid;
    const normalizedQuestion = normalizeString(question, { maxLength: 500 });
    const normalizedAnswer = normalizeString(answer, { maxLength: 10000 });

    if (!normalizedQuestion || !normalizedAnswer) {
      return res.status(400).json({
        success: false,
        message: "question and answer are required",
      });
    }

    await axios.post(
      `${AI_QA_BASE_URL}/store-interaction`,
      {
        userId,
        question: normalizedQuestion,
        answer: normalizedAnswer,
        sources,
        processingTime: Number(processingTime) || 0,
        resourceIds: Array.isArray(resourceIds)
          ? resourceIds.filter((id) => isValidObjectId(id)).slice(0, 10)
          : [],
      },
      getAiServiceAxiosConfig(),
    );

    return res.json({ success: true, message: "Interaction stored" });
  } catch (error) {
    logger.warn("Store interaction proxy error:", error.message);
    return res.json({ success: false, message: "Failed to store interaction" });
  }
});

export default router;
