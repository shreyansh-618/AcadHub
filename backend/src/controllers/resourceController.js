import { Resource } from "../models/Resource.js";
import { logger } from "../config/logger.js";
import { Readable } from "node:stream";
import {
  getGridFS,
  getUploadsFilesCollection,
} from "../config/database.js";
import { buildResourceContent } from "../services/resourceContent.js";
import {
  normalizeOptionalString,
  normalizeString,
  parseBoundedInteger,
  safeJsonError,
  sanitizeFilename,
} from "../utils/security.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

const ensureGridFsFileExists = async (fileId) => {
  const filesCollection = getUploadsFilesCollection();

  if (!fileId) {
    return false;
  }

  const fileDoc = await filesCollection.findOne({ _id: fileId });
  return Boolean(fileDoc);
};

const enrichResourceWithDocumentIntelligence = async (resource, textForAI) => {
  try {
    if (!textForAI) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const [summaryResp, tagsResp] = await Promise.allSettled([
      fetch(`${AI_SERVICE_URL}/document-intelligence/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          text: textForAI,
          max_length: 180,
          min_length: 60,
        }),
      }),
      fetch(`${AI_SERVICE_URL}/document-intelligence/tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          text: textForAI,
          top_k: 5,
        }),
      }),
    ]);

    clearTimeout(timeoutId);

    let summary = null;
    let tags = [];

    if (summaryResp.status === "fulfilled" && summaryResp.value.ok) {
      const payload = await summaryResp.value.json();
      summary = payload.summary || null;
    }

    if (tagsResp.status === "fulfilled" && tagsResp.value.ok) {
      const payload = await tagsResp.value.json();
      tags = Array.isArray(payload.tags)
        ? payload.tags.map((tag) => ({
            name: tag.name || tag.alias || "topic",
            confidence: Number(tag.confidence) || 0,
          }))
        : [];
    }

    if (summary || tags.length > 0) {
      await Resource.findByIdAndUpdate(resource._id, {
        $set: {
          summary,
          tags,
          processingStatus: "indexed",
        },
      });
      logger.info(`Document intelligence updated for resource: ${resource._id}`);
    }
  } catch (error) {
    logger.warn(
      `Document intelligence skipped for resource ${resource._id}: ${error.message}`,
    );
  }
};

