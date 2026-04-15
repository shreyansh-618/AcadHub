import mongoose from "mongoose";

const embeddingSchema = new mongoose.Schema(
  {
    docId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    contentHash: {
      type: String,
      required: true,
      index: true,
    },
    charCount: {
      type: Number,
      required: true,
    },
    embeddingProvider: {
      type: String,
      required: true,
      index: true,
    },
    embeddingModel: {
      type: String,
      required: true,
      index: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

embeddingSchema.index({ docId: 1, chunkIndex: 1 }, { unique: true });
embeddingSchema.index({
  contentHash: 1,
  embeddingProvider: 1,
  embeddingModel: 1,
});
// MongoDB Atlas vector index should be created on `embedding`
// with cosine similarity using VECTOR_SEARCH_INDEX_NAME.

export const Embedding = mongoose.model("Embedding", embeddingSchema);
