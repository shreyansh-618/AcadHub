import express from "express";
import { logger } from "../config/logger.js";

const router = express.Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * @route   POST /api/v1/search/semantic
 * @desc    Proxy semantic search requests to the AI service
 * @access  Public
 */
router.post("/semantic", async (req, res) => {
  try {
    const { query, filters, limit = 10 } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({
        code: "INVALID_INPUT",
        message: "Search query is required",
      });
    }

    // Clean up filters — remove empty string values
    const cleanFilters = {};
    if (filters) {
      if (filters.department && filters.department.trim()) {
        cleanFilters.department = filters.department;
      }
      if (filters.subject && filters.subject.trim()) {
        cleanFilters.subject = filters.subject;
      }
      if (filters.category && filters.category.trim()) {
        cleanFilters.category = filters.category;
      }
      if (filters.semester) {
        cleanFilters.semester = filters.semester;
      }
    }

    // Forward request to the AI service
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/search/semantic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        limit,
        offset: 0,
        filters: Object.keys(cleanFilters).length > 0 ? cleanFilters : null,
      }),
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      logger.error("AI service search error:", errorData);
      return res.status(aiResponse.status).json({
        code: "SEARCH_ERROR",
        message: errorData.detail || "Search service unavailable",
      });
    }

    const aiData = await aiResponse.json();

    // Transform AI service response format to what the frontend expects
    // AI service returns: { results: [{ id, title, description, score, ... }], total, ... }
    // Frontend expects: { data: { resources: [{ _id, title, description, ... }] } }
    const resources = (aiData.results || []).map((result) => ({
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

    res.json({
      code: "SUCCESS",
      data: {
        resources,
        total: aiData.total || resources.length,
        processingTime: aiData.processing_time,
      },
    });
  } catch (error) {
    logger.error("Search proxy error:", error);
    res.status(500).json({
      code: "SEARCH_ERROR",
      message: error.message || "Search failed",
    });
  }
});

/**
 * @route   POST /api/v1/search/index-all
 * @desc    Trigger bulk indexing of all existing resources in the AI service
 * @access  Public
 */
router.post("/index-all", async (req, res) => {
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
