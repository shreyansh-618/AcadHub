export const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || "http://localhost:8000";

const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY;

export const getAiServiceHeaders = (headers = {}) => ({
  ...(AI_SERVICE_API_KEY ? { "x-api-key": AI_SERVICE_API_KEY } : {}),
  ...headers,
});

export const getAiServiceAxiosConfig = (config = {}) => ({
  ...config,
  headers: getAiServiceHeaders(config.headers || {}),
});

export const getAiServiceFetchOptions = (options = {}) => ({
  ...options,
  headers: getAiServiceHeaders(options.headers || {}),
});
