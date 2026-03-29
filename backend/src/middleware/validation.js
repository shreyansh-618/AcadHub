import { logger } from "../config/logger.js";

/**
 * Basic validation utility
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidUID = (uid) => {
  return typeof uid === "string" && uid.trim().length > 0;
};

const isValidName = (name) => {
  return (
    typeof name === "string" &&
    name.trim().length > 0 &&
    name.trim().length <= 100
  );
};

const isValidPassword = (password) => {
  // Minimum 6 characters
  return typeof password === "string" && password.length >= 6;
};

/**
 * Validation middleware for signup
 */
export const validateSignup = (req, res, next) => {
  const { uid, email, name, role, department, university, semester } = req.body;

  const errors = [];

  if (!isValidUID(uid)) {
    errors.push("Invalid uid: must be a non-empty string");
  }

  if (!isValidEmail(email)) {
    errors.push("Invalid email: must be a valid email address");
  }

  if (!isValidName(name)) {
    errors.push(
      "Invalid name: must be a non-empty string (max 100 characters)",
    );
  }

  if (role && !["student", "instructor", "admin"].includes(role)) {
    errors.push("Invalid role: must be 'student', 'instructor', or 'admin'");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      errors,
    });
  }

  next();
};

/**
 * Validation middleware for login
 */
export const validateLogin = (req, res, next) => {
  const { uid } = req.body;

  if (!isValidUID(uid)) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Invalid uid: must be a non-empty string",
    });
  }

  next();
};

/**
 * Validation middleware for question/answer
 */
export const validateQuestion = (req, res, next) => {
  const { question } = req.body;

  if (!question || typeof question !== "string") {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Question must be a non-empty string",
    });
  }

  if (question.trim().length === 0) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Question cannot be empty",
    });
  }

  if (question.length > 500) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Question too long (max 500 characters)",
    });
  }

  next();
};

/**
 * Validation middleware for resource creation
 */
export const validateResource = (req, res, next) => {
  const { title, description } = req.body;

  const errors = [];

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    errors.push("Title is required and must be a non-empty string");
  }

  if (title && title.length > 200) {
    errors.push("Title must be max 200 characters");
  }

  if (description && description.length > 2000) {
    errors.push("Description must be max 2000 characters");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      errors,
    });
  }

  next();
};

/**
 * Validation middleware for search queries
 */
export const validateSearch = (req, res, next) => {
  const { query } = req.body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Search query is required and must be a non-empty string",
    });
  }

  if (query.length > 500) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Search query too long (max 500 characters)",
    });
  }

  next();
};

export default {
  isValidEmail,
  isValidUID,
  isValidName,
  isValidPassword,
  validateSignup,
  validateLogin,
  validateQuestion,
  validateResource,
  validateSearch,
};
