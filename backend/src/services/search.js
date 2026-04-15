import { logger } from "../config/logger.js";
import { Resource } from "../models/Resource.js";
import { AiProviderUnavailableError, generateEmbedding } from "./ai.service.js";
import { findRelevantChunks } from "./resourceIndex.service.js";

/**
 * Service for semantic search operations
 */

const matchesFilters = (resource, filters = {}) => {
  if (filters.department && resource.department !== filters.department) {
    return false;
  }
  if (filters.subject && resource.subject !== filters.subject) {
    return false;
  }
  if (filters.category && resource.category !== filters.category) {
    return false;
  }
  if (filters.semester && Number(resource.semester) !== Number(filters.semester)) {
    return false;
  }
  return true;
};

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

      const queryEmbedding = await generateEmbedding(query.trim());
      const matches = await findRelevantChunks({
        questionEmbedding: queryEmbedding,
        limit: Math.max((offset + limit) * 8, 25),
        numCandidates: Math.max((offset + limit) * 20, 60),
      });

      const uniqueDocIds = [...new Set(matches.map((match) => String(match.docId)))];
      const resources = await Resource.find({
        _id: { $in: uniqueDocIds },
        isApproved: true,
      }).lean();

      const resourceMap = new Map(resources.map((resource) => [String(resource._id), resource]));
      const rankedResources = [];
      const seen = new Set();

      for (const match of matches) {
        const key = String(match.docId);
        if (seen.has(key)) {
          continue;
        }

        const resource = resourceMap.get(key);
        if (!resource || !matchesFilters(resource, filters)) {
          continue;
        }

        seen.add(key);
        rankedResources.push({
          _id: key,
          title: resource.title,
          description: resource.description || "",
          type: resource.type || "",
          category: resource.category || "",
          department: resource.department || "",
          subject: resource.subject || "",
          score: Number(match.score) || 0,
          semester: resource.semester,
          createdAt: resource.createdAt,
        });
      }

      const paginatedResources = rankedResources.slice(offset, offset + limit);

      return {
        results: paginatedResources,
        total: rankedResources.length,
        page: Math.floor(offset / limit) + 1,
        limit,
        processing_time: 0,
      };
    } catch (error) {
      if (error instanceof AiProviderUnavailableError) {
        logger.warn(`Semantic search fallback mode: ${error.message}`);
      } else {
        logger.error("Error in semanticSearch:", error.message);
      }
      throw new Error(`Search failed: ${error.message}`);
    }
  },

  async indexResource() {
    logger.info("Resource indexing is handled during upload and reindex jobs.");
  },

  async removeResourceIndex() {
    logger.info("Resource de-indexing is handled in resource lifecycle services.");
  },

  async getSuggestions(query, limit = 5) {
    try {
      if (!query || !query.trim()) {
        return [];
      }

      const regex = new RegExp(query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const resources = await Resource.find({
        isApproved: true,
        $or: [
          { title: regex },
          { description: regex },
          { subject: regex },
        ],
      })
        .select("title subject")
        .limit(Math.min(limit, 10))
        .lean();

      return resources.map((resource) => resource.title);
    } catch (error) {
      logger.warn("Failed to get search suggestions:", error.message);
      return [];
    }
  },
};