export const syncResourceToSemanticIndex = async (resource, indexableContent = "") => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const content =
      indexableContent ||
      resource.extractedContent ||
      `${resource.title} ${resource.description || ""}`.trim();

    const payload = {
      resource_id: resource._id.toString(),
      title: resource.title,
      description: resource.description || "",
      content,
      department: resource.department || "",
      subject: resource.subject || "",
      category: resource.category || "",
      semester: resource.semester ?? null,
    };

    const response = await fetch(`${AI_SERVICE_URL}/api/v1/search/index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      logger.warn(
        `AI indexing failed for resource ${resource._id}: ${response.status} ${errorBody}`,
      );
      return;
    }

    logger.info(`AI index synced for resource: ${resource._id}`);
  } catch (error) {
    logger.warn(`AI indexing skipped for resource ${resource._id}: ${error.message}`);
  }
};

const removeResourceFromSemanticIndex = async (resourceId) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `${AI_SERVICE_URL}/api/v1/search/index/${resourceId}`,
      {
        method: "DELETE",
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      logger.warn(
        `AI de-index failed for resource ${resourceId}: ${response.status} ${errorBody}`,
      );
      return;
    }

    logger.info(`AI index removed for resource: ${resourceId}`);
  } catch (error) {
    logger.warn(`AI de-index skipped for resource ${resourceId}: ${error.message}`);
  }
};

const normalizeGeneratedTags = (tags = []) =>
  (Array.isArray(tags) ? tags : [])
    .map((tag) => {
      if (typeof tag === "string") {
        return { name: tag.trim(), confidence: 1 };
      }

      if (!tag?.name) {
        return null;
      }

      return {
        name: String(tag.name).trim(),
        confidence: Number(tag.confidence) || 0,
      };
    })
    .filter((tag) => tag?.name)
    .slice(0, 10);

/**
 * Upload a new resource
 */
export const uploadResource = async (req, res) => {
  try {
    const user = req.user;
    const { title, description, category, subject, semester, academicYear } =
      req.body;
    const normalizedTitle = normalizeString(title, { maxLength: 200 });
    const normalizedDescription = normalizeString(description, { maxLength: 2000 });
    const normalizedSubject = normalizeString(subject, { maxLength: 100 });
    const normalizedAcademicYear =
      normalizeOptionalString(academicYear, { maxLength: 20 }) ||
      new Date().getFullYear().toString();
    const normalizedSemester = parseBoundedInteger(semester, {
      min: 1,
      max: 12,
      fallback: null,
    });
    const allowedCategories = new Set([
      "lecture-notes",
      "textbooks",
      "question-papers",
      "assignments",
      "other",
    ]);

    if (!user || !user._id) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "You must be logged in to upload",
      });
    }

    if (
      !normalizedTitle ||
      !allowedCategories.has(category) ||
      !normalizedSubject ||
      normalizedSemester == null
    ) {
      return res.status(400).json({
        code: "INVALID_INPUT",
        message:
          "Invalid upload fields. Title, category, subject, and semester are required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        code: "NO_FILE",
        message: "No file uploaded",
      });
    }

    // Determine file type from extension
    const fileExt = req.file.originalname.split(".").pop().toLowerCase();
    const typeMapping = {
      pdf: "pdf",
      doc: "doc",
      docx: "docx",
      pptx: "pptx",
      txt: "txt",
      jpg: "image",
      jpeg: "image",
      png: "image",
      gif: "image",
      webp: "image",
    };
    const fileType = typeMapping[fileExt];

    if (!fileType) {
      return res.status(400).json({
        code: "INVALID_FILE_TYPE",
        message: "Unsupported file type",
      });
    }

    const safeFileName = sanitizeFilename(req.file.originalname || "resource");

    // Get GridFS instance
    const gfs = getGridFS();

    const writestream = gfs.openUploadStream(safeFileName, {
      metadata: {
        uploadedBy: user._id,
        uploadedByName: user.name,
        uploadDate: new Date(),
      },
    });

    const fileId = await new Promise((resolve, reject) => {
      Readable.from(req.file.buffer)
        .pipe(writestream)
        .on("error", reject)
        .on("finish", () => resolve(writestream.id));
    });

    const extractedContent = await buildResourceContent(
      {
        title: normalizedTitle,
        description: normalizedDescription,
        fileName: safeFileName,
      },
      req.file.buffer,
    );

    // Create resource with GridFS file information
    const resource = await Resource.create({
      title: normalizedTitle,
      description: normalizedDescription || "",
      category,
      subject: normalizedSubject,
      semester: normalizedSemester,
      academicYear: normalizedAcademicYear,
      type: fileType,
      department: user.department || "Computer Science",
      uploadedBy: user._id,
      uploadedByName: user.name,
      fileId, // GridFS file ID
      fileName: safeFileName,
      fileSize: req.file.size,
      extractedContent,
      isApproved: true, // Auto-approve uploads
    });

    // Fire-and-forget enrichment to keep uploads responsive.
    void enrichResourceWithDocumentIntelligence(resource, extractedContent);

    // Fire-and-forget AI indexing so uploads stay fast even if AI service is down.
    void syncResourceToSemanticIndex(resource, extractedContent);

    res.status(201).json({
      code: "RESOURCE_CREATED",
      message: "Resource uploaded successfully",
      data: { resource },
    });
  } catch (error) {
    logger.error("Upload resource error:", error);
    return safeJsonError(res, 500, "UPLOAD_ERROR", "Failed to upload resource", error);
  }
};

/**
 * Get all resources (with filtering and pagination)
 */
export const getResources = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, department, subject } = req.query;
    const safePage = parseBoundedInteger(page, { min: 1, max: 10000, fallback: 1 });
    const safeLimit = parseBoundedInteger(limit, { min: 1, max: 50, fallback: 10 });

    const filter = { isApproved: true };
    if (category) filter.category = normalizeString(category, { maxLength: 50 });
    if (department) filter.department = normalizeString(department, { maxLength: 100 });
    if (subject) filter.subject = normalizeString(subject, { maxLength: 100 });

    const skip = (safePage - 1) * safeLimit;

    const resources = await Resource.find(filter)
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit);

    const total = await Resource.countDocuments(filter);

    res.json({
      code: "SUCCESS",
      data: {
        resources,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
      },
    });
  } catch (error) {
    logger.error("Get resources error:", error);
    return safeJsonError(res, 500, "FETCH_ERROR", "Failed to fetch resources", error);
  }
};

/**
 * Get user's uploaded resources
 */
export const getUserResources = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "User must be authenticated",
      });
    }

    const resources = await Resource.find({ uploadedBy: user._id }).sort({
      createdAt: -1,
    });

    res.json({
      code: "SUCCESS",
      data: { resources },
    });
  } catch (error) {
    logger.error("Get user resources error:", error);
    return safeJsonError(res, 500, "FETCH_ERROR", "Failed to fetch resources", error);
  }
};

/**
 * Get user's liked resources
 */
export const getUserLikedResources = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "User must be authenticated",
      });
    }

    const resources = await Resource.find({
      likedBy: user._id,
      isApproved: true,
    })
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      code: "SUCCESS",
      data: { resources },
    });
  } catch (error) {
    logger.error("Get liked resources error:", error);
    return safeJsonError(
      res,
      500,
      "FETCH_ERROR",
      "Failed to fetch liked resources",
      error,
    );
  }
};

/**
 * Get resource by ID
 */
export const getResourceById = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await Resource.findById(id).populate(
      "uploadedBy",
      "name email avatar bio department",
    );

    if (!resource) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: "Resource not found",
      });
    }

    // Increment downloads
    await Resource.findByIdAndUpdate(id, { $inc: { downloads: 1 } });

    res.json({
      code: "SUCCESS",
      data: { resource },
    });
  } catch (error) {
    logger.error("Get resource error:", error);
    return safeJsonError(res, 500, "FETCH_ERROR", "Failed to fetch resource", error);
  }
};

export const generateResourceSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await Resource.findById(id);

    if (!resource) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: "Resource not found",
      });
    }

    const extractedContent =
      (resource.extractedContent || "").trim() || (await buildResourceContent(resource));

    if (!extractedContent) {
      return res.status(400).json({
        code: "NO_CONTENT",
        message: "No extracted content available for summarization",
      });
    }

    const response = await fetch(`${AI_SERVICE_URL}/document-intelligence/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: extractedContent,
        max_length: 180,
        min_length: 60,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return res.status(502).json({
        code: "SUMMARY_FAILED",
        message: `Failed to generate summary${errorBody ? `: ${errorBody}` : ""}`,
      });
    }

    const payload = await response.json();
    resource.summary = payload.summary || resource.summary;
    resource.extractedContent = extractedContent;
    resource.processingStatus = "indexed";
    await resource.save();

    return res.json({
      code: "SUCCESS",
      data: {
        summary: resource.summary,
        keyPoints: payload.keyPoints || [],
        processingTime: payload.processingTime || 0,
      },
    });
  } catch (error) {
    logger.error("Generate summary error:", error);
    return safeJsonError(res, 500, "SUMMARY_ERROR", "Failed to generate summary", error);
  }
};

