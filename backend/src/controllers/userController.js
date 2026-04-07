import { User } from '../models/User.js';
import { logger } from '../config/logger.js';
import {
  normalizeString,
  parseBoundedInteger,
  safeJsonError,
} from "../utils/security.js";

/**
 * Get user profile
 */
export const getProfile = async (req, res) => {
  try {
    // Get user from auth middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    res.status(200).json({
      code: 'SUCCESS',
      message: 'User profile retrieved',
      data: {
        user: {
          _id: user._id,
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          university: user.university,
          semester: user.semester,
          avatar: user.avatar,
          bio: user.bio,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      code: 'PROFILE_ERROR',
      message: 'Failed to retrieve user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res) => {
  try {
    const user = req.user; // Get user from auth middleware
    const { name, bio, avatar, department, university, semester } = req.body;

    if (!user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    // Update only allowed fields
    const updateData = {};
    if (name) updateData.name = normalizeString(name, { maxLength: 100 });
    if (bio) updateData.bio = normalizeString(bio, { maxLength: 1000 });
    if (avatar) updateData.avatar = normalizeString(avatar, { maxLength: 500 });
    if (department) updateData.department = normalizeString(department, { maxLength: 100 });
    if (university) updateData.university = normalizeString(university, { maxLength: 150 });
    if (semester !== undefined) {
      const normalizedSemester = parseBoundedInteger(semester, {
        min: 1,
        max: 12,
        fallback: null,
      });

      if (normalizedSemester == null) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Semester must be a number between 1 and 12",
        });
      }

      updateData.semester = normalizedSemester;
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    logger.info(`User profile updated: ${updatedUser.email}`);

    res.status(200).json({
      code: 'SUCCESS',
      message: 'User profile updated',
      data: {
        user: {
          _id: updatedUser._id,
          uid: updatedUser.uid,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          department: updatedUser.department,
          university: updatedUser.university,
          semester: updatedUser.semester,
          avatar: updatedUser.avatar,
          bio: updatedUser.bio,
          isActive: updatedUser.isActive,
        },
      },
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    return safeJsonError(res, 500, "UPDATE_ERROR", "Failed to update user profile", error);
  }
};

/**
 * Get user by ID (for public profiles)
 */
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ uid: userId });

    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Return only public fields
    res.status(200).json({
      code: 'SUCCESS',
      message: 'User profile retrieved',
      data: {
        user: {
          uid: user.uid,
          name: user.name,
          role: user.role,
          department: user.department,
          university: user.university,
          semester: user.semester,
          avatar: user.avatar,
          bio: user.bio,
        },
      },
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    return safeJsonError(
      res,
      500,
      "PROFILE_ERROR",
      "Failed to retrieve user profile",
      error,
    );
  }
};
