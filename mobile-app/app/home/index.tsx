import React from "react";
import {
  Animated,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { recommendationService, analyticsService } from "../../services/api";

const quickActions = [
  {
    label: "Ask AI",
    detail: "Document answers",
    icon: "robot-outline",
    route: "assistant",
  },
  {
    label: "Resources",
    detail: "Browse library",
    icon: "file-search-outline",
    route: "resources",
  },
];

const getSummaryText = (item) =>
  item?.summary?.text ||
  item?.summary ||
  item?.description ||
  item?.reason ||
  "Open this resource to view details, summaries, and study actions.";

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const entryAnim = React.useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = React.useState(false);
  const [activeShelf, setActiveShelf] = React.useState("recommended");
  const [recommendations, setRecommendations] = React.useState([]);
  const [trending, setTrending] = React.useState([]);
  const [stats, setStats] = React.useState({
    resources: 0,
    questions: 0,
    searches: 0,
  });

  React.useEffect(() => {
    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [entryAnim]);

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
            searches: counters.search || 0,
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

  const summaryItems = React.useMemo(
    () =>
      [...recommendations, ...trending]
        .filter((item) => getSummaryText(item))
        .slice(0, 3),
    [recommendations, trending],
  );

  const shelfItems = activeShelf === "recommended" ? recommendations : trending;

  const openResource = (resource) => {
    if (resource?._id) {
      navigation.navigate("resource-detail", { resource });
      return;
    }

    navigation.navigate("resources");
  };

  const renderResourceCard = (item, index) => (
    <TouchableOpacity
      key={item._id || `${item.title}-${index}`}
      style={styles.resourceCard}
      onPress={() => openResource(item)}
      activeOpacity={0.84}
    >
      <View style={styles.resourceIcon}>
        <MaterialCommunityIcons name="file-document-outline" size={20} color="#0a66c2" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.resourceTitle} numberOfLines={2}>
          {item.title || "Untitled resource"}
        </Text>
        <Text style={styles.resourceMeta} numberOfLines={2}>
          {activeShelf === "recommended"
            ? item.reason || item.subject || "Recommended for your study history"
            : `Trend score ${item.trendScore || 0}`}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#98a2b3" />
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={{
          opacity: entryAnim,
          transform: [
            {
              translateY: entryAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        }}
      >
        <View style={styles.hero}>
          <View style={styles.heroTopline}>
            <View style={styles.statusDot} />
            <Text style={styles.heroKicker}>AcadHub workspace</Text>
          </View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.subGreeting}>
            Pick up resources, questions, and summaries without losing your flow.
          </Text>

          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionButton}
                onPress={() => navigation.navigate(action.route)}
                activeOpacity={0.85}
              >
                <View style={styles.actionIcon}>
                  <MaterialCommunityIcons name={action.icon as any} size={22} color="#0a66c2" />
                </View>
                <Text style={styles.actionButtonText}>{action.label}</Text>
                <Text style={styles.actionButtonDetail}>{action.detail}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="eye-outline" size={20} color="#0a66c2" />
            <Text style={styles.statNumber}>{stats.resources}</Text>
            <Text style={styles.statLabel}>Viewed</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="message-question-outline" size={20} color="#0a66c2" />
            <Text style={styles.statNumber}>{stats.questions}</Text>
            <Text style={styles.statLabel}>Questions</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="magnify" size={20} color="#0a66c2" />
            <Text style={styles.statNumber}>{stats.searches}</Text>
            <Text style={styles.statLabel}>Searches</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Document summaries</Text>
              <Text style={styles.sectionSubtitle}>Recent material worth revisiting</Text>
            </View>
            <MaterialCommunityIcons name="text-box-search-outline" size={22} color="#667085" />
          </View>

          {loading ? (
            <View style={styles.placeholder}>
              <ActivityIndicator color="#0a66c2" />
            </View>
          ) : summaryItems.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={28} color="#98a2b3" />
              <Text style={styles.emptyTitle}>No summaries yet</Text>
              <Text style={styles.emptyText}>
                Open resources or generate summaries to build this shelf.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.summaryRail}
            >
              {summaryItems.map((item, index) => (
                <TouchableOpacity
                  key={item._id || `${item.title}-${index}`}
                  style={styles.summaryCard}
                  onPress={() => openResource(item)}
                  activeOpacity={0.84}
                >
                  <Text style={styles.summaryTitle} numberOfLines={2}>
                    {item.title || "Study resource"}
                  </Text>
                  <Text style={styles.summaryText} numberOfLines={4}>
                    {getSummaryText(item)}
                  </Text>
                  <Text style={styles.summaryLink}>Open resource</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Study shelf</Text>
              <Text style={styles.sectionSubtitle}>Switch between recommended and trending</Text>
            </View>
          </View>

          <View style={styles.segmentedControl}>
            {[
              { key: "recommended", label: "For you" },
              { key: "trending", label: "Trending" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.segmentButton,
                  activeShelf === tab.key && styles.segmentButtonActive,
                ]}
                onPress={() => setActiveShelf(tab.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    activeShelf === tab.key && styles.segmentTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={styles.placeholder}>
              <ActivityIndicator color="#0a66c2" />
            </View>
          ) : shelfItems.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="file-document-outline" size={28} color="#98a2b3" />
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyText}>
                Browse and view resources to personalize this area.
              </Text>
            </View>
          ) : (
            <View style={styles.resourceList}>
              {shelfItems.map(renderResourceCard)}
            </View>
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f2ef",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#d0d7de",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  heroTopline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16a34a",
  },
  heroKicker: {
    fontSize: 12,
    color: "#667085",
    fontWeight: "700",
    textTransform: "uppercase",
    fontFamily: "Roboto",
  },
  greeting: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#1f2328",
    fontFamily: "Roboto",
  },
  subGreeting: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 23,
    color: "#475467",
    fontFamily: "Roboto",
  },
  quickGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d0d7de",
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#e8f3ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionButtonText: {
    color: "#1f2328",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "Roboto",
  },
  actionButtonDetail: {
    color: "#667085",
    fontSize: 12,
    marginTop: 3,
    fontFamily: "Roboto",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: "#d0d7de",
  },
  statNumber: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2328",
    fontFamily: "Roboto",
  },
  statLabel: {
    fontSize: 12,
    color: "#667085",
    marginTop: 2,
    fontFamily: "Roboto",
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2328",
    fontFamily: "Roboto",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#667085",
    marginTop: 3,
    fontFamily: "Roboto",
  },
  placeholder: {
    minHeight: 120,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d0d7de",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    minHeight: 140,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d0d7de",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "800",
    color: "#1f2328",
    fontFamily: "Roboto",
  },
  emptyText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: "#667085",
    textAlign: "center",
    fontFamily: "Roboto",
  },
  summaryRail: {
    gap: 12,
    paddingRight: 16,
  },
  summaryCard: {
    width: 238,
    minHeight: 162,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d0d7de",
  },
  summaryTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: "#1f2328",
    fontFamily: "Roboto",
  },
  summaryText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#475467",
    fontFamily: "Roboto",
  },
  summaryLink: {
    marginTop: "auto",
    paddingTop: 12,
    fontSize: 13,
    fontWeight: "800",
    color: "#0a66c2",
    fontFamily: "Roboto",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#e7ecf0",
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  segmentText: {
    color: "#667085",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "Roboto",
  },
  segmentTextActive: {
    color: "#0a66c2",
  },
  resourceList: {
    gap: 10,
  },
  resourceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d0d7de",
  },
  resourceIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#e8f3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  resourceTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800",
    color: "#1f2328",
    fontFamily: "Roboto",
  },
  resourceMeta: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#667085",
    fontFamily: "Roboto",
  },
});

export default HomeScreen;
