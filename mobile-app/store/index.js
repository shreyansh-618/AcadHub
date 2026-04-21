import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  initializeFirebaseAuth,
  getFirebaseAuthInstance,
} from "../services/firebase";
import { authService } from "../services/api";

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  // Initialize auth from AsyncStorage
  initializeAuth: async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      await initializeFirebaseAuth();
      const auth = getFirebaseAuthInstance();
      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        await AsyncStorage.removeItem("authToken");
        await AsyncStorage.removeItem("user");
        set({ token: null, user: null });
        return;
      }

      const freshToken = await firebaseUser.getIdToken();
      await AsyncStorage.setItem("authToken", freshToken);

      let resolvedUser = null;

      try {
        resolvedUser = await authService.getProfile();
      } catch (error) {
        console.warn("Falling back to cached mobile user profile:", error);
      }

      if (!resolvedUser && userStr) {
        resolvedUser = JSON.parse(userStr);
      }

      if (!resolvedUser) {
        resolvedUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || "User",
        };
      }

      await AsyncStorage.setItem("user", JSON.stringify(resolvedUser));
      set({ token: freshToken, user: resolvedUser });
    } catch (error) {
      console.error("Error initializing auth:", error);
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("user");
      set({ token: null, user: null });
    }
  },

  // Login
  login: async (user, token) => {
    set({ user, token, isLoading: false });
    await AsyncStorage.setItem("authToken", token);
    await AsyncStorage.setItem("user", JSON.stringify(user));
  },

  // Logout
  logout: async () => {
    set({ user: null, token: null });
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("user");
  },

  setUser: async (user) => {
    set((state) => ({ user, token: state.token }));
    await AsyncStorage.setItem("user", JSON.stringify(user));
  },

  // Set loading
  setLoading: (isLoading) => set({ isLoading }),

  // Set error
  setError: (error) => set({ error }),
}));

export const useRecommendationStore = create((set) => ({
  recommendations: [],
  trending: [],
  isLoading: false,

  setRecommendations: (recommendations) => set({ recommendations }),
  setTrending: (trending) => set({ trending }),
  setLoading: (isLoading) => set({ isLoading }),
}));

export const useResourceStore = create((set) => ({
  resources: [],
  selectedResource: null,
  isLoading: false,
  filters: {},

  setResources: (resources) => set({ resources }),
  setSelectedResource: (resource) => set({ selectedResource: resource }),
  setLoading: (isLoading) => set({ isLoading }),
  setFilters: (filters) => set({ filters }),
}));

export const useSearchStore = create((set) => ({
  searchHistory: [],
  savedResources: [],

  addToHistory: async (query) => {
    const history = await AsyncStorage.getItem("searchHistory");
    const existingHistory = history ? JSON.parse(history) : [];
    const newHistory = [
      query,
      ...existingHistory.filter((q) => q !== query),
    ].slice(0, 20);
    await AsyncStorage.setItem("searchHistory", JSON.stringify(newHistory));
    set({ searchHistory: newHistory });
  },

  getSavedResources: async () => {
    const saved = await AsyncStorage.getItem("savedResources");
    const resources = saved ? JSON.parse(saved) : [];
    set({ savedResources: resources });
    return resources;
  },

  saveResource: async (resource) => {
    const saved = await AsyncStorage.getItem("savedResources");
    const existing = saved ? JSON.parse(saved) : [];
    const newSaved = [...existing, resource];
    await AsyncStorage.setItem("savedResources", JSON.stringify(newSaved));
    set({ savedResources: newSaved });
  },
}));
