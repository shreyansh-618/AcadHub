import mongoose from "mongoose";
import { createHash } from "node:crypto";
import { Resource } from "../models/Resource.js";
import { Embedding } from "../models/Embedding.js";
import { logger } from "../config/logger.js";
import { buildResourceContent } from "./resourceContent.js";
import {
  AI_PROVIDER,
  AiProviderUnavailableError,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL_NAME,
  generateEmbedding,
} from "./ai.service.js";
import { splitTextIntoChunks } from "../utils/chunkText.js";

const VECTOR_INDEX_NAME =
  process.env.VECTOR_SEARCH_INDEX_NAME || "resource_embedding_index";
const EMBEDDING_RETRY_DELAY_MS = 5 * 60 * 1000;
const EMBEDDING_REQUEST_DELAY_MS = Number.parseInt(
  process.env.EMBEDDING_REQUEST_DELAY_MS || "1000",
  10,
);
const MIN_EMBEDDING_CHARS = Number.parseInt(
  process.env.MIN_EMBEDDING_CHARS || "100",
  10,
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildContentHash = (value = "") =>
  createHash("sha256").update(String(value)).digest("hex");

const validateEmbeddingRecord = (record) => {
  if (!Array.isArray(record.embedding) || record.embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Invalid embedding for chunk ${record.chunkIndex}: expected ${EMBEDDING_DIMENSIONS} dimensions`,
    );
  }
  return record;
};

const clampLimit = (limit, fallback = 5) => {
  const parsed = Number.parseInt(limit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

export const buildVectorSearchStage = ({
  queryVector,
  limit = 5,
  numCandidates,
  filter,
}) => ({
  $vectorSearch: {
    index: VECTOR_INDEX_NAME,
    path: "embedding",
    queryVector,
    limit: clampLimit(limit),
    numCandidates: clampLimit(numCandidates, Math.max(clampLimit(limit) * 10, 50)),
    ...(filter ? { filter } : {}),
  },
});

export const indexResourceEmbeddings = async (resource, rawContent = "") => {
  const content =
    String(rawContent || resource?.extractedContent || "").trim() ||
    `${resource?.title || ""} ${resource?.description || ""}`.trim();

  if (!resource?._id || !content) {
    logger.warn(
      `Indexing skipped for resource ${resource?._id || "unknown"}: empty content (length=0)`,
    );
    return { chunkCount: 0 };
  }

  logger.info(
    `Indexing resource ${resource._id}: extracted text length=${content.length}`,
  );

  await Resource.findByIdAndUpdate(resource._id, {
    $set: {
      processingStatus: "processing",
      processingError: null,
      lastEmbeddingAttemptAt: new Date(),
    },
  });

  const chunks = splitTextIntoChunks(content, { maxChars: 500 });
  logger.info(`Indexing resource ${resource._id}: chunks generated=${chunks.length}`);

  const eligibleChunks = chunks.filter((chunk) => chunk.charCount >= MIN_EMBEDDING_CHARS);
  const skippedChunks = chunks.length - eligibleChunks.length;
  if (skippedChunks > 0) {
    logger.info(
      `Indexing resource ${resource._id}: skipped short chunks=${skippedChunks} minChars=${MIN_EMBEDDING_CHARS}`,
    );
  }

  if (eligibleChunks.length === 0) {
    await Embedding.deleteMany({ docId: resource._id });
    await Resource.findByIdAndUpdate(resource._id, {
      $set: {
        processingStatus: "failed",
        processingError: `No indexable text content found with at least ${MIN_EMBEDDING_CHARS} characters`,
      },
    });
    logger.warn(`Indexing failed for resource ${resource._id}: no indexable chunks`);
    return { chunkCount: 0 };
  }

  const embeddings = [];
  try {
    for (const [position, chunk] of eligibleChunks.entries()) {
      const contentHash = buildContentHash(chunk.content);
      const cachedEmbedding = await Embedding.findOne({
        contentHash,
        embeddingProvider: AI_PROVIDER,
        embeddingModel: EMBEDDING_MODEL_NAME,
      })
        .select("embedding")
        .lean();

      if (cachedEmbedding?.embedding?.length === EMBEDDING_DIMENSIONS) {
        logger.info(
          `Reusing cached embedding for resource ${resource._id} chunk=${chunk.index}`,
        );
        embeddings.push(
          validateEmbeddingRecord({
            docId: resource._id,
            chunkIndex: chunk.index,
            content: chunk.content,
            contentHash,
            charCount: chunk.charCount,
            embeddingProvider: AI_PROVIDER,
            embeddingModel: EMBEDDING_MODEL_NAME,
            embedding: cachedEmbedding.embedding,
          }),
        );
        continue;
      }

      logger.info(
        `Generating embedding for resource ${resource._id} chunk=${chunk.index} chars=${chunk.charCount}`,
      );

      embeddings.push(
        validateEmbeddingRecord({
          docId: resource._id,
          chunkIndex: chunk.index,
          content: chunk.content,
          contentHash,
          charCount: chunk.charCount,
          embeddingProvider: AI_PROVIDER,
          embeddingModel: EMBEDDING_MODEL_NAME,
          embedding: await generateEmbedding(chunk.content),
        }),
      );

      if (position < eligibleChunks.length - 1) {
        await sleep(Math.max(EMBEDDING_REQUEST_DELAY_MS, 0));
      }
    }
  } catch (error) {
    logger.warn(
      `Embedding generation failed for resource ${resource._id}: ${error.message}`,
    );
    throw error;
  }

  await Embedding.deleteMany({ docId: resource._id });
  await Embedding.insertMany(embeddings, { ordered: true });

  await Resource.findByIdAndUpdate(resource._id, {
      $set: {
        extractedContent: content,
        processingStatus: "indexed",
        semanticIndexEligible: true,
        processingError: null,
        nextEmbeddingRetryAt: null,
        lastIndexedAt: new Date(),
      },
    });

  logger.info(
    `Stored embeddings for resource ${resource._id}: chunkCount=${embeddings.length}`,
  );

  return { chunkCount: embeddings.length, status: "indexed" };
};

export const removeResourceEmbeddings = async (resourceId) => {
  if (!resourceId) {
    return;
  }

  await Embedding.deleteMany({ docId: resourceId });
};

export const ensureResourceIsIndexed = async (resource) => {
  if (!resource?._id) {
    return { chunkCount: 0 };
  }

  if (!resource.semanticIndexEligible) {
    return { chunkCount: 0, status: "skipped" };
  }

  const existingChunks = await Embedding.countDocuments({ docId: resource._id });
  if (existingChunks > 0) {
    return { chunkCount: existingChunks };
  }

  if (
    resource.processingStatus === "pending_embedding" &&
    resource.nextEmbeddingRetryAt &&
    new Date(resource.nextEmbeddingRetryAt).getTime() > Date.now()
  ) {
    return { chunkCount: 0, status: "pending_embedding" };
  }

  const extractedContent =
    (resource.extractedContent || "").trim() ||
    (await buildResourceContent(resource));

  logger.info(
    `Preparing resource ${resource._id} for indexing: extracted text length=${extractedContent.length}`,
  );

  if (extractedContent && resource.extractedContent !== extractedContent) {
    resource.extractedContent = extractedContent;
    await resource.save();
  }

  try {
    return await indexResourceEmbeddings(resource, extractedContent);
  } catch (error) {
    if (error instanceof AiProviderUnavailableError) {
      const nextRetryAt = new Date(Date.now() + EMBEDDING_RETRY_DELAY_MS);
      await Resource.findByIdAndUpdate(resource._id, {
        $set: {
          processingStatus: "pending_embedding",
          processingError: error.message,
          nextEmbeddingRetryAt: nextRetryAt,
          lastEmbeddingAttemptAt: new Date(),
        },
      });
      logger.warn(
        `Indexing deferred for resource ${resource._id}: ${error.message}; nextRetryAt=${nextRetryAt.toISOString()}`,
      );
      return { chunkCount: 0, status: "pending_embedding", nextRetryAt };
    }

    await Resource.findByIdAndUpdate(resource._id, {
      $set: {
        processingStatus: "failed",
        processingError: error.message,
        lastEmbeddingAttemptAt: new Date(),
      },
    });
    logger.warn(`Indexing failed for resource ${resource._id}: ${error.message}`);
    throw error;
  }
};

export const reindexAllResources = async () => {
  const resources = await Resource.find({
    isApproved: true,
    semanticIndexEligible: true,
  }).sort({ createdAt: -1 });
  let indexedCount = 0;
  let failedCount = 0;

  for (const resource of resources) {
    try {
      const extractedContent =
        (resource.extractedContent || "").trim() ||
        (await buildResourceContent(resource));

      if (extractedContent && resource.extractedContent !== extractedContent) {
        resource.extractedContent = extractedContent;
        await resource.save();
      }

      await indexResourceEmbeddings(resource, extractedContent);
      indexedCount += 1;
    } catch (error) {
      if (error instanceof AiProviderUnavailableError) {
        const nextRetryAt = new Date(Date.now() + EMBEDDING_RETRY_DELAY_MS);
        await Resource.findByIdAndUpdate(resource._id, {
          $set: {
            processingStatus: "pending_embedding",
            processingError: error.message,
            nextEmbeddingRetryAt: nextRetryAt,
            lastEmbeddingAttemptAt: new Date(),
          },
        }).catch(() => {});
        logger.warn(`Reindex deferred for resource ${resource._id}: ${error.message}`);
        failedCount += 1;
        continue;
      }

      failedCount += 1;
      logger.warn(`Failed to reindex resource ${resource._id}: ${error.message}`);
      await Resource.findByIdAndUpdate(resource._id, {
        $set: {
          processingStatus: "failed",
          processingError: error.message,
        },
      }).catch(() => {});
    }
  }

  return {
    total: resources.length,
    indexed: indexedCount,
    failed: failedCount,
  };
};

export const reindexPendingResources = async ({ limit = 25 } = {}) => {
  const resources = await Resource.find({
    processingStatus: "pending_embedding",
    semanticIndexEligible: true,
    $or: [
      { nextEmbeddingRetryAt: null },
      { nextEmbeddingRetryAt: { $lte: new Date() } },
    ],
  })
    .sort({ updatedAt: 1 })
    .limit(limit);

  let indexed = 0;
  let deferred = 0;
  let failed = 0;

  for (const resource of resources) {
    try {
      const result = await ensureResourceIsIndexed(resource);
      if (result.status === "indexed") {
        indexed += 1;
      } else {
        deferred += 1;
      }
    } catch (error) {
      failed += 1;
      logger.warn(`Pending reindex failed for resource ${resource._id}: ${error.message}`);
    }

    await sleep(Math.max(EMBEDDING_REQUEST_DELAY_MS, 0));
  }

  return {
    total: resources.length,
    indexed,
    deferred,
    failed,
  };
};

export const findRelevantChunks = async ({
  questionEmbedding,
  resourceIds = [],
  limit = 5,
  numCandidates,
}) => {
  const objectIds = resourceIds
    .filter(Boolean)
    .map((id) => new mongoose.Types.ObjectId(String(id)));

  const filter =
    objectIds.length > 0
      ? {
          docId: {
            $in: objectIds,
          },
        }
      : undefined;

  // Example MongoDB Atlas query:
  // db.embeddings.aggregate([
  //   {
  //     $vectorSearch: {
  //       index: "resource_embedding_index",
  //       path: "embedding",
  //       queryVector: [...],
  //       numDimensions: 3072,
  //       limit: 5,
  //       numCandidates: 50,
  //       filter: { docId: { $in: [...] } }
  //     }
  //   }
  // ])
  return Embedding.aggregate([
    buildVectorSearchStage({
      queryVector: questionEmbedding,
      limit,
      numCandidates,
      filter,
    }),
    {
      $project: {
        docId: 1,
        chunkIndex: 1,
        content: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);
};
