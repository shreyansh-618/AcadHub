import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { recommendationService } from "../services/recommendationService.js";
import { User } from "../models/User.js";
import { logger } from "../config/logger.js";

const router = express.Router();

// GET /api/recommendations/for-you - Get personalized recommendations
router.get("/for-you", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = Math.min(parseInt(req.query.limit || 10), 50);

    // Verify user exists
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const recommendations =
      await recommendationService.getPersonalizedRecommendations(
        user._id,
        limit,
        { semester: user.semester, department: user.department },
      );

    return res.status(200).json({
      success: true,
      recommendations: recommendations.map((rec) => ({
        _id: rec.resource._id,
        title: rec.resource.title,
        description: rec.resource.description,
        subject: rec.resource.subject,
        semester: rec.resource.semester,
        category: rec.resource.category,
        downloadCount: rec.resource.downloads || 0,
        tags: rec.resource.tags,
        summary: rec.resource.summary?.substring(0, 200),
        reason: rec.reason,
        score: rec.finalScore,
        createdAt: rec.resource.createdAt,
      })),
    });
  } catch (error) {
    logger.error("Error getting recommendations:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error retrieving recommendations",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/recommendations/trending - Get trending resources
router.get("/trending", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = Math.min(parseInt(req.query.limit || 10), 50);

    // Get user's semester
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const trendingResources = await recommendationService.getTrendingResources(
      user.semester,
      limit,
    );

    return res.status(200).json({
      success: true,
      trending: trendingResources.map((res) => ({
        _id: res._id,
        title: res.title,
        description: res.description,
        subject: res.subject,
        semester: res.semester,
        downloadCount: res.downloads || 0,
        tags: res.tags,
        summary: res.summary?.substring(0, 200),
        trendScore: res.trendScore,
        createdAt: res.createdAt,
      })),
    });
  } catch (error) {
    logger.error("Error getting trending resources:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error retrieving trending resources",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/recommendations/similar/:topic - Get similar resources
router.get("/similar/:topic", authMiddleware, async (req, res) => {
  try {
    const { topic } = req.params;
    const limit = Math.min(parseInt(req.query.limit || 10), 50);

    const similarResources = await recommendationService.getSimilarResources(
      topic,
      limit,
    );

    return res.status(200).json({
      success: true,
      similar: similarResources.map((res) => ({
        _id: res._id,
        title: res.title,
        description: res.description,
        subject: res.subject,
        semester: res.semester,
        tags: res.tags,
        summary: res.summary?.substring(0, 200),
        createdAt: res.createdAt,
      })),
    });
  } catch (error) {
    logger.error("Error getting similar resources:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error retrieving similar resources",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export { router as recommendationsRouter };
