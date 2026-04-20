import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["pdf", "pptx", "docx", "doc", "txt", "image"],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "lecture-notes",
        "textbooks",
        "question-papers",
        "assignments",
        "other",
      ],
      required: true,
      index: true,
    },
    department: {
      type: String,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      index: true,
    },
    semester: {
      type: Number,
      required: true,
      index: true,
    },
    academicYear: {
      type: String,
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    uploadedByName: {
      type: String,
      required: true,
    },
    // GridFS File ID
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // Original filename
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    extractedContent: {
      type: String,
      default: "",
    },
    downloads: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isApproved: {
      type: Boolean,
      default: true,
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    // AI-generated summary (Week 3+)
    summary: {
      type: String,
      default: null,
    },
    // Auto-generated tags from content (Week 3+)
    tags: [
      {
        name: String,
        confidence: { type: Number, min: 0, max: 1 },
        _id: false,
      },
    ],
    // Status of processing
    processingStatus: {
      type: String,
      enum: [
        "pending",
        "pending_embedding",
        "processing",
        "chunked",
        "embedded",
        "indexed",
        "failed",
      ],
      default: "pending",
    },
    processingError: String,
    semanticIndexEligible: {
      type: Boolean,
      default: false,
      index: true,
    },
    embedded: {
      type: Boolean,
      default: false,
      index: true,
    },
    embeddingChunkCount: {
      type: Number,
      default: 0,
    },
    embeddingContentHash: {
      type: String,
      default: null,
    },
    lastEmbeddingAttemptAt: Date,
    nextEmbeddingRetryAt: Date,
    lastIndexedAt: Date,
  },
  {
    timestamps: true,
  },
);

// Full-text search index
resourceSchema.index({ title: "text", description: "text" });
resourceSchema.index({ createdAt: -1 });
resourceSchema.index({ department: 1, subject: 1, semester: 1 });
// Vector search index is created separately in MongoDB Atlas

export const Resource = mongoose.model("Resource", resourceSchema);
