import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { validateQuestion } from "../middleware/validation.js";
import axios from "axios";
import { Resource } from "../models/Resource.js";
import { User } from "../models/User.js";
import { logger } from "../config/logger.js";
import { buildResourceContent } from "../services/resourceContent.js";
import { syncResourceToSemanticIndex } from "../controllers/resourceController.js";

const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_QA_BASE_URL = `${AI_SERVICE_URL}/qa`;

// POST /api/qa/ask - Ask a question about a resource
router.post("/ask", authMiddleware, validateQuestion, async (req, res) => {
  try {
    const { question, resourceId, resourceIds } = req.body;
    const userId = req.user.uid;

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
      targetResourceIds = resourceIds;
    } else if (resourceId) {
      targetResourceIds = [resourceId];
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
          question,
          resource_ids: targetResourceIds.map((id) => id.toString()),
        },
        {
          timeout: 45000, // 45 second timeout
        },
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
      await axios.post(`${AI_QA_BASE_URL}/store-interaction`, {
        userId,
        question,
        answer: ragResponse.data.answer,
        sources: ragResponse.data.sources,
        processingTime,
        resourceIds: targetResourceIds,
      });
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
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const history = await axios.get(`${AI_QA_BASE_URL}/user-history`, {
      params: {
        user_id: userId,
        limit,
      },
    });

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
router.post("/rate", authMiddleware, async (req, res) => {
  try {
    const { questionId, rating } = req.body;
    const userId = req.user.uid;

    if (!["helpful", "not-helpful"].includes(rating)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rating. Must be "helpful" or "not-helpful"',
      });
    }

    await axios.post(`${AI_QA_BASE_URL}/rate-answer`, {
      question_id: questionId,
      user_id: userId,
      rating,
    });

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
router.post("/store-interaction", authMiddleware, async (req, res) => {
  try {
    const {
      question,
      answer,
      sources = [],
      processingTime,
      resourceIds = [],
    } = req.body;
    const userId = req.user.uid;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "question and answer are required",
      });
    }

    await axios.post(`${AI_QA_BASE_URL}/store-interaction`, {
      userId,
      question,
      answer,
      sources,
      processingTime: Number(processingTime) || 0,
      resourceIds: Array.isArray(resourceIds) ? resourceIds : [],
    });

    return res.json({ success: true, message: "Interaction stored" });
  } catch (error) {
    logger.warn("Store interaction proxy error:", error.message);
    return res.json({ success: false, message: "Failed to store interaction" });
  }
});

export default router;
