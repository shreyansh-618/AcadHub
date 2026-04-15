const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const normalizeApiRoot = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "/api/v1";
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed.replace(/\/+$/, "");
  }

  return `http://${trimmed}`.replace(/\/+$/, "");
};

export const API_ROOT = normalizeApiRoot(rawApiBaseUrl);

export const SERVER_BASE_URL = API_ROOT.replace(/\/api\/v1\/?$/, "");
