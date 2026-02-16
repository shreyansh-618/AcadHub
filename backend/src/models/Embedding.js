import mongoose from 'mongoose';

const embeddingSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      unique: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index on embedding for vector search
embeddingSchema.index({ embedding: '2dsphere' });

export const Embedding = mongoose.model('Embedding', embeddingSchema);
