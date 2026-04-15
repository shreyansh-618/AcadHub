import express from "express";
import { logger } from "../config/logger.js";
import { Resource } from "../models/Resource.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { escapeRegex, normalizeString, parseBoundedInteger } from "../utils/security.js";
import { searchService } from "../services/search.js";
import {
  reindexAllResources,
  reindexPendingResources,
} from "../services/resourceIndex.service.js";

const router = express.Router();

const fallbackSearch = async ({ query, cleanFilters, limit }) => {
  const dbFilter = { isApproved: true };
  if (cleanFilters.department) dbFilter.department = cleanFilters.department;
  if (cleanFilters.subject) dbFilter.subject = cleanFilters.subject;
  if (cleanFilters.category) dbFilter.category = cleanFilters.category;
  if (cleanFilters.semester) dbFilter.semester = cleanFilters.semester;

  const keywordRegex = new RegExp(escapeRegex(query.trim()), "i");
  const fallbackDocs = await Resource.find({
    ...dbFilter,
    $or: [
      { title: keywordRegex },
      { description: keywordRegex },
      { subject: keywordRegex },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const terms = normalizeString(query, { maxLength: 500 })
    .toLowerCase()
    .match(/[a-z0-9]{3,}/g) || [];

  return fallbackDocs
    .map((doc) => {
      const title = String(doc.title || "").toLowerCase();
      const description = String(doc.description || "").toLowerCase();
      const subject = String(doc.subject || "").toLowerCase();

      let score = 0;
      for (const term of terms) {
        score += (title.split(term).length - 1) * 5;
        score += (subject.split(term).length - 1) * 3;
        score += Math.min(description.split(term).length - 1, 4);
      }

      return {
        _id: String(doc._id),
        title: doc.title,
        description: doc.description || "",
        type: doc.type || "",
        category: doc.category || "",
        department: doc.department || "",
        subject: doc.subject || "",
        score: Math.min(1, score / Math.max(terms.length * 5, 1)),
        semester: doc.semester,
        createdAt: doc.createdAt,
      };
    })
    .sort((left, right) => right.score - left.score);
};

const performSemanticSearch = async (req, res) => {
  try {
    const { query, filters, limit = 10, offset = 0 } = req.body;
    const normalizedQuery = normalizeString(query, { maxLength: 500 });
    const normalizedLimit = parseBoundedInteger(limit, {
      min: 1,
      max: 25,
      fallback: 10,
    });
    const normalizedOffset = parseBoundedInteger(offset, {
      min: 0,
      max: 1000,
      fallback: 0,
    });

    if (!normalizedQuery) {
      return res.status(400).json({
        code: "INVALID_INPUT",
        message: "Search query is required",
      });
    }

    const cleanFilters = {};
    if (filters?.department?.trim()) {
      cleanFilters.department = normalizeString(filters.department, { maxLength: 100 });
    }
    if (filters?.subject?.trim()) {
      cleanFilters.subject = normalizeString(filters.subject, { maxLength: 100 });
    }
    if (filters?.category?.trim()) {
      cleanFilters.category = normalizeString(filters.category, { maxLength: 50 });
    }
    if (filters?.semester) {
      cleanFilters.semester = parseBoundedInteger(filters.semester, {
        min: 1,
        max: 12,
        fallback: undefined,
      });
    }

    const results = await searchService.semanticSearch(
      normalizedQuery,
      cleanFilters,
      normalizedLimit,
      normalizedOffset,
    );

    if ((results.results || []).length === 0) {
      const resources = await fallbackSearch({
        query: normalizedQuery,
        cleanFilters,
        limit: normalizedLimit,
      });

      return res.json({
        code: "SUCCESS",
        data: {
          resources,
          total: resources.length,
          processingTime: 0,
        },
      });
    }

    return res.json({
      code: "SUCCESS",
      data: {
        resources: results.results,
        total: results.total || results.results.length,
        processingTime: results.processing_time || 0,
      },
    });
  } catch (error) {
    logger.error(`Semantic search failed: ${error.message}`);
    const { query = "", filters, limit = 10 } = req.body || {};
    const cleanFilters = {};
    if (filters?.department) cleanFilters.department = normalizeString(filters.department, { maxLength: 100 });
    if (filters?.subject) cleanFilters.subject = normalizeString(filters.subject, { maxLength: 100 });
    if (filters?.category) cleanFilters.category = normalizeString(filters.category, { maxLength: 50 });
    if (filters?.semester) {
      cleanFilters.semester = parseBoundedInteger(filters.semester, {
        min: 1,
        max: 12,
        fallback: undefined,
      });
    }

    const resources = await fallbackSearch({
      query: normalizeString(query, { maxLength: 500 }),
      cleanFilters,
      limit: parseBoundedInteger(limit, { min: 1, max: 25, fallback: 10 }),
    });

    return res.json({
      code: "SUCCESS",
      data: {
        resources,
        total: resources.length,
        processingTime: 0,
      },
    });
  }
};

router.post("/", performSemanticSearch);
router.post("/semantic", performSemanticSearch);

router.post("/index-all", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const data = await reindexAllResources();
    return res.json({
      code: "SUCCESS",
      data,
    });
  } catch (error) {
    logger.error(`Index-all failed: ${error.message}`);
    return res.status(500).json({
      code: "INDEX_ERROR",
      message: error.message || "Bulk indexing failed",
    });
  }
});

router.post(
  "/reprocess-pending",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const limit = parseBoundedInteger(req.body?.limit, {
        min: 1,
        max: 100,
        fallback: 25,
      });
      const data = await reindexPendingResources({ limit });
      return res.json({
        code: "SUCCESS",
        data,
      });
    } catch (error) {
      logger.error(`Pending reprocess failed: ${error.message}`);
      return res.status(500).json({
        code: "INDEX_ERROR",
        message: error.message || "Pending reprocess failed",
      });
    }
  },
);

export default router;
