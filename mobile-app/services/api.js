import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  fetchSignInMethodsForEmail,
} from "@firebase/auth";
import {
  initializeFirebaseAuth,
  getFirebaseAuthInstance,
} from "./firebase";
import { rateLimiter } from "./rateLimiter";

function getApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL) {
    const configuredUrl =
      process.env.EXPO_PUBLIC_API_BASE_URL ||
      process.env.EXPO_PUBLIC_API_URL;

    if (Platform.OS === "android") {
      return configuredUrl
        .replace("localhost", "10.0.2.2")
        .replace("127.0.0.1", "10.0.2.2");
    }

    return configuredUrl;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000/api/v1";
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.linkingUri;

  if (hostUri && typeof hostUri === "string") {
    const normalizedHost = hostUri
      .replace(/^[a-z]+:\/\//i, "")
      .split("/")[0]
      .split(":")[0];

    if (normalizedHost) {
      return `http://${normalizedHost}:3000/api/v1`;
    }
  }

  return "http://localhost:3000/api/v1";
}

const API_BASE_URL = getApiBaseUrl();
const WEB_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_URL ||
  API_BASE_URL.replace(/\/api\/v1\/?$/, "").replace(":3000", ":5173");

const extractPayload = (responseData) => responseData?.data || responseData || {};

const normalizeError = (error, fallbackMessage) => {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage;

  const normalized = new Error(message);
  normalized.code = error?.code;
  normalized.status = error?.response?.status;
  normalized.original = error;
  return normalized;
};

if (__DEV__) {
  console.log("Mobile API Base URL:", API_BASE_URL);
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      let token = null;
      try {
        const auth = getFirebaseAuthInstance();
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
          await AsyncStorage.setItem("authToken", token);
        }
      } catch (error) {
        // Firebase auth may not be initialized for very early requests.
      }

      if (!token) {
        token = await AsyncStorage.getItem("authToken");
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting auth token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("user");
      console.warn("Token expired, cleared from storage");
    }
    return Promise.reject(error);
  },
);

