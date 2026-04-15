import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../store";
import { resourceService, analyticsService } from "../../services/api";

const getProcessingStatusMeta = (status) => {
  switch (status) {
    case "indexed":
      return { label: "Indexed", backgroundColor: "#DCFCE7", color: "#166534" };
    case "processing":
      return { label: "Processing", backgroundColor: "#FEF3C7", color: "#92400E" };
    case "pending_embedding":
      return {
        label: "Retrying Embedding",
        backgroundColor: "#FFEDD5",
        color: "#9A3412",
      };
    case "failed":
      return { label: "Index Failed", backgroundColor: "#FEE2E2", color: "#991B1B" };
    default:
      return { label: "Pending", backgroundColor: "#E5E7EB", color: "#374151" };
  }
};

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const [userResources, setUserResources] = useState([]);
  const [likedResources, setLikedResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourceError, setResourceError] = useState(null);

  useEffect(() => {
    void loadProfileResources();
  }, []);

  const loadProfileResources = async () => {
    setLoadingResources(true);
    setResourceError(null);
    try {
      const [uploadedResult, likedResult] = await Promise.all([
        resourceService.getUserResources(),
        resourceService.getUserLikedResources(),
      ]);
      setUserResources(uploadedResult.resources || []);
      setLikedResources(likedResult.resources || []);
    } catch (error) {
      console.error("Error loading user resources:", error);
      setResourceError("Failed to load your profile resources");
    } finally {
      setLoadingResources(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Logout",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleResourcePress = async (resource) => {
    await analyticsService.trackActivity({
      type: "view",
      resourceId: resource._id,
      topicName: resource.metadata?.subject || resource.subject,
      metadata: { deviceType: "mobile", screen: "profile" },
    });

    navigation.navigate("resource-detail", { resource });
  };

  const renderResourceItem = ({ item }) => {
    const statusMeta = getProcessingStatusMeta(item.processingStatus);

    return (
      <TouchableOpacity
        style={styles.resourceCard}
        onPress={() => handleResourcePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="file-document" size={18} color="#007AFF" />
          <Text style={styles.category}>{item.category}</Text>
          <View style={styles.spacer} />
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusMeta.backgroundColor },
            ]}
          >
            <Text style={[styles.statusText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
          <View style={styles.dateSpacer} />
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <Text style={styles.resourceTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.resourceSubject}>
          {item.subject || item.metadata?.subject || "General"}
        </Text>

        <View style={styles.resourceFooter}>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="download" size={12} color="#666" />
            <Text style={styles.statText}>{item.downloads || 0}</Text>
          </View>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="heart" size={12} color="#FF6B6B" />
            <Text style={styles.statText}>{item.likes || 0}</Text>
          </View>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="eye" size={12} color="#666" />
            <Text style={styles.statText}>{item.views || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {/* User Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.infoCard}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.name || user?.displayName || "User"}</Text>

          <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>

          {user?.department && (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>Department</Text>
              <Text style={styles.value}>{user.department}</Text>
            </>
          )}

          {user?.semester && (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>Semester</Text>
              <Text style={styles.value}>{user.semester}</Text>
            </>
          )}
        </View>
      </View>

      {/* My Uploads Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Uploads</Text>
          <TouchableOpacity onPress={loadProfileResources}>
            <MaterialCommunityIcons name="refresh" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {loadingResources ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : resourceError ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={32}
              color="#ff3b30"
            />
            <Text style={styles.errorText}>{resourceError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadProfileResources}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : userResources.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={40}
              color="#ccc"
            />
            <Text style={styles.emptyText}>No uploads yet</Text>
            <Text style={styles.emptySubtext}>
              Upload resources to see them here
            </Text>
          </View>
        ) : (
          <FlatList
            data={userResources}
            renderItem={renderResourceItem}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            contentContainerStyle={styles.uploadsList}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Liked Resources</Text>
        {likedResources.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="heart-outline"
              size={40}
              color="#ccc"
            />
            <Text style={styles.emptyText}>No liked resources yet</Text>
            <Text style={styles.emptySubtext}>
              Like resources to keep them easy to find
            </Text>
          </View>
        ) : (
          <FlatList
            data={likedResources}
            renderItem={renderResourceItem}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            contentContainerStyle={styles.uploadsList}
          />
        )}
      </View>

      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{userResources.length}</Text>
            <Text style={styles.statLabel}>Resources</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {userResources.reduce((sum, r) => sum + (r.downloads || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Downloads</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {userResources.reduce((sum, r) => sum + (r.likes || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Upload Likes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{likedResources.length}</Text>
            <Text style={styles.statLabel}>Liked</Text>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingLabel}>Notifications</Text>
          <Text style={styles.settingValue}>Enabled</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingLabel}>Download Format</Text>
          <Text style={styles.settingValue}>Auto</Text>
        </TouchableOpacity>
      </View>

      {/* Help */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Help & Support</Text>
        <TouchableOpacity style={styles.helpItem}>
          <Text style={styles.helpText}>About AcadHub</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.helpItem}>
          <Text style={styles.helpText}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.helpItem}>
          <Text style={styles.helpText}>Terms of Service</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  infoCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
  },
  label: {
    fontSize: 12,
    color: "#999",
    textTransform: "uppercase",
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginTop: 4,
  },
  loadingContainer: {
    backgroundColor: "#fff",
    padding: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 150,
  },
  errorContainer: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 150,
  },
  errorText: {
    fontSize: 14,
    color: "#ff3b30",
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: "#007AFF",
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  emptyContainer: {
    backgroundColor: "#fff",
    padding: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 150,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 4,
  },
  uploadsList: {
    gap: 12,
  },
  resourceCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  category: {
    fontSize: 11,
    fontWeight: "600",
    color: "#007AFF",
    textTransform: "capitalize",
  },
  spacer: {
    flex: 1,
  },
  date: {
    fontSize: 11,
    color: "#999",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  dateSpacer: {
    width: 6,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  resourceSubject: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  resourceFooter: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statBox: {
    width: "47%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  settingItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  settingValue: {
    fontSize: 12,
    color: "#999",
  },
  helpItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  helpText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  logoutButton: {
    backgroundColor: "#ff3b30",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ProfileScreen;
