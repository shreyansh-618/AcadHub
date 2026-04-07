import express from "express";
import {
  signup,
  login,
  googleAuth,
  logout,
} from "../controllers/authController.js";
import { validateSignup, validateLogin } from "../middleware/validation.js";
import {
  authMiddleware,
  verifyFirebaseTokenOnly,
} from "../middleware/auth.js";

const router = express.Router();

/**
 * @route   POST /api/v1/auth/signup
 * @desc    Create user profile after Firebase signup
 * @access  Private (verified Firebase token required)
 */
router.post("/signup", verifyFirebaseTokenOnly, validateSignup, signup);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Get user profile after Firebase login
 * @access  Private (verified Firebase token required)
 */
router.post("/login", verifyFirebaseTokenOnly, validateLogin, login);

/**
 * @route   POST /api/v1/auth/google
 * @desc    Sign up or login with Google
 * @access  Private (verified Firebase token required)
 */
router.post("/google", verifyFirebaseTokenOnly, validateLogin, googleAuth);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Revoke Firebase refresh tokens for the current user
 * @access  Private
 */
router.post("/logout", authMiddleware, logout);

export default router;
