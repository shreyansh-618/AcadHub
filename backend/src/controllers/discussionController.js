import { Discussion } from '../models/Discussion.js';
import { logger } from '../config/logger.js';
import {
  escapeRegex,
  normalizeString,
  normalizeStringArray,
  parseBoundedInteger,
  safeJsonError,
} from "../utils/security.js";

/**
 * Create a new discussion
 */
export const createDiscussion = async (req, res) => {
  try {
    const user = req.user;
    const { title, content, subject, department, tags } = req.body;
    const normalizedTitle = normalizeString(title, { maxLength: 150 });
    const normalizedContent = normalizeString(content, { maxLength: 5000 });
    const normalizedSubject = normalizeString(subject, { maxLength: 100 });
    const normalizedDepartment = normalizeString(
      department || user?.department || "General",
      { maxLength: 100 },
    );
    const normalizedTags = normalizeStringArray(tags, {
      maxItems: 10,
      maxLength: 40,
    });

    if (!user || !user._id || !normalizedTitle || !normalizedContent || !normalizedSubject) {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: 'Missing required fields',
      });
    }

    const discussion = await Discussion.create({
      title: normalizedTitle,
      content: normalizedContent,
      subject: normalizedSubject,
      department: normalizedDepartment,
      author: user._id,
      authorName: user.name,
      tags: normalizedTags,
      replies: [],
      views: 0,
      helpful: 0,
      helpfulBy: [],
    });

    await discussion.populate('author', 'name email avatar');

    res.status(201).json({
      code: 'DISCUSSION_CREATED',
      message: 'Discussion created successfully',
      data: { discussion },
    });
  } catch (error) {
    logger.error('Create discussion error:', error);
    return safeJsonError(res, 500, "CREATE_ERROR", "Failed to create discussion", error);
  }
};

/**
 * Get all discussions
 */
export const getDiscussions = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject, department, search } = req.query;
    const safePage = parseBoundedInteger(page, { min: 1, max: 10000, fallback: 1 });
    const safeLimit = parseBoundedInteger(limit, { min: 1, max: 50, fallback: 10 });

    const filter = {};
    if (subject) filter.subject = normalizeString(subject, { maxLength: 100 });
    if (department) filter.department = normalizeString(department, { maxLength: 100 });
    if (search) {
      const searchRegex = new RegExp(escapeRegex(normalizeString(search, { maxLength: 100 })), 'i');
      filter.$or = [
        { title: { $regex: searchRegex } },
        { content: { $regex: searchRegex } },
      ];
    }

    const skip = (safePage - 1) * safeLimit;

    const discussions = await Discussion.find(filter)
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit);

    const total = await Discussion.countDocuments(filter);

    res.json({
      code: 'SUCCESS',
      data: {
        discussions,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
      },
    });
  } catch (error) {
    logger.error('Get discussions error:', error);
    return safeJsonError(res, 500, "FETCH_ERROR", "Failed to fetch discussions", error);
  }
};

/**
 * Get discussion by ID
 */
export const getDiscussionById = async (req, res) => {
  try {
    const { id } = req.params;

    const discussion = await Discussion.findById(id)
      .populate('author', 'name email avatar bio department')
      .populate('replies.author', 'name email avatar');

    if (!discussion) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Discussion not found',
      });
    }

    // Increment views
    await Discussion.findByIdAndUpdate(id, { $inc: { views: 1 } });

    res.json({
      code: 'SUCCESS',
      data: { discussion },
    });
  } catch (error) {
    logger.error('Get discussion error:', error);
    return safeJsonError(res, 500, "FETCH_ERROR", "Failed to fetch discussion", error);
  }
};

/**
 * Add a reply to discussion
 */
export const replyToDiscussion = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { content } = req.body;
    const normalizedContent = normalizeString(content, { maxLength: 5000 });

    if (!user || !user._id || !normalizedContent) {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: 'Missing required fields',
      });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Discussion not found',
      });
    }

    const reply = {
      author: user._id,
      authorName: user.name,
      content: normalizedContent,
      createdAt: new Date(),
      helpful: 0,
      helpfulBy: [],
    };

    discussion.replies.push(reply);
    await discussion.save();
    await discussion.populate('replies.author', 'name email avatar');

    res.status(201).json({
      code: 'REPLY_CREATED',
      message: 'Reply added successfully',
      data: { reply: discussion.replies[discussion.replies.length - 1] },
    });
  } catch (error) {
    logger.error('Reply to discussion error:', error);
    return safeJsonError(res, 500, "REPLY_ERROR", "Failed to add reply", error);
  }
};

/**
 * Mark discussion as helpful
 */
export const markHelpful = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user || !user._id) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'User must be authenticated',
      });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Discussion not found',
      });
    }

    const hasMarked = discussion.helpfulBy.includes(user._id);

    if (hasMarked) {
      await Discussion.findByIdAndUpdate(
        id,
        {
          $pull: { helpfulBy: user._id },
          $inc: { helpful: -1 },
        }
      );
    } else {
      await Discussion.findByIdAndUpdate(
        id,
        {
          $push: { helpfulBy: user._id },
          $inc: { helpful: 1 },
        }
      );
    }

    res.json({
      code: 'SUCCESS',
      message: hasMarked ? 'Marked as not helpful' : 'Marked as helpful',
      data: { marked: !hasMarked },
    });
  } catch (error) {
    logger.error('Mark helpful error:', error);
    return safeJsonError(res, 500, "OPERATION_ERROR", "Failed to mark helpful", error);
  }
};

/**
 * Delete a discussion
 */
export const deleteDiscussion = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user || !user._id) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'User must be authenticated',
      });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Discussion not found',
      });
    }

    // Check if user is the author or admin
    if (discussion.author.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this discussion',
      });
    }

    await Discussion.findByIdAndDelete(id);

    res.json({
      code: 'SUCCESS',
      message: 'Discussion deleted successfully',
    });
  } catch (error) {
    logger.error('Delete discussion error:', error);
    return safeJsonError(res, 500, "DELETION_ERROR", "Failed to delete discussion", error);
  }
};
