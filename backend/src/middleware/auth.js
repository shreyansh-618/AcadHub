import { verifyToken } from '../config/firebase.js';
import { User } from '../models/User.js';
import { logger } from '../config/logger.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'No authentication token provided',
      });
    }

    const decodedToken = await verifyToken(token);
    req.firebaseUser = decodedToken;
    req.userId = decodedToken.uid;

    // Get user from database
    const user = await User.findOne({ uid: decodedToken.uid });
    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: `This action requires one of the following roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decodedToken = await verifyToken(token);
      req.firebaseUser = decodedToken;
      req.userId = decodedToken.uid;

      const user = await User.findOne({ uid: decodedToken.uid });
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