export const updateResourceTags = async (req, res) => {
  try {
    const { id } = req.params;
    const inputTags = normalizeGeneratedTags(req.body?.tags);
    const resource = await Resource.findById(id);

    if (!resource) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: "Resource not found",
      });
    }

    if (
      resource.uploadedBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        code: "FORBIDDEN",
        message: "You do not have permission to update tags for this resource",
      });
    }

    if (!inputTags.length) {
      return res.status(400).json({
        code: "INVALID_TAGS",
        message: "Provide at least one valid tag",
      });
    }

    const updatedResource = await Resource.findByIdAndUpdate(
      id,
      {
        $set: {
          tags: inputTags,
          processingStatus: "indexed",
        },
      },
      { new: true },
    );

    return res.json({
      code: "SUCCESS",
      data: {
        tags: updatedResource.tags,
      },
    });
  } catch (error) {
    logger.error("Update tags error:", error);
    return safeJsonError(
      res,
      500,
      "TAG_UPDATE_ERROR",
      "Failed to update tags",
      error,
    );
  }
};

/**
 * Like a resource
 */
export const likeResource = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user || !user._id) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "User must be authenticated",
      });
    }

    const resource = await Resource.findById(id);
    if (!resource) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: "Resource not found",
      });
    }

    const hasLiked = resource.likedBy.includes(user._id);

    if (hasLiked) {
      // Unlike
      await Resource.findByIdAndUpdate(
        id,
        {
          $pull: { likedBy: user._id },
          $inc: { likes: -1 },
        },
        { new: true },
      );
    } else {
      // Like
      await Resource.findByIdAndUpdate(
        id,
        {
          $push: { likedBy: user._id },
          $inc: { likes: 1 },
        },
        { new: true },
      );
    }

    res.json({
      code: "SUCCESS",
      message: hasLiked ? "Resource unliked" : "Resource liked",
      data: { liked: !hasLiked },
    });
  } catch (error) {
    logger.error("Like resource error:", error);
    return safeJsonError(res, 500, "OPERATION_ERROR", "Failed to like resource", error);
  }
};

