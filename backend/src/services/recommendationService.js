import { Resource } from "../models/Resource.js";
import { UserActivity } from "../models/UserActivity.js";
import { logger } from "../config/logger.js";

export const recommendationService = {
  /**
   * Get personalized recommendations for a user
   * Uses three-rule scoring system
   */
  async getPersonalizedRecommendations(userId, limit = 10, userContext = {}) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Rule 1: User's Top Subjects (Weight: 40%)
      const userTopics = await UserActivity.aggregate([
        {
          $match: {
            userId,
            topicName: { $exists: true, $ne: null },
            timestamp: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: "$topicName",
            count: { $sum: 1 },
            duration: { $sum: "$duration" },
          },
        },
        {
          $sort: { duration: -1 },
        },
        {
          $limit: 5,
        },
      ]);

      const topTopicNames = userTopics.map((t) => t._id);
      logger.info(`Top topics for user: ${topTopicNames.join(", ")}`);

      // Get resources from top topics
      const rule1Resources = await Resource.find({
        subject: { $in: topTopicNames },
      })
        .limit(limit)
        .sort({ createdAt: -1 });

      const rule1Map = new Map();
      rule1Resources.forEach((doc) => {
        rule1Map.set(doc._id.toString(), {
          resource: doc,
          rule1Score: 0.4,
          reason: "Based on your top subjects",
        });
      });

      // Rule 2: Trending in Semester (Weight: 35%)
      const userActivity = await UserActivity.findOne({ userId }).sort({
        timestamp: -1,
      });
      const userSemester =
        userContext.semester || userActivity?.metadata?.semester;

      const trendingResources = await UserActivity.aggregate([
        {
          $match: {
            type: "download",
            timestamp: { $gte: thirtyDaysAgo },
            "metadata.semester": userSemester,
          },
        },
        {
          $group: {
            _id: "$resourceId",
            downloadCount: { $sum: 1 },
          },
        },
        {
          $sort: { downloadCount: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      for (const trend of trendingResources) {
        const resource = await Resource.findById(trend._id);
        if (resource) {
          const key = resource._id.toString();
          if (rule1Map.has(key)) {
            rule1Map.get(key).rule2Score = 0.35;
          } else {
            rule1Map.set(key, {
              resource,
              rule2Score: 0.35,
              reason: "Trending in your semester",
            });
          }
        }
      }

      // Rule 3: Related Topic (Weight: 25%)
      const recentSearches = await UserActivity.find({
        userId,
        type: "search",
      })
        .sort({ timestamp: -1 })
        .limit(5);

      const relatedResources = new Set();
      for (const search of recentSearches) {
        const resources = await Resource.find({
          subject: search.topicName,
        }).limit(limit / 2);

        resources.forEach((r) => relatedResources.add(r._id.toString()));
      }

      for (const resourceId of relatedResources) {
        const resource = await Resource.findById(resourceId);
        if (resource) {
          if (rule1Map.has(resourceId)) {
            rule1Map.get(resourceId).rule3Score = 0.25;
          } else {
            rule1Map.set(resourceId, {
              resource,
              rule3Score: 0.25,
              reason: "Related to your searches",
            });
          }
        }
      }

      // Calculate final scores
      const scored = Array.from(rule1Map.values()).map((item) => ({
        ...item,
        finalScore:
          (item.rule1Score || 0) +
          (item.rule2Score || 0) +
          (item.rule3Score || 0),
      }));

      // Sort by final score
      scored.sort((a, b) => b.finalScore - a.finalScore);

      return scored.slice(0, limit);
    } catch (error) {
      logger.error(
        "Error getting personalized recommendations:",
        error.message,
      );
      throw error;
    }
  },

  /**
   * Get trending resources for a semester
   */
  async getTrendingResources(semester, limit = 10) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const trendingResourceIds = await UserActivity.aggregate([
        {
          $match: {
            type: "download",
            timestamp: { $gte: thirtyDaysAgo },
            "metadata.semester": semester,
          },
        },
        {
          $group: {
            _id: "$resourceId",
            downloadCount: { $sum: 1 },
            views: {
              $sum: {
                $cond: [{ $eq: ["$type", "view"] }, 1, 0],
              },
            },
          },
        },
        {
          $addFields: {
            trendScore: {
              $add: [{ $multiply: ["$downloadCount", 2] }, "$views"],
            },
          },
        },
        {
          $sort: { trendScore: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      const resources = [];
      for (const item of trendingResourceIds) {
        const resource = await Resource.findById(item._id);
        if (resource) {
          resources.push({
            ...resource.toObject(),
            trendScore: item.trendScore,
          });
        }
      }

      return resources;
    } catch (error) {
      logger.error("Error getting trending resources:", error.message);
      throw error;
    }
  },

  /**
   * Get similar resources based on topic
   */
  async getSimilarResources(topic, limit = 10) {
    try {
      const resources = await Resource.find({
        $or: [
          { subject: topic },
          { "tags.name": { $regex: topic, $options: "i" } },
        ],
      })
        .limit(limit)
        .sort({ createdAt: -1 });

      return resources;
    } catch (error) {
      logger.error("Error getting similar resources:", error.message);
      throw error;
    }
  },
};
