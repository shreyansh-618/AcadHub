import { logger } from "../config/logger.js";

export const AI_PROVIDER = "gemini";
const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-1.5-flash";
const GEMINI_CHAT_MODEL_FALLBACKS = (
  process.env.GEMINI_CHAT_MODEL_FALLBACKS ||
  "gemini-2.5-flash,gemini-2.0-flash,gemini-1.5-flash,gemini-1.5-pro"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const EMBEDDING_DIMENSIONS = Number.parseInt(
  process.env.EMBEDDING_DIMENSIONS || "3072",
  10,
);
export const EMBEDDING_MODEL_NAME = GEMINI_EMBEDDING_MODEL;
export const CHAT_MODEL_NAME = GEMINI_CHAT_MODEL;

const AI_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_EMBEDDING_CALLS_PER_PROCESS = Number.parseInt(
  process.env.MAX_EMBEDDING_CALLS_PER_PROCESS || "100",
  10,
);

let providerCooldownUntil = 0;
let lastCooldownReason = null;
let resolvedChatModelName = null;
let embeddingCalls = 0;

export class AiProviderUnavailableError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "AiProviderUnavailableError";
    this.code = options.code || "AI_PROVIDER_UNAVAILABLE";
    this.status = options.status || 503;
  }
}

const normalizePromptText = (value = "", maxLength = 12000) =>
  String(value)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);

const getGeminiApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return apiKey;
};

const isQuotaOrRateLimitError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.status === 429 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("resource exhausted")
  );
};

const isModelUnavailableError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.status === 404 &&
    (message.includes("not found") || message.includes("not supported"))
  );
};

const ensureProviderAvailable = () => {
  if (providerCooldownUntil > Date.now()) {
    throw new AiProviderUnavailableError(
      lastCooldownReason ||
        "Gemini is temporarily unavailable. Please try again later.",
      {
        code: "AI_PROVIDER_COOLDOWN",
        status: 503,
      },
    );
  }
};

const runAiOperation = async (operationName, fn) => {
  ensureProviderAvailable();

  try {
    return await fn();
  } catch (error) {
    if (isQuotaOrRateLimitError(error)) {
      providerCooldownUntil = Date.now() + AI_COOLDOWN_MS;
      lastCooldownReason =
        "Gemini quota or rate limit reached. AI features are temporarily unavailable.";
      logger.warn(`${operationName} skipped: ${lastCooldownReason}`);
      throw new AiProviderUnavailableError(lastCooldownReason);
    }

    throw error;
  }
};

const callGemini = async ({ version = "v1", model, action, body }) => {
  const apiKey = getGeminiApiKey();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/${version}/models/${model}:${action}?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data?.error?.message || `Gemini API error (${response.status})`,
    );
    error.status = response.status;
    throw error;
  }

  return data;
};

const cleanJsonFence = (value = "") =>
  String(value)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const getChatModelCandidates = () => [
  ...new Set([GEMINI_CHAT_MODEL, ...GEMINI_CHAT_MODEL_FALLBACKS]),
];

export const generateEmbedding = async (text) => {
  const input = normalizePromptText(text, 8000);
  if (!input) {
    throw new Error("Text required for embedding");
  }

  embeddingCalls += 1;
  if (embeddingCalls > MAX_EMBEDDING_CALLS_PER_PROCESS) {
    const message = `Embedding quota limit reached (${MAX_EMBEDDING_CALLS_PER_PROCESS} calls per process)`;
    logger.warn(message);
    throw new AiProviderUnavailableError(message, {
      code: "EMBEDDING_QUOTA_LIMIT",
      status: 429,
    });
  }

  const result = await runAiOperation("Embedding", async () =>
    callGemini({
      version: "v1beta",
      model: GEMINI_EMBEDDING_MODEL,
      action: "embedContent",
      body: {
        content: {
          parts: [{ text: input }],
        },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
    }),
  );

  const embedding = result?.embedding?.values;

  if (!Array.isArray(embedding)) {
    throw new Error("Invalid embedding response");
  }

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`,
    );
  }

  return embedding;
};

export const generateAnswer = async (context, question) => {
  const safeContext = normalizePromptText(context, 15000);
  const safeQuestion = normalizePromptText(question, 1000);

  if (!safeQuestion) {
    throw new Error("Question required");
  }

  const prompt = `
You are an AI assistant. Answer ONLY using the provided context.
If the answer is not in the context, say "I could not find relevant information."

Context:
${safeContext || "No relevant context"}

Question:
${safeQuestion}
`;

  const result = await runAiOperation("Chat", async () => {
    const candidateModels = resolvedChatModelName
      ? [resolvedChatModelName, ...getChatModelCandidates()]
      : getChatModelCandidates();
    let lastError = null;

    for (const modelName of [...new Set(candidateModels)]) {
      try {
        const response = await callGemini({
          version: "v1beta",
          model: modelName,
          action: "generateContent",
          body: {
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          },
        });

        if (resolvedChatModelName !== modelName) {
          resolvedChatModelName = modelName;
          logger.info(`Gemini chat model resolved to ${modelName}`);
        }

        return response;
      } catch (error) {
        lastError = error;
        if (!isModelUnavailableError(error)) {
          throw error;
        }

        logger.warn(
          `Gemini chat model ${modelName} unavailable, trying next fallback`,
        );
      }
    }

    throw lastError || new Error("No supported Gemini chat model was found");
  });

  return (
    result?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("") || "No response"
  );
};

export const summarizeText = async (text) => {
  try {
    return await generateAnswer(
      text,
      "Summarize this in 3-4 concise sentences.",
    );
  } catch (err) {
    logger.warn(`Summary skipped: ${err.message}`);
    return null;
  }
};

export const extractTags = async (text) => {
  try {
    const response = await generateAnswer(
      text,
      'Return 5 topic tags as JSON array like ["AI","ML"]',
    );

    return JSON.parse(cleanJsonFence(response))
      .slice(0, 5)
      .map((tag) => ({ name: tag, confidence: 0.8 }));
  } catch {
    return [];
  }
};
