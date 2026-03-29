import AsyncStorage from "@react-native-async-storage/async-storage";

const RATE_LIMIT_KEY = "qa_rate_limit";
const RATE_LIMIT_REQUESTS = 5; // 5 requests per window
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour window

const getUserScope = async () => {
  try {
    const rawUser = await AsyncStorage.getItem("user");
    if (!rawUser) {
      return "anonymous";
    }

    const user = JSON.parse(rawUser);
    return user?.uid || user?._id || user?.email || "anonymous";
  } catch (error) {
    console.error("Rate limit user scope error:", error);
    return "anonymous";
  }
};

const getScopedRateLimitKey = async () => {
  const scope = await getUserScope();
  return `${RATE_LIMIT_KEY}:${scope}`;
};

const removeLegacySharedKey = async () => {
  try {
    const legacy = await AsyncStorage.getItem(RATE_LIMIT_KEY);
    if (legacy) {
      await AsyncStorage.removeItem(RATE_LIMIT_KEY);
    }
  } catch (error) {
    console.error("Rate limit legacy cleanup error:", error);
  }
};

export const rateLimiter = {
  async checkLimit() {
    try {
      await removeLegacySharedKey();
      const storageKey = await getScopedRateLimitKey();
      const stored = await AsyncStorage.getItem(storageKey);
      const now = Date.now();

      if (!stored) {
        return { allowed: true, remaining: RATE_LIMIT_REQUESTS };
      }

      const { requests, windowStart } = JSON.parse(stored);

      // If window has expired, reset
      if (now - windowStart > RATE_LIMIT_WINDOW) {
        return { allowed: true, remaining: RATE_LIMIT_REQUESTS };
      }

      // Check if requests exceeded
      if (requests >= RATE_LIMIT_REQUESTS) {
        const resetTime = new Date(windowStart + RATE_LIMIT_WINDOW);
        return {
          allowed: false,
          remaining: 0,
          resetTime,
        };
      }

      return { allowed: true, remaining: RATE_LIMIT_REQUESTS - requests };
    } catch (error) {
      console.error("Rate limit check error:", error);
      return { allowed: true, remaining: RATE_LIMIT_REQUESTS };
    }
  },

  async recordRequest() {
    try {
      await removeLegacySharedKey();
      const storageKey = await getScopedRateLimitKey();
      const stored = await AsyncStorage.getItem(storageKey);
      const now = Date.now();

      if (!stored) {
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({
            requests: 1,
            windowStart: now,
          })
        );
        return;
      }

      const { requests, windowStart } = JSON.parse(stored);

      // If window expired, reset
      if (now - windowStart > RATE_LIMIT_WINDOW) {
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({
            requests: 1,
            windowStart: now,
          })
        );
        return;
      }

      // Increment requests
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify({
          requests: requests + 1,
          windowStart,
        })
      );
    } catch (error) {
      console.error("Rate limit record error:", error);
    }
  },

  async reset() {
    try {
      const storageKey = await getScopedRateLimitKey();
      await AsyncStorage.removeItem(storageKey);
      await AsyncStorage.removeItem(RATE_LIMIT_KEY);
    } catch (error) {
      console.error("Rate limit reset error:", error);
    }
  },
};
