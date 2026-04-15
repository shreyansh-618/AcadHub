const normalizeChunkText = (value = "") =>
  String(value)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const splitOversizedSegment = (segment, maxChars) => {
  const pieces = [];
  let remaining = segment.trim();

  while (remaining.length > maxChars) {
    const slice = remaining.slice(0, maxChars);
    const breakpoints = [
      slice.lastIndexOf("\n"),
      slice.lastIndexOf(". "),
      slice.lastIndexOf("? "),
      slice.lastIndexOf("! "),
      slice.lastIndexOf(" "),
    ];
    const splitAt = breakpoints.find((point) => point > maxChars * 0.5);
    const chunk =
      splitAt && splitAt > 0 ? remaining.slice(0, splitAt + 1) : slice;

    pieces.push(normalizeChunkText(chunk));
    remaining = remaining.slice(chunk.length).trim();
  }

  if (remaining) {
    pieces.push(normalizeChunkText(remaining));
  }

  return pieces.filter(Boolean);
};

export const splitTextIntoChunks = (text, { maxChars = 500 } = {}) => {
  const normalized = normalizeChunkText(text);
  if (!normalized) {
    return [];
  }

  const segments = normalized
    .split(/\n{2,}/)
    .flatMap((segment) =>
      segment.length > maxChars
        ? splitOversizedSegment(segment, maxChars)
        : [normalizeChunkText(segment)],
    )
    .filter(Boolean);

  const chunks = [];
  let current = "";

  for (const segment of segments) {
    const candidate = current ? `${current}\n\n${segment}` : segment;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
    }
    current = segment;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((content, index) => ({
    index,
    content,
    charCount: content.length,
  }));
};
