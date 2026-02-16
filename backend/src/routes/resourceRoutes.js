import express from 'express';
import {
  uploadResource,
  getResources,
  getUserResources,
  getUserLikedResources,
  getResourceById,
  likeResource,
  deleteResource,
} from '../controllers/resourceController.js';
import { authMiddleware } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

/**
 * @route   POST /api/v1/resources
 * @desc    Upload a new resource
 * @access  Private (requires authentication)
 */
router.post('/', authMiddleware, upload.single('file'), uploadResource);

/**
 * @route   GET /api/v1/resources
 * @desc    Get all approved resources
 * @access  Public
 */
router.get('/', getResources);

/**
 * @route   GET /api/v1/resources/my-uploads
 * @desc    Get user's uploaded resources
 * @access  Private
 */
router.get('/my-uploads', authMiddleware, getUserResources);

/**
 * @route   GET /api/v1/resources/my-likes
 * @desc    Get user's liked resources
 * @access  Private
 */
router.get('/my-likes', authMiddleware, getUserLikedResources);

/**
 * @route   GET /api/v1/resources/:id
 * @desc    Get resource by ID
 * @access  Public
 */
router.get('/:id', getResourceById);

/**
 * @route   POST /api/v1/resources/:id/like
 * @desc    Like/unlike a resource
 * @access  Private
 */
router.post('/:id/like', authMiddleware, likeResource);

/**
 * @route   DELETE /api/v1/resources/:id
 * @desc    Delete a resource
 * @access  Private
 */
router.delete('/:id', authMiddleware, deleteResource);

export default router;
