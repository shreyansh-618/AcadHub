import mongoose from "mongoose";

const qaInteractionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    sources: [
      {
        docId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Resource",
        },
        title: String,
        snippet: String,
        score: Number,
        chunkIndex: Number,
        _id: false,
      },
    ],
    resourceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resource",
      },
    ],
    processingTime: {
      type: Number,
      default: 0,
    },
    confidence: {
      type: Number,
      default: 0,
    },
    answerMode: {
      type: String,
      default: "ai",
    },
    rating: {
      type: String,
      enum: ["helpful", "not-helpful", null],
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

qaInteractionSchema.index({ userId: 1, createdAt: -1 });

export const QAInteraction = mongoose.model("QAInteraction", qaInteractionSchema);
