import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { recommendationService, analyticsService } from "../../services/api";

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = React.useState(false);
  const [recommendations, setRecommendations] = React.useState([]);
  const [trending, setTrending] = React.useState([]);
  const [stats, setStats] = React.useState({ resources: 0, questions: 0 });

  React.useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [recommendationRes, trendingRes, statsRes] = await Promise.allSettled([
          recommendationService.getRecommendations(5),
          recommendationService.getTrending(5),
          analyticsService.getUserStats(),
        ]);

        if (recommendationRes.status === "fulfilled") {
          setRecommendations(recommendationRes.value.recommendations || []);
        }
        if (trendingRes.status === "fulfilled") {
          setTrending(trendingRes.value.trending || []);
        }

        if (statsRes.status === "fulfilled") {
          const byType = statsRes.value?.stats?.byType || [];
          const counters = byType.reduce((acc, row) => {
            acc[row._id] = row.count;
            return acc;
          }, {});
          setStats({
            resources: counters.view || 0,
            questions: counters.qa_asked || 0,
          });
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <Text style={styles.subGreeting}>Ready to learn?</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("assistant")}
        >
          <Text style={styles.actionButtonText}>Ask AI Assistant</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("resources")}
        >
          <Text style={styles.actionButtonText}>Browse Resources</Text>
        </TouchableOpacity>
      </View>

      {/* Recommendations Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended for You</Text>
        <Text style={styles.sectionSubtitle}>Based on your activity</Text>
        {loading ? (
          <View style={styles.placeholder}>
            <ActivityIndicator color="#007AFF" />
          </View>
        ) : recommendations.length === 0 ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              No recommendations yet. Browse resources to personalize.
            </Text>
          </View>
        ) : (
          recommendations.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.resourceItem}
              onPress={() => navigation.navigate("resources")}
            >
              <Text style={styles.resourceTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.resourceReason} numberOfLines={2}>
                {item.reason}
              </Text>
              {item.summary ? (
                <Text style={styles.resourceMeta} numberOfLines={3}>
                  {item.summary}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trending in your semester</Text>
        <Text style={styles.sectionSubtitle}>Popular with students like you</Text>
        {loading ? (
          <View style={styles.placeholder}>
            <ActivityIndicator color="#007AFF" />
          </View>
        ) : trending.length === 0 ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No trending resources yet.</Text>
          </View>
        ) : (
          trending.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.resourceItem}
              onPress={() => navigation.navigate("resources")}
            >
              <Text style={styles.resourceTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.resourceMeta} numberOfLines={2}>
                Trend score {item.trendScore || 0}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.resources}</Text>
            <Text style={styles.statLabel}>Resources</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.questions}</Text>
            <Text style={styles.statLabel}>Questions</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
  },
  subGreeting: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#667085",
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  placeholder: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    minHeight: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
  },
  resourceItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },
  resourceReason: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  resourceMeta: {
    fontSize: 12,
    color: "#475467",
    marginTop: 6,
    lineHeight: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
});

export default HomeScreen;
