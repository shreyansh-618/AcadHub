import JSZip from "jszip";
import { PDFParse } from "pdf-parse";
import { getGridFS } from "../config/database.js";
import { logger } from "../config/logger.js";

const decodeXmlEntities = (value = "") =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const normalizeText = (value = "") =>
  value
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const extractDocxText = async (buffer) => {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("text");
  if (!documentXml) return "";

  const matches = [...documentXml.matchAll(/<w:t[^>]*>(.*?)<\/w:t>/g)];
  return normalizeText(matches.map((match) => decodeXmlEntities(match[1])).join(" "));
};

const extractPptxText = async (buffer) => {
  const zip = await JSZip.loadAsync(buffer);
  const slideEntries = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((left, right) => {
      const leftIndex = Number(left.match(/slide(\d+)/)?.[1] || 0);
      const rightIndex = Number(right.match(/slide(\d+)/)?.[1] || 0);
      return leftIndex - rightIndex;
    });

  const slides = await Promise.all(
    slideEntries.map(async (entry, index) => {
      const xml = await zip.file(entry)?.async("text");
      if (!xml) return "";

      const textMatches = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)];
      const text = normalizeText(
        textMatches.map((match) => decodeXmlEntities(match[1])).join(" "),
      );

      return text ? `Slide ${index + 1}: ${text}` : "";
    }),
  );

  return normalizeText(slides.filter(Boolean).join("\n\n"));
};

const extractPdfText = async (buffer) => {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return normalizeText(result?.text || "");
};

export const extractTextFromBuffer = async (
  buffer,
  filename = "",
  fallback = "",
) => {
  if (!buffer) {
    return normalizeText(fallback);
  }

  const extension = (filename || "").split(".").pop()?.toLowerCase();

  try {
    if (extension === "txt") {
      return normalizeText(buffer.toString("utf8")) || normalizeText(fallback);
    }

    if (extension === "docx") {
      return (await extractDocxText(buffer)) || normalizeText(fallback);
    }

    if (extension === "pptx") {
      return (await extractPptxText(buffer)) || normalizeText(fallback);
    }

    if (extension === "pdf") {
      return (await extractPdfText(buffer)) || normalizeText(fallback);
    }
  } catch (error) {
    logger.warn(`Text extraction fallback used for ${filename}: ${error.message}`);
  }

  return normalizeText(fallback);
};

export const getResourceFileBuffer = async (resource) => {
  if (!resource?.fileId) {
    return null;
  }

  const gfs = getGridFS();
  const stream = gfs.openDownloadStream(resource.fileId);

  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
};

export const buildResourceContent = async (resource, fileBuffer = null) => {
  const fallback = `${resource?.title || ""} ${resource?.description || ""}`.trim();
  const buffer = fileBuffer || (await getResourceFileBuffer(resource));
  return extractTextFromBuffer(buffer, resource?.fileName || "", fallback);
};
