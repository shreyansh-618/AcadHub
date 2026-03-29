import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { UserActivity } from "../models/UserActivity.js";
import { User } from "../models/User.js";
import { logger } from "../config/logger.js";

const router = express.Router();

// POST /api/analytics/track - Track user activity
router.post("/track", authMiddleware, async (req, res) => {
  try {
    const { type, resourceId, topicName, searchQuery, duration, metadata } =
      req.body;
    const userId = req.user.uid;

    if (
      !type ||
      !["view", "download", "search", "discussion", "qa_asked"].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity type",
      });
    }

    // Get firebase user
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Create activity record
    const activity = new UserActivity({
      userId: user._id,
      type,
      resourceId: resourceId || null,
      topicName: topicName || null,
      searchQuery: searchQuery || null,
      duration: duration || 0,
      metadata: {
        semester: metadata?.semester || user.semester,
        department: metadata?.department || user.department,
        subject: metadata?.subject || null,
        category: metadata?.category || null,
        deviceType: metadata?.deviceType || "web",
        userAgent: req.headers["user-agent"] || "unknown",
      },
    });

    await activity.save();

    return res.status(200).json({
      success: true,
      message: "Activity tracked",
      activityId: activity._id,
    });
  } catch (error) {
    logger.error("Error tracking activity:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error tracking activity",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET /api/analytics/user-stats - Get user analytics
router.get("/user-stats", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;

    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Get last 30 days activities
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const stats = await UserActivity.aggregate([
      {
        $match: {
          userId: user._id,
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalDuration: { $sum: "$duration" },
        },
      },
    ]);

    // Get top topics
    const topTopics = await UserActivity.aggregate([
      {
        $match: {
          userId: user._id,
          topicName: { $exists: true, $ne: null },
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: "$topicName",
          count: { $sum: 1 },
          lastViewed: { $max: "$timestamp" },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Get activity trends
    const activityTrends = await UserActivity.aggregate([
      {
        $match: {
          userId: user._id,
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        byType: stats,
        topTopics,
        activityTrends,
      },
    });
  } catch (error) {
    logger.error("Error getting user stats:", error.message);
    return res.status(500).json({
      success: false,
      message: "Error retrieving analytics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export { router as analyticsRouter };
