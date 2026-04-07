import mongoose from "mongoose";

const stripControlCharacters = (value = "") =>
  Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join("");

export const normalizeString = (value, { maxLength = 5000, trim = true } = {}) => {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = stripControlCharacters(value)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ");

  const maybeTrimmed = trim ? normalized.trim() : normalized;
  return maybeTrimmed.slice(0, maxLength);
};

export const normalizeOptionalString = (value, options = {}) => {
  const normalized = normalizeString(value, options);
  return normalized || undefined;
};

export const normalizeStringArray = (value, { maxItems = 10, maxLength = 50 } = {}) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeString(item, { maxLength }))
    .filter(Boolean)
    .slice(0, maxItems);
};

export const parseBoundedInteger = (
  value,
  { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, fallback = null } = {},
) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return fallback;
  }

  return parsed;
};

export const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const isValidObjectId = (value) => mongoose.isValidObjectId(value);

export const safeJsonError = (res, statusCode, code, fallbackMessage, error) =>
  res.status(statusCode).json({
    code,
    message:
      process.env.NODE_ENV === "development"
        ? error?.message || fallbackMessage
        : fallbackMessage,
  });

export const sanitizeFilename = (value = "") =>
  normalizeString(value, { maxLength: 255, trim: true }).replace(/[<>:"/\\|?*]/g, "_");
