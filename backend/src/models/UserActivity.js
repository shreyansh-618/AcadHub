import mongoose from "mongoose";

const userActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["view", "download", "search", "discussion", "qa_asked"],
      required: true,
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      index: true,
    },
    topicName: {
      type: String,
      index: true,
    },
    searchQuery: String,
    duration: Number, // in seconds
    metadata: {
      semester: Number,
      department: String,
      subject: String,
      category: String,
      deviceType: String, // 'web', 'mobile'
      userAgent: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Composite indexes for faster queries
userActivitySchema.index({ userId: 1, timestamp: -1 });
userActivitySchema.index({ type: 1, timestamp: -1 });
userActivitySchema.index({ topicName: 1, timestamp: -1 });
userActivitySchema.index({ userId: 1, type: 1, timestamp: -1 });

export const UserActivity = mongoose.model("UserActivity", userActivitySchema);
