import { Resource } from "../models/Resource.js";
import { logger } from "../config/logger.js";
import {
  AiProviderUnavailableError,
  generateAnswer,
  generateEmbedding,
} from "./ai.service.js";
import {
  ensureResourceIsIndexed,
  findRelevantChunks,
} from "./resourceIndex.service.js";

const AI_UNAVAILABLE_MESSAGE =
  "AI is temporarily unavailable. Please try again.";

const buildFallbackResult = (processingTime = 0) => ({
  answer: AI_UNAVAILABLE_MESSAGE,
  sources: [],
  confidence: 0,
  processingTime,
  tokensUsed: 0,
  answerMode: "fallback",
  answerLabel: "AI Unavailable",
  sourceCount: 0,
});

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "what",
  "when",
  "where",
  "which",
  "about",
  "into",
  "your",
  "their",
  "there",
  "explain",
  "tell",
  "please",
  "would",
  "could",
  "should",
  "using",
  "used",
  "into",
  "than",
  "them",
]);

const buildSnippet = (content, terms) => {
  const safeContent = String(content || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!safeContent) {
    return "";
  }

  const matchIndex = terms
    .map((term) => safeContent.toLowerCase().indexOf(term))
    .find((index) => index >= 0);

  if (matchIndex == null || matchIndex < 0) {
    return safeContent.slice(0, 280);
  }

  const start = Math.max(0, matchIndex - 80);
  const end = Math.min(safeContent.length, matchIndex + 220);
  return safeContent.slice(start, end).trim();
};

const scoreLexicalMatch = (resource, terms) => {
  const title = String(resource.title || "").toLowerCase();
  const description = String(resource.description || "").toLowerCase();
  const content = String(resource.extractedContent || "").toLowerCase();

  let score = 0;

  for (const term of terms) {
    const titleOccurrences = title.split(term).length - 1;
    const descriptionOccurrences = description.split(term).length - 1;
    const contentOccurrences = content.split(term).length - 1;
    const firstPosition = content.indexOf(term);

    score += titleOccurrences * 5;
    score += descriptionOccurrences * 2;
    score += Math.min(contentOccurrences, 5);

    if (firstPosition >= 0) {
      score += firstPosition < 160 ? 2 : 1;
    }
  }

  return score;
};

const buildLexicalFallback = async ({
  question,
  resourceIds = [],
  processingTime = 0,
}) => {
  const terms = [
    ...new Set(
      String(question || "")
        .toLowerCase()
        .match(/[a-z0-9]{3,}/g) || [],
    ),
  ]
    .filter((term) => !STOP_WORDS.has(term))
    .slice(0, 8);

  const resourceFilter =
    resourceIds.length > 0
      ? { _id: { $in: resourceIds } }
      : { isApproved: true };

  const resources = await Resource.find(resourceFilter)
    .select("title extractedContent description")
    .limit(resourceIds.length > 0 ? resourceIds.length : 20)
    .lean();

  const ranked = resources
    .map((resource) => {
      const score = scoreLexicalMatch(resource, terms);
      return {
        resource,
        score,
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  if (ranked.length === 0) {
    return buildFallbackResult(processingTime);
  }

  const sources = ranked.map(({ resource, score }, index) => ({
    docId: resource._id,
    title: resource.title || `Document ${index + 1}`,
    snippet: buildSnippet(
      resource.extractedContent || resource.description || resource.title,
      terms,
    ),
    score: Math.min(1, score / Math.max(terms.length, 1)),
    chunkIndex: 0,
    pageNumber: 1,
  }));

  const answerLines = [
    "AI is temporarily unavailable, but these matching document excerpts may help:",
    ...sources.map(
      (source, index) => `${index + 1}. ${source.title}: ${source.snippet}`,
    ),
  ];

  return {
    answer: answerLines.join("\n"),
    sources,
    confidence: Math.min(1, sources[0]?.score || 0),
    processingTime,
    tokensUsed: 0,
    answerMode: "fallback_context",
    answerLabel: "Relevant Excerpts",
    sourceCount: sources.length,
  };
};

export const answerQuestion = async ({ question, resourceIds = [] }) => {
  const startedAt = Date.now();

  try {
    if (resourceIds.length > 0) {
      const resourcesToIndex = await Resource.find({
        _id: { $in: resourceIds },
        semanticIndexEligible: true,
      });

      for (const resource of resourcesToIndex) {
        if (!resource.embedded) {
          await ensureResourceIsIndexed(resource);
        }
      }
    }

    const questionEmbedding = await generateEmbedding(question);
    const chunkMatches = await findRelevantChunks({
      questionEmbedding,
      resourceIds,
      limit: 3,
      numCandidates: 30,
    });

    if (chunkMatches.length === 0) {
      return {
        answer:
          "I could not find relevant document context to answer that question.",
        sources: [],
        confidence: 0,
        processingTime: Date.now() - startedAt,
        tokensUsed: 0,
        answerMode: "document_fallback",
        answerLabel: "No Matching Context",
        sourceCount: 0,
      };
    }

    const docIds = [
      ...new Set(chunkMatches.map((match) => String(match.docId))),
    ];
    const resources = await Resource.find({ _id: { $in: docIds } })
      .select("title subject category semester")
      .lean();
    const resourceMap = new Map(
      resources.map((resource) => [String(resource._id), resource]),
    );

    const sources = chunkMatches.map((match) => {
      const resource = resourceMap.get(String(match.docId));
      return {
        docId: match.docId,
        title: resource?.title || "Document",
        snippet: match.content,
        score: Number(match.score) || 0,
        chunkIndex: match.chunkIndex || 0,
        pageNumber: 1,
      };
    });

    const context = sources
      .map(
        (source, index) =>
          `Source ${index + 1} - ${source.title}\n${source.snippet}`,
      )
      .join("\n\n");

    const answer = await generateAnswer(context, question);
    const confidence =
      sources.reduce((sum, source) => sum + (Number(source.score) || 0), 0) /
      Math.max(sources.length, 1);

    return {
      answer: answer || AI_UNAVAILABLE_MESSAGE,
      sources,
      confidence: Math.max(0, Math.min(confidence, 1)),
      processingTime: Date.now() - startedAt,
      tokensUsed: 0,
      answerMode: "ai",
      answerLabel: "AI Answer",
      sourceCount: sources.length,
    };
  } catch (error) {
    logger.error(`RAG error: ${error.message} (status: ${error.status})`);

    if (error instanceof AiProviderUnavailableError) {
      logger.warn(`Using fallback mode: ${error.message}`);
      return buildLexicalFallback({
        question,
        resourceIds,
        processingTime: Date.now() - startedAt,
      });
    }

    logger.error(`RAG pipeline failed: ${error.message}`);
    return buildFallbackResult(Date.now() - startedAt);
  }
};
