export const API_ROOT =
  import.meta.env.VITE_API_BASE_URL ||
  "/api/v1";

export const SERVER_BASE_URL = API_ROOT.replace(/\/api\/v1\/?$/, "");
