import express from "express";
import cors from "cors";
import helmet from "helmet";
import "express-async-errors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/database.js";
import { initFirebase } from "./config/firebase.js";
import { logger } from "./config/logger.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import discussionRoutes from "./routes/discussionRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import qaRoutes from "./routes/qaRoutes.js";
import { analyticsRouter } from "./routes/analyticsRoutes.js";
import { recommendationsRouter } from "./routes/recommendationsRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(
  helmet({
    crossOriginOpenerPolicy: false, // Allow Firebase popup auth
    crossOriginResourcePolicy: false,
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? undefined
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

      // Allow localhost on any port (development)
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return callback(null, true);
      }

      // Allow Expo clients
      if (
        origin.startsWith("exp://") ||
        origin.match(/^exp:\/\/[\w.-]+:\d+$/)
      ) {
        return callback(null, true);
      }

      // Allow configured CORS origins from env
      if (process.env.CORS_ORIGIN) {
        const allowedOrigins = process.env.CORS_ORIGIN.split(",").map(
          (origin) => origin.trim(),
        );
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
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

// Static file serving for uploads
app.use("/uploads", express.static("uploads"));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Apply rate limiting to all routes
app.use(limiter);

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit login/signup to 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful requests
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Limit AI endpoints to 30 requests per 15 minutes
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
app.use("/api/v1/qa", aiLimiter, qaRoutes);
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
app.use((err, req, res, next) => {
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

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server started on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  process.exit(0);
});

// Start the server
startServer();

export default app;
