import express from 'express';
import { getProfile, updateProfile, getUserById } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get authenticated user's profile
 * @access  Private (requires authentication)
 */
router.get('/profile', authMiddleware, getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private (requires authentication)
 */
router.put('/profile', authMiddleware, updateProfile);

/**
 * @route   GET /api/v1/users/:userId
 * @desc    Get public user profile by ID
 * @access  Public
 */
router.get('/:userId', getUserById);

export default router;
