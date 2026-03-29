import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

class ApiClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 second timeout
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem("authToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (!error.response) {
          const networkError = new Error(
            "Cannot connect to backend server at http://localhost:3000. Start backend and try again.",
          );
          networkError.code = "BACKEND_UNREACHABLE";
          return Promise.reject(networkError);
        }

        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          localStorage.removeItem("authToken");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      },
    );
  }

  get(url, config) {
    return this.client.get(url, config);
  }

  post(url, data, config) {
    return this.client.post(url, data, config);
  }

  put(url, data, config) {
    return this.client.put(url, data, config);
  }

  patch(url, data, config) {
    return this.client.patch(url, data, config);
  }

  delete(url, config) {
    return this.client.delete(url, config);
  }
}

export const apiClient = new ApiClient();