export const authService = {
  async initialize() {
    try {
      await initializeFirebaseAuth();
      console.log("Auth service initialized");
    } catch (error) {
      console.error("Failed to initialize auth service:", error);
      throw error;
    }
  },

  async login(email, password) {
    try {
      const auth = getFirebaseAuthInstance();
      const { user: firebaseUser } = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const token = await firebaseUser.getIdToken();
      await AsyncStorage.setItem("authToken", token);

      const response = await apiClient.post("/auth/login", {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName,
      });

      const user = response?.data?.data?.user || response?.data?.user;

      if (!user) {
        throw new Error("Invalid auth response from backend");
      }

      return { user, token };
    } catch (error) {
      console.error("Login error:", error);
      throw normalizeError(error, "Login failed");
    }
  },

  async signup(userData) {
    try {
      const auth = getFirebaseAuthInstance();
      const { name, email, password, university, branch, semester } = userData;

      let firebaseUser;

      try {
        const created = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        firebaseUser = created.user;
      } catch (error) {
        if (error?.code !== "auth/email-already-in-use") {
          throw error;
        }

        const existingMethods = await fetchSignInMethodsForEmail(auth, email);
        if (existingMethods.includes("password")) {
          const signedIn = await signInWithEmailAndPassword(auth, email, password);
          firebaseUser = signedIn.user;
        } else {
          throw new Error(
            "An account with this email already exists. Please sign in using the original method.",
          );
        }
      }

      const token = await firebaseUser.getIdToken();
      await AsyncStorage.setItem("authToken", token);

      const response = await apiClient.post("/auth/signup", {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name,
        role: "student",
        department: branch || "Computer Science",
        branch,
        university,
        semester,
      });

      const user = response?.data?.data?.user || response?.data?.user;

      if (!user) {
        throw new Error("Invalid auth response from backend");
      }

      return { user, token };
    } catch (error) {
      console.error("Signup error:", error);
      throw normalizeError(error, "Signup failed");
    }
  },

  async logout() {
    try {
      await apiClient.post("/auth/logout");
      await AsyncStorage.removeItem("authToken");
      const auth = getFirebaseAuthInstance();
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      throw normalizeError(error, "Logout failed");
    }
  },

  async getCurrentUser() {
    try {
      const auth = getFirebaseAuthInstance();
      return auth.currentUser;
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  },
};

export const resourceService = {
  async getResources(filters = "") {
    try {
      let url = "/resources";
      if (filters) {
        if (filters.startsWith("/resources")) {
          url = filters;
        } else if (filters.startsWith("?")) {
          url += filters;
        } else if (filters.startsWith("/")) {
          url += filters;
        } else {
          url += `?${filters}`;
        }
      }
      const response = await apiClient.get(url);
      return extractPayload(response.data);
    } catch (error) {
      console.error("Get resources error:", error);
      throw normalizeError(error, "Failed to load resources");
    }
  },

  async getResource(id) {
    try {
      const response = await apiClient.get(`/resources/${id}`);
      return extractPayload(response.data);
    } catch (error) {
      console.error("Get resource error:", error);
      throw normalizeError(error, "Failed to load resource");
    }
  },

  async uploadResource(formDataOrFile) {
    try {
      let uploadData = formDataOrFile;

      if (
        uploadData &&
        typeof uploadData === "object" &&
        !FormData.prototype.isPrototypeOf(uploadData)
      ) {
        const [file, metadata] = [formDataOrFile, arguments[1] || {}];
        uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("title", metadata.title || file.name);
        uploadData.append("description", metadata.description || "");
        uploadData.append("category", metadata.category || "other");
        uploadData.append("subject", metadata.subject || "");
        uploadData.append("semester", metadata.semester || "");
        uploadData.append("academicYear", metadata.academicYear || "");
        uploadData.append("tags", JSON.stringify(metadata.tags || []));
      }

      const response = await apiClient.post("/resources", uploadData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return extractPayload(response.data);
    } catch (error) {
      console.error("Upload error:", error);
      throw normalizeError(error, "Failed to upload resource");
    }
  },

  async deleteResource(resourceId) {
    try {
      const response = await apiClient.delete(`/resources/${resourceId}`);
      return extractPayload(response.data);
    } catch (error) {
      console.error("Delete error:", error);
      throw normalizeError(error, "Failed to delete resource");
    }
  },

  async downloadResource(resourceId) {
    try {
      const response = await apiClient.get(`/resources/${resourceId}/download`);
      return extractPayload(response.data);
    } catch (error) {
      console.error("Download error:", error);
      throw normalizeError(error, "Failed to download resource");
    }
  },

  async likeResource(resourceId) {
    try {
      const response = await apiClient.post(`/resources/${resourceId}/like`);
      return extractPayload(response.data);
    } catch (error) {
      console.error("Like error:", error);
      throw normalizeError(error, "Failed to update like");
    }
  },

  async generateSummary(resourceId) {
    try {
      const response = await apiClient.post(`/resources/${resourceId}/generate-summary`);
      return extractPayload(response.data);
    } catch (error) {
      console.error("Generate summary error:", error);
      throw normalizeError(error, "Failed to generate summary");
    }
  },

  async updateTags(resourceId, tags) {
    try {
      const response = await apiClient.patch(`/resources/${resourceId}/tags`, {
        tags,
      });
      return extractPayload(response.data);
    } catch (error) {
      console.error("Update tags error:", error);
      throw normalizeError(error, "Failed to update tags");
    }
  },

  async getUserResources() {
    try {
      const response = await apiClient.get("/resources/my-uploads");
      return extractPayload(response.data);
    } catch (error) {
      console.error("Get user resources error:", error);
      throw normalizeError(error, "Failed to load your uploads");
    }
  },

  async getUserLikedResources() {
    try {
      const response = await apiClient.get("/resources/my-likes");
      return extractPayload(response.data);
    } catch (error) {
      console.error("Get liked resources error:", error);
      throw normalizeError(error, "Failed to load liked resources");
    }
  },

  getDownloadUrl(resourceId) {
    return `${API_BASE_URL}/resources/${resourceId}/download`;
  },

  getViewUrl(resourceId) {
    return `${API_BASE_URL}/resources/${resourceId}/view`;
  },

  getViewerPageUrl(resourceId) {
    return `${WEB_BASE_URL}/resources/${resourceId}/view`;
  },
};

export const qaService = {
  async askQuestion(question, resourceIds = null) {
    try {
      const limitCheck = await rateLimiter.checkLimit();

      if (!limitCheck.allowed) {
        const error = new Error(
          `Rate limit exceeded. Max 5 requests per hour. Reset at ${limitCheck.resetTime?.toLocaleTimeString()}`,
        );
        error.code = "RATE_LIMIT_EXCEEDED";
        throw error;
      }

      const response = await apiClient.post("/qa/ask", {
        question,
        resourceIds,
      });
      const payload = extractPayload(response.data);

      await rateLimiter.recordRequest();

      return {
        ...payload,
        remaining: limitCheck.remaining - 1,
      };
    } catch (error) {
      console.error("QA error:", error);
      throw normalizeError(error, "Failed to get answer");
    }
  },

  async getRateLimitStatus() {
    return rateLimiter.checkLimit();
  },

  async storeInteraction(interaction) {
    try {
      const response = await apiClient.post("/qa/store-interaction", interaction);
      return extractPayload(response.data);
    } catch (error) {
      console.warn("Failed to store QA interaction:", error);
      return null;
    }
  },
};

export const searchService = {
  async search(query, filters = {}) {
    try {
      const response = await apiClient.post("/search/semantic", {
        query,
        filters,
      });
      return extractPayload(response.data);
    } catch (error) {
      console.error("Search error:", error);
      throw normalizeError(error, "Search failed");
    }
  },
};

export const analyticsService = {
  async trackEvent(eventName, eventData = {}) {
    try {
      await apiClient.post("/analytics/track", {
        type: eventName,
        ...eventData,
      });
    } catch (error) {
      console.warn("Failed to track event:", error);
    }
  },

  async trackPageView(pageName) {
    return this.trackEvent("page_view", { page: pageName });
  },

  async trackActivity(activity) {
    return this.trackEvent(activity.type, activity);
  },

  async getUserStats() {
    try {
      const response = await apiClient.get("/analytics/user-stats");
      return response.data;
    } catch (error) {
      console.error("Error getting user stats:", error);
      throw normalizeError(error, "Failed to load stats");
    }
  },
};

export const recommendationService = {
  async getRecommendations(limit = 10) {
    try {
      const response = await apiClient.get("/recommendations/for-you", {
        params: { limit },
      });
      return extractPayload(response.data);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      throw normalizeError(error, "Failed to load recommendations");
    }
  },

  async getTrending(limit = 10) {
    try {
      const response = await apiClient.get("/recommendations/trending", {
        params: { limit },
      });
      return extractPayload(response.data);
    } catch (error) {
      console.error("Error getting trending recommendations:", error);
      throw normalizeError(error, "Failed to load trending resources");
    }
  },
};

export default apiClient;
