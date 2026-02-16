import express from 'express';
import { signup, login, googleAuth } from '../controllers/authController.js';

const router = express.Router();

/**
 * @route   POST /api/v1/auth/signup
 * @desc    Create user profile after Firebase signup
 * @access  Public
 */
router.post('/signup', signup);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Get user profile after Firebase login
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/v1/auth/google
 * @desc    Sign up or login with Google
 * @access  Public
 */
router.post('/google', googleAuth);

export default router;
