import express from 'express';
import {
  createDiscussion,
  getDiscussions,
  getDiscussionById,
  replyToDiscussion,
  markHelpful,
  deleteDiscussion,
} from '../controllers/discussionController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/v1/discussions
 * @desc    Create a new discussion
 * @access  Private
 */
router.post('/', authMiddleware, createDiscussion);

/**
 * @route   GET /api/v1/discussions
 * @desc    Get all discussions
 * @access  Public
 */
router.get('/', getDiscussions);

/**
 * @route   GET /api/v1/discussions/:id
 * @desc    Get discussion by ID
 * @access  Public
 */
router.get('/:id', getDiscussionById);

/**
 * @route   POST /api/v1/discussions/:id/replies
 * @desc    Add a reply to discussion
 * @access  Private
 */
router.post('/:id/replies', authMiddleware, replyToDiscussion);

/**
 * @route   POST /api/v1/discussions/:id/helpful
 * @desc    Mark discussion as helpful
 * @access  Private
 */
router.post('/:id/helpful', authMiddleware, markHelpful);

/**
 * @route   DELETE /api/v1/discussions/:id
 * @desc    Delete a discussion
 * @access  Private
 */
router.delete('/:id', authMiddleware, deleteDiscussion);

export default router;
