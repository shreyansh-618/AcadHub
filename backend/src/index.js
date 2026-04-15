import express from "express";
import cors from "cors";
import helmet from "helmet";
import "express-async-errors";
import dotenv from "dotenv";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { connectDB } from "./config/database.js";
import { initFirebase } from "./config/firebase.js";
import { logger } from "./config/logger.js";
import { authMiddleware } from "./middleware/auth.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import discussionRoutes from "./routes/discussionRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import qaRoutes from "./routes/qaRoutes.js";
import { analyticsRouter } from "./routes/analyticsRoutes.js";
import { recommendationsRouter } from "./routes/recommendationsRoutes.js";
import { reindexPendingResources } from "./services/resourceIndex.service.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";
const trustProxy = process.env.TRUST_PROXY ?? (isProduction ? "1" : "false");
const embeddingRetryJobEnabled =
  (process.env.EMBEDDING_RETRY_JOB_ENABLED ?? "true").trim().toLowerCase() !==
  "false";
const embeddingRetryIntervalMs = Number.parseInt(
  process.env.EMBEDDING_RETRY_INTERVAL_MS || "60000",
  10,
);
const embeddingRetryBatchSize = Number.parseInt(
  process.env.EMBEDDING_RETRY_BATCH_SIZE || "10",
  10,
);
const configuredOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
let embeddingRetryTimer = null;
let embeddingRetryJobRunning = false;

if (isProduction && configuredOrigins.length === 0) {
  throw new Error("CORS_ORIGIN must be set to your frontend domain(s) in production");
}

const resolveTrustProxySetting = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;

  const numericValue = Number.parseInt(normalized, 10);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  return value;
};

const buildUserOrIpKey = (prefix) => (req) => {
  if (req.userId) {
    return `${prefix}:user:${req.userId}`;
  }

  return `${prefix}:ip:${ipKeyGenerator(req.ip)}`;
};

const buildRateLimiter = ({
  windowMs,
  max,
  message,
  keyGenerator,
  skipSuccessfulRequests = false,
}) =>
  rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler: (req, res) => {
      const retryAfterSeconds = Math.ceil(windowMs / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      res.status(429).json({
        code: "RATE_LIMIT_EXCEEDED",
        message,
        retryAfter: retryAfterSeconds,
      });
    },
  });

app.set("trust proxy", resolveTrustProxySetting(trustProxy));

// Security middleware
app.use(
  helmet({
    crossOriginOpenerPolicy: false, // Allow Firebase popup auth
    crossOriginResourcePolicy: false,
    hsts: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'none'"],
            baseUri: ["'none'"],
            frameAncestors: ["'none'"],
            formAction: ["'self'"],
          },
        }
      : false,
  }),
);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without origin (mobile, desktop apps)
      if (!origin) {
        return callback(null, true);
      }

      // Allow localhost on any port for development only
      if (
        !isProduction &&
        (origin.includes("localhost") || origin.includes("127.0.0.1"))
      ) {
        return callback(null, true);
      }

      // Allow Expo clients for development only
      if (
        !isProduction &&
        (origin.startsWith("exp://") ||
          origin.match(/^exp:\/\/[\w.-]+:\d+$/))
      ) {
        return callback(null, true);
      }

      if (configuredOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Rate limiting middleware
const limiter = buildRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  keyGenerator: buildUserOrIpKey("global"),
});

// Apply rate limiting to all routes
app.use(limiter);

// Stricter rate limiting for authentication endpoints
const authLimiter = buildRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit login/signup to 5 attempts per 15 minutes
  message: "Too many authentication attempts. Please try again later.",
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: buildUserOrIpKey("auth"),
});

const aiLimiter = buildRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30, // Limit AI endpoints to 30 requests per 15 minutes
  message: "Too many AI requests. Please wait before trying again.",
  keyGenerator: buildUserOrIpKey("ai"),
});

// Initialize Firebase
initFirebase();

// Health check endpoint
app.get("/api/v1/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/resources", resourceRoutes);
app.use("/api/v1/discussions", discussionRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/qa", authMiddleware, aiLimiter, qaRoutes);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/api/v1/recommendations", recommendationsRouter);
// app.use('/api/v1/events', eventRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    code: "NOT_FOUND",
    message: "Route not found",
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  logger.error("Unhandled error:", err);

  res.status(err.statusCode || 500).json({
    code: err.code || "INTERNAL_SERVER_ERROR",
    message: err.message || "An unexpected error occurred",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Database and Server Startup
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    if (embeddingRetryJobEnabled) {
      embeddingRetryTimer = setInterval(async () => {
        if (embeddingRetryJobRunning) {
          return;
        }

        embeddingRetryJobRunning = true;
        try {
          const result = await reindexPendingResources({
            limit: embeddingRetryBatchSize,
          });

          if (result.total > 0) {
            logger.info(
              {
                total: result.total,
                indexed: result.indexed,
                deferred: result.deferred,
                failed: result.failed,
              },
              "Pending embedding retry run completed",
            );
          }
        } catch (error) {
          logger.warn(`Pending embedding retry job failed: ${error.message}`);
        } finally {
          embeddingRetryJobRunning = false;
        }
      }, Math.max(embeddingRetryIntervalMs, 5000));

      logger.info(
        {
          intervalMs: Math.max(embeddingRetryIntervalMs, 5000),
          batchSize: embeddingRetryBatchSize,
        },
        "Pending embedding retry job enabled",
      );
    }

    // Start server
    app.listen(PORT, () => {
      logger.info({ port: PORT }, "Server started");
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  if (embeddingRetryTimer) {
    clearInterval(embeddingRetryTimer);
  }
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  if (embeddingRetryTimer) {
    clearInterval(embeddingRetryTimer);
  }
  process.exit(0);
});

// Start the server
startServer();

export default app;