/**
 * Delete a resource
 */
export const deleteResource = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user || !user._id) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "User must be authenticated",
      });
    }

    const resource = await Resource.findById(id);
    if (!resource) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: "Resource not found",
      });
    }

    // Check if user is the owner or admin
    if (
      resource.uploadedBy.toString() !== user._id.toString() &&
      user.role !== "admin"
    ) {
      return res.status(403).json({
        code: "FORBIDDEN",
        message: "You do not have permission to delete this resource",
      });
    }

    // Delete GridFS file
    const gfs = getGridFS();
    if (resource.fileId) {
      try {
        await gfs.delete(resource.fileId);
      } catch (err) {
        logger.warn("Could not delete GridFS file:", err);
      }
    }

    await Resource.findByIdAndDelete(id);
    void removeResourceFromSemanticIndex(id);

    res.json({
      code: "SUCCESS",
      message: "Resource deleted successfully",
    });
  } catch (error) {
    logger.error("Delete resource error:", error);
    return safeJsonError(res, 500, "DELETION_ERROR", "Failed to delete resource", error);
  }
};

/**
 * Download a resource file
 */
export const downloadResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await Resource.findByIdAndUpdate(
      id,
      { $inc: { downloads: 1 } },
      { new: true },
    );

    if (!resource) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: "Resource not found",
      });
    }

    const fileExists = await ensureGridFsFileExists(resource.fileId);
    if (!fileExists) {
      return res.status(404).json({
        code: "FILE_NOT_FOUND",
        message: "The file for this resource is missing from storage",
      });
    }

    const gfs = getGridFS();
    const readstream = gfs.openDownloadStream(resource.fileId);

    readstream.on("error", (err) => {
      logger.error("GridFS read error:", err);
      return res.status(500).json({
        code: "DOWNLOAD_ERROR",
        message: "Failed to download file",
      });
    });

    // Set response headers
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${resource.fileName}"`,
    );

    readstream.pipe(res);
  } catch (error) {
    logger.error("Download resource error:", error);
    return safeJsonError(res, 500, "DOWNLOAD_ERROR", "Failed to download resource", error);
  }
};

/**
 * View a resource file inline
 */
export const viewResource = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await Resource.findById(id);

    if (!resource) {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: "Resource not found",
      });
    }

    const fileExists = await ensureGridFsFileExists(resource.fileId);
    if (!fileExists) {
      return res.status(404).json({
        code: "FILE_NOT_FOUND",
        message: "The file for this resource is missing from storage",
      });
    }

    const gfs = getGridFS();
    const readstream = gfs.openDownloadStream(resource.fileId);

    readstream.on("error", (err) => {
      logger.error("GridFS view error:", err);
      return res.status(500).json({
        code: "VIEW_ERROR",
        message: "Failed to stream file",
      });
    });

    const contentTypeByExt = {
      pdf: "application/pdf",
      txt: "text/plain; charset=utf-8",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    };
    const extension = (resource.fileName || "").split(".").pop()?.toLowerCase();
    const contentType = contentTypeByExt[extension] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${resource.fileName || "resource"}"`,
    );
    readstream.pipe(res);
  } catch (error) {
    logger.error("View resource error:", error?.message || error);
    return safeJsonError(res, 500, "VIEW_ERROR", "Failed to view resource", error);
  }
};
