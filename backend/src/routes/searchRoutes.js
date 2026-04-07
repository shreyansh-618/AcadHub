import express from "express";
import { logger } from "../config/logger.js";
import { Resource } from "../models/Resource.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { escapeRegex, normalizeString, parseBoundedInteger } from "../utils/security.js";

const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

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

  return fallbackDocs.map((doc) => ({
    _id: String(doc._id),
    title: doc.title,
    description: doc.description || "",
    type: doc.type || "",
    category: doc.category || "",
    department: doc.department || "",
    subject: doc.subject || "",
    score: 0.5,
    semester: doc.semester,
    createdAt: doc.createdAt,
  }));
};

const performSemanticSearch = async (req, res) => {
  try {
    const { query, filters, limit = 10 } = req.body;
    const normalizedQuery = normalizeString(query, { maxLength: 500 });
    const normalizedLimit = parseBoundedInteger(limit, {
      min: 1,
      max: 25,
      fallback: 10,
    });

    if (!normalizedQuery) {
      return res.status(400).json({
        code: "INVALID_INPUT",
        message: "Search query is required",
      });
    }

    // Clean up filters — remove empty string values
    const cleanFilters = {};
    if (filters) {
      if (filters.department && filters.department.trim()) {
        cleanFilters.department = normalizeString(filters.department, { maxLength: 100 });
      }
      if (filters.subject && filters.subject.trim()) {
        cleanFilters.subject = normalizeString(filters.subject, { maxLength: 100 });
      }
      if (filters.category && filters.category.trim()) {
        cleanFilters.category = normalizeString(filters.category, { maxLength: 50 });
      }
      if (filters.semester) {
        cleanFilters.semester = parseBoundedInteger(filters.semester, {
          min: 1,
          max: 12,
          fallback: undefined,
        });
      }
    }

    // Forward request to the AI service
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/search/semantic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: normalizedQuery,
        limit: normalizedLimit,
        offset: 0,
        filters: Object.keys(cleanFilters).length > 0 ? cleanFilters : null,
      }),
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      logger.error("AI service search error:", errorData);
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

    const aiData = await aiResponse.json();

    // Transform AI service response format to what the frontend expects
    // AI service returns: { results: [{ id, title, description, score, ... }], total, ... }
    // Frontend expects: { data: { resources: [{ _id, title, description, ... }] } }
    let resources = (aiData.results || []).map((result) => ({
      _id: result.id,
      title: result.title,
      description: result.description || "",
      type: result.resource_type || "",
      category: result.category || "",
      department: result.department || "",
      subject: result.subject || "",
      score: result.score,
      semester: result.semester,
      createdAt: result.created_at,
    }));
    let usedFallback = false;

    // Safety fallback:
    // If AI service returns zero materialized resources, fall back to DB text search.
    // This keeps UX working when embeddings are stale or ID formats mismatch.
    if (resources.length === 0) {
      resources = await fallbackSearch({
        query: normalizedQuery,
        cleanFilters,
        limit: normalizedLimit,
      });
      usedFallback = true;
    }

    res.json({
      code: "SUCCESS",
      data: {
        resources,
        total: usedFallback
          ? resources.length
          : aiData.total || resources.length,
        processingTime: aiData.processing_time,
      },
    });
  } catch (error) {
    logger.error("Search proxy error:", error);
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
    res.json({
      code: "SUCCESS",
      data: {
        resources,
        total: resources.length,
        processingTime: 0,
      },
    });
  }
};

/**
 * @route   POST /api/v1/search
 * @desc    Root search endpoint - delegates to semantic search
 * @access  Public
 */
router.post("/", performSemanticSearch);

/**
 * @route   POST /api/v1/search/semantic
 * @desc    Proxy semantic search requests to the AI service
 * @access  Public
 */
router.post("/semantic", performSemanticSearch);

/**
 * @route   POST /api/v1/search/index-all
 * @desc    Trigger bulk indexing of all existing resources in the AI service
 * @access  Private (admin only)
 */
router.post("/index-all", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const aiResponse = await fetch(
      `${AI_SERVICE_URL}/api/v1/search/index-all`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(aiResponse.status).json({
        code: "INDEX_ERROR",
        message: errorData.detail || "Indexing failed",
      });
    }

    const data = await aiResponse.json();
    res.json({
      code: "SUCCESS",
      data,
    });
  } catch (error) {
    logger.error("Index-all proxy error:", error);
    res.status(500).json({
      code: "INDEX_ERROR",
      message: error.message || "Bulk indexing failed",
    });
  }
});

export default router;
