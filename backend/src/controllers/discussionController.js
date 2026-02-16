import { Discussion } from '../models/Discussion.js';
import { User } from '../models/User.js';
import { logger } from '../config/logger.js';

/**
 * Create a new discussion
 */
export const createDiscussion = async (req, res) => {
  try {
    const user = req.user;
    const { title, content, subject, department, tags } = req.body;

    if (!user || !user._id || !title || !content || !subject) {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        message: 'Missing required fields',
      });
    }

    const discussion = await Discussion.create({
      title,
      content,
      subject,
      department: department || user.department || 'General',
      author: user._id,
      authorName: user.name,
      tags: tags || [],
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
    res.status(500).json({
      code: 'CREATE_ERROR',
      message: error.message || 'Failed to create discussion',
    });
  }
};

/**
 * Get all discussions
 */
export const getDiscussions = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject, department, search } = req.query;

    const filter = {};
    if (subject) filter.subject = subject;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const discussions = await Discussion.find(filter)
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Discussion.countDocuments(filter);

    res.json({
      code: 'SUCCESS',
      data: {
        discussions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Get discussions error:', error);
    res.status(500).json({
      code: 'FETCH_ERROR',
      message: error.message || 'Failed to fetch discussions',
    });
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
    res.status(500).json({
      code: 'FETCH_ERROR',
      message: error.message || 'Failed to fetch discussion',
    });
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

    if (!user || !user._id || !content) {
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
      content,
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
    res.status(500).json({
      code: 'REPLY_ERROR',
      message: error.message || 'Failed to add reply',
    });
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
    res.status(500).json({
      code: 'OPERATION_ERROR',
      message: error.message || 'Failed to mark helpful',
    });
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
    res.status(500).json({
      code: 'DELETION_ERROR',
      message: error.message || 'Failed to delete discussion',
    });
  }
};
