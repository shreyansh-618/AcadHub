const DEFAULT_CHUNK_SIZE = Number.parseInt(
  process.env.EMBEDDING_CHUNK_SIZE || "1200",
  10,
);
const DEFAULT_CHUNK_OVERLAP = Number.parseInt(
  process.env.EMBEDDING_CHUNK_OVERLAP || "150",
  10,
);
const DEFAULT_MAX_CHUNKS = Number.parseInt(
  process.env.MAX_EMBEDDING_CHUNKS || "50",
  10,
);

const normalizeChunkText = (value = "") =>
  String(value)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const EMBEDDING_CHUNK_SIZE = Number.isFinite(DEFAULT_CHUNK_SIZE)
  ? Math.max(DEFAULT_CHUNK_SIZE, 200)
  : 1200;
export const EMBEDDING_CHUNK_OVERLAP = Number.isFinite(DEFAULT_CHUNK_OVERLAP)
  ? Math.max(Math.min(DEFAULT_CHUNK_OVERLAP, EMBEDDING_CHUNK_SIZE - 1), 0)
  : 150;
export const EMBEDDING_MAX_CHUNKS = Number.isFinite(DEFAULT_MAX_CHUNKS)
  ? Math.max(DEFAULT_MAX_CHUNKS, 1)
  : 50;

export const estimateChunkCount = (
  textLength,
  {
    chunkSize = EMBEDDING_CHUNK_SIZE,
    overlap = EMBEDDING_CHUNK_OVERLAP,
  } = {},
) => {
  const safeLength = Math.max(Number(textLength) || 0, 0);
  if (safeLength === 0) {
    return 0;
  }

  const safeChunkSize = Math.max(Number(chunkSize) || EMBEDDING_CHUNK_SIZE, 1);
  const safeOverlap = Math.max(
    Math.min(Number(overlap) || EMBEDDING_CHUNK_OVERLAP, safeChunkSize - 1),
    0,
  );
  const step = Math.max(safeChunkSize - safeOverlap, 1);

  return Math.ceil(Math.max(safeLength - safeOverlap, 0) / step);
};

export const splitTextIntoChunks = (
  text,
  {
    chunkSize = EMBEDDING_CHUNK_SIZE,
    overlap = EMBEDDING_CHUNK_OVERLAP,
    maxChunks = EMBEDDING_MAX_CHUNKS,
  } = {},
) => {
  const normalized = normalizeChunkText(text);
  if (!normalized) {
    return [];
  }

  const safeChunkSize = Math.max(Number(chunkSize) || EMBEDDING_CHUNK_SIZE, 1);
  const safeOverlap = Math.max(
    Math.min(Number(overlap) || EMBEDDING_CHUNK_OVERLAP, safeChunkSize - 1),
    0,
  );
  const safeMaxChunks = Math.max(Number(maxChunks) || EMBEDDING_MAX_CHUNKS, 1);
  const step = Math.max(safeChunkSize - safeOverlap, 1);

  const chunks = [];
  let cursor = 0;

  while (cursor < normalized.length && chunks.length < safeMaxChunks) {
    const content = normalizeChunkText(
      normalized.slice(cursor, cursor + safeChunkSize),
    );

    if (content) {
      chunks.push({
        index: chunks.length,
        content,
        charCount: content.length,
      });
    }

    cursor += step;
  }

  return chunks;
};
