import express from "express";
import { validateQuestion } from "../middleware/validation.js";
import { Resource } from "../models/Resource.js";
import { User } from "../models/User.js";
import { QAInteraction } from "../models/QAInteraction.js";
import { UserActivity } from "../models/UserActivity.js";
import { logger } from "../config/logger.js";
import {
  isValidObjectId,
  normalizeString,
  parseBoundedInteger,
} from "../utils/security.js";
import { answerQuestion } from "../services/rag.service.js";

const router = express.Router();

const normalizeResourceIds = (resourceId, resourceIds = []) => {
  if (Array.isArray(resourceIds) && resourceIds.length > 0) {
    return resourceIds.filter((id) => isValidObjectId(id)).slice(0, 10);
  }

  if (resourceId && isValidObjectId(resourceId)) {
    return [resourceId];
  }

  return [];
};

const formatInteraction = (interaction) => ({
  _id: interaction._id,
  question: interaction.question,
  answer: interaction.answer,
  sources: interaction.sources || [],
  resourceIds: interaction.resourceIds || [],
  processingTime: interaction.processingTime || 0,
  confidence: interaction.confidence || 0,
  answerMode: interaction.answerMode || "ai",
  rating: interaction.rating || null,
  createdAt: interaction.createdAt,
});

const handleAnswer = async (req, res) => {
  try {
    const { question, resourceId, resourceIds } = req.body;
    const userUid = req.user.uid;
    const normalizedQuestion = normalizeString(question, { maxLength: 500 });

    const user = await User.findOne({ uid: userUid });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!normalizedQuestion) {
      return res.status(400).json({
        success: false,
        message: "Question must be a non-empty string",
      });
    }

    const targetResourceIds = normalizeResourceIds(resourceId, resourceIds);
    if ((resourceId || resourceIds) && targetResourceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "One or more resource IDs are invalid",
      });
    }

    for (const id of targetResourceIds) {
      const resource = await Resource.findById(id);
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found",
        });
      }
    }

    const result = await answerQuestion({
      question: normalizedQuestion,
      resourceIds: targetResourceIds,
    });

    await UserActivity.create({
      userId: user._id,
      type: "qa_asked",
      resourceId: targetResourceIds[0] || null,
      topicName: targetResourceIds.length > 0 ? "document-qa" : "general-qa",
      searchQuery: normalizedQuestion,
      duration: Math.round((result.processingTime || 0) / 1000),
      metadata: {
        semester: user.semester,
        department: user.department,
        deviceType: "web",
        userAgent: req.headers["user-agent"] || "unknown",
      },
    }).catch((error) => {
      logger.warn(`Failed to track QA activity: ${error.message}`);
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error(`QA answer route ERROR DETAILS:`, {
      message: error.message,
      status: error.status,
      errorName: error.name,
      details: error.details,
      stack: error.stack,
    });
    return res.json({
      success: true,
      data: {
        answer: "AI is temporarily unavailable. Please try again.",
        sources: [],
        confidence: 0,
        processingTime: 0,
        tokensUsed: 0,
        answerMode: "fallback",
        answerLabel: "AI Unavailable",
        sourceCount: 0,
      },
    });
  }
};

router.post("/ask", validateQuestion, handleAnswer);
router.post("/answer", validateQuestion, handleAnswer);

router.get("/history", async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const limit = parseBoundedInteger(req.query.limit, {
      min: 1,
      max: 50,
      fallback: 10,
    });

    const interactions = await QAInteraction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: interactions.map(formatInteraction),
    });
  } catch (error) {
    logger.error(`Failed to retrieve QA history: ${error.message}`);
    return res.json({
      success: true,
      data: [],
    });
  }
});

router.post("/rate", async (req, res) => {
  try {
    const { questionId, rating } = req.body;
    if (!["helpful", "not-helpful"].includes(rating)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rating. Must be "helpful" or "not-helpful"',
      });
    }

    if (!isValidObjectId(questionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid interaction ID",
      });
    }

    const user = await User.findOne({ uid: req.user.uid });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    await QAInteraction.findOneAndUpdate(
      { _id: questionId, userId: user._id },
      { $set: { rating } },
      { new: true },
    );

    return res.json({
      success: true,
      message: "Rating submitted",
    });
  } catch (error) {
    logger.error(`Failed to submit QA rating: ${error.message}`);
    return res.json({
      success: false,
      message: "Failed to submit rating",
    });
  }
});

router.post("/store-interaction", async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const normalizedQuestion = normalizeString(req.body.question, {
      maxLength: 500,
    });
    const normalizedAnswer = normalizeString(req.body.answer, {
      maxLength: 12000,
    });

    if (!normalizedQuestion || !normalizedAnswer) {
      return res.status(400).json({
        success: false,
        message: "question and answer are required",
      });
    }

    const interaction = await QAInteraction.create({
      userId: user._id,
      question: normalizedQuestion,
      answer: normalizedAnswer,
      sources: Array.isArray(req.body.sources)
        ? req.body.sources.slice(0, 5).map((source) => ({
            docId: isValidObjectId(source?.docId) ? source.docId : undefined,
            title: normalizeString(source?.title, { maxLength: 200 }),
            snippet: normalizeString(source?.snippet, { maxLength: 1500 }),
            score: Number(source?.score) || 0,
            chunkIndex: Number(source?.chunkIndex) || 0,
          }))
        : [],
      resourceIds: Array.isArray(req.body.resourceIds)
        ? req.body.resourceIds.filter((id) => isValidObjectId(id)).slice(0, 10)
        : [],
      processingTime: Number(req.body.processingTime) || 0,
      confidence: Number(req.body.confidence) || 0,
      answerMode:
        normalizeString(req.body.answerMode, {
          maxLength: 50,
        }) || "ai",
    });

    return res.json({
      success: true,
      message: "Interaction stored",
      data: formatInteraction(interaction),
    });
  } catch (error) {
    logger.warn(`Failed to store QA interaction: ${error.message}`);
    return res.json({
      success: false,
      message: "Failed to store interaction",
    });
  }
});

export default router;
