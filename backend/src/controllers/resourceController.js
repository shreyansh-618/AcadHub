import { Resource } from "../models/Resource.js";
import { User } from "../models/User.js";
import { logger } from "../config/logger.js";
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads/resources";

/**
 * Upload a new resource
 */
export const uploadResource = async (req, res) => {
  try {
    const user = req.user;
    const { title, description, category, subject, semester, academicYear } =
      req.body;

    if (!user || !user._id) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "You must be logged in to upload",
      });
    }

    if (!title || !category || !subject || !semester) {
      return res.status(400).json({
        code: "INVALID_INPUT",
        message: "Missing required fields: title, category, subject, semester",
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
    };
    const fileType = typeMapping[fileExt] || "pdf";

    // Ensure uploads directory exists
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (err) {
      logger.warn("Could not create uploads directory:", err);
    }

    // Create resource with file information
    const resource = await Resource.create({
      title,
      description: description || "",
      category,
      subject,
      semester: parseInt(semester),
      academicYear: academicYear || new Date().getFullYear().toString(),
      type: fileType,
      department: user.department || "Computer Science",
      uploadedBy: user._id,
      uploadedByName: user.name,
      filePath: req.file.path,
      fileUrl: `/uploads/resources/${req.file.filename}`,
      fileSize: req.file.size,
      isApproved: false,
    });

    res.status(201).json({
      code: "RESOURCE_CREATED",
      message: "Resource uploaded successfully",
      data: { resource },
    });
  } catch (error) {
    logger.error("Upload resource error:", error);
    res.status(500).json({
      code: "UPLOAD_ERROR",
      message: error.message || "Failed to upload resource",
    });
  }
};

/**
 * Get all resources (with filtering and pagination)
 */
export const getResources = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, department, subject } = req.query;

    const filter = { isApproved: true };
    if (category) filter.category = category;
    if (department) filter.department = department;
    if (subject) filter.subject = subject;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const resources = await Resource.find(filter)
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Resource.countDocuments(filter);

    res.json({
      code: "SUCCESS",
      data: {
        resources,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error("Get resources error:", error);
    res.status(500).json({
      code: "FETCH_ERROR",
      message: error.message || "Failed to fetch resources",
    });
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
    res.status(500).json({
      code: "FETCH_ERROR",
      message: error.message || "Failed to fetch resources",
    });
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
    res.status(500).json({
      code: "FETCH_ERROR",
      message: error.message || "Failed to fetch liked resources",
    });
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
    res.status(500).json({
      code: "FETCH_ERROR",
      message: error.message || "Failed to fetch resource",
    });
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
    res.status(500).json({
      code: "OPERATION_ERROR",
      message: error.message || "Failed to like resource",
    });
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

    await Resource.findByIdAndDelete(id);

    res.json({
      code: "SUCCESS",
      message: "Resource deleted successfully",
    });
  } catch (error) {
    logger.error("Delete resource error:", error);
    res.status(500).json({
      code: "DELETION_ERROR",
      message: error.message || "Failed to delete resource",
    });
  }
};
