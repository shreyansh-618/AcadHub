import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { resourceService, analyticsService } from "../../services/api";
import { useAuthStore } from "../../store";

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

const ResourceDetailScreen = ({ route, navigation }) => {
  const { resource: initialResource } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [resource, setResource] = useState(initialResource);
  const [loading, setLoading] = useState(!initialResource);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialResource?.likes || 0);
  const [deleting, setDeleting] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(initialResource?.summary || null);
  const [editingTags, setEditingTags] = useState(false);
  const [tagDraft, setTagDraft] = useState(
    (initialResource?.tags || []).map((tag) => tag.name || tag).join(", "),
  );

  useEffect(() => {
    if (initialResource?._id) {
      void loadResource(initialResource._id);
    }
  }, [initialResource?._id]);

  const syncLikeState = (nextResource) => {
    setLikesCount(nextResource?.likes || 0);
    setLiked(
      Array.isArray(nextResource?.likedBy) &&
        nextResource.likedBy.some(
          (entry) => String(entry?._id || entry) === String(user?._id || user?.id),
        ),
    );
  };

  const loadResource = async (resourceId) => {
    try {
      setLoading(true);
      const result = await resourceService.getResource(resourceId);
      const nextResource = result.resource || initialResource;
      setResource(nextResource);
      syncLikeState(nextResource);
      setSummaryData(nextResource?.summary || null);
      setTagDraft((nextResource?.tags || []).map((tag) => tag.name || tag).join(", "));
    } catch (error) {
      console.error("Error loading resource:", error);
      Alert.alert("Error", "Failed to load resource details");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const result = await resourceService.likeResource(resource._id);
      const nextLiked = Boolean(result.liked);
      setLiked(nextLiked);
      setLikesCount((current) => current + (nextLiked ? 1 : -1));
    } catch (error) {
      console.error("Error liking resource:", error);
      Alert.alert("Error", error.message || "Failed to like resource");
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Delete Resource",
      "Are you sure you want to delete this resource? This action cannot be undone.",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Delete",
          onPress: async () => {
            try {
              setDeleting(true);
              await resourceService.deleteResource(resource._id);
              Alert.alert("Success", "Resource deleted successfully");
              navigation.goBack();
            } catch (error) {
              console.error("Error deleting resource:", error);
              Alert.alert("Error", error.message || "Failed to delete resource");
            } finally {
              setDeleting(false);
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  const handleDownload = async () => {
    try {
      await Linking.openURL(resourceService.getDownloadUrl(resource._id));

      await analyticsService.trackActivity({
        type: "download",
        resourceId: resource._id,
        topicName: resource.subject,
        metadata: { deviceType: "mobile" },
      });
    } catch (error) {
      console.error("Error downloading resource:", error);
      Alert.alert("Error", "Failed to download resource");
    }
  };

  const handleOpen = async () => {
    try {
      await WebBrowser.openBrowserAsync(resourceService.getViewerPageUrl(resource._id), {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        showTitle: true,
      });
    } catch (error) {
      console.error("Error opening resource:", error);
      Alert.alert("Error", "Failed to open resource");
    }
  };

  const handleAskQuestion = () => {
    navigation.navigate("home-tabs", {
      screen: "assistant",
      params: {
        context: {
          resourceId: resource._id,
          resourceTitle: resource.title,
        },
      },
    });
  };

  const handleGenerateSummary = async () => {
    try {
      setSummaryLoading(true);
      const result = await resourceService.generateSummary(resource._id);
      setSummaryData(result.summary || null);
      setResource((current) =>
        current ? { ...current, summary: result.summary || current.summary } : current,
      );
    } catch (error) {
      console.error("Error generating summary:", error);
      Alert.alert("Error", error.message || "Failed to generate summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSaveTags = async () => {
    try {
      const tags = tagDraft
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((name) => ({ name, confidence: 1 }));

      const result = await resourceService.updateTags(resource._id, tags);
      setResource((current) => (current ? { ...current, tags: result.tags || [] } : current));
      setEditingTags(false);
    } catch (error) {
      console.error("Error updating tags:", error);
      Alert.alert("Error", error.message || "Failed to update tags");
    }
  };

  const canDelete =
    resource &&
    (String(resource.uploadedBy?._id || resource.uploadedBy) ===
      String(user?._id || user?.id) ||
      user?.role === "admin");
  const processingStatusMeta = getProcessingStatusMeta(resource?.processingStatus);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resource Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.badge, { backgroundColor: "#007AFF20" }]}>
        <Text style={styles.badgeText}>{resource.category}</Text>
      </View>

      <View
        style={[
          styles.processingBadge,
          { backgroundColor: processingStatusMeta.backgroundColor },
        ]}
      >
        <Text style={[styles.processingBadgeText, { color: processingStatusMeta.color }]}>
          {processingStatusMeta.label}
        </Text>
      </View>

      <Text style={styles.title}>{resource.title}</Text>

      {resource.description ? (
        <Text style={styles.description}>{resource.description}</Text>
      ) : null}

      <View style={styles.metadataSection}>
        <View style={styles.metadataRow}>
          <MaterialCommunityIcons name="book" size={16} color="#666" />
          <View style={styles.metadataContent}>
            <Text style={styles.metadataLabel}>Subject</Text>
            <Text style={styles.metadataValue}>{resource.subject || "N/A"}</Text>
          </View>
        </View>

        <View style={styles.metadataRow}>
          <MaterialCommunityIcons name="calendar" size={16} color="#666" />
          <View style={styles.metadataContent}>
            <Text style={styles.metadataLabel}>Semester</Text>
            <Text style={styles.metadataValue}>{resource.semester || "N/A"}</Text>
          </View>
        </View>

        <View style={styles.metadataRow}>
          <MaterialCommunityIcons name="download" size={16} color="#666" />
          <View style={styles.metadataContent}>
            <Text style={styles.metadataLabel}>Downloads</Text>
            <Text style={styles.metadataValue}>{resource.downloads || 0}</Text>
          </View>
        </View>

        <View style={styles.metadataRow}>
          <MaterialCommunityIcons name="heart" size={16} color="#FF6B6B" />
          <View style={styles.metadataContent}>
            <Text style={styles.metadataLabel}>Likes</Text>
            <Text style={styles.metadataValue}>{likesCount}</Text>
          </View>
        </View>
      </View>

      {resource.tags && resource.tags.length > 0 ? (
        <View style={styles.tagsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <TouchableOpacity onPress={() => setEditingTags((current) => !current)}>
              <Text style={styles.inlineAction}>{editingTags ? "Cancel" : "Correct tags"}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tagsContainer}>
            {resource.tags.map((tag, idx) => (
              <View key={`${typeof tag === "string" ? tag : tag.name}-${idx}`} style={styles.tag}>
                <Text style={styles.tagText}>
                  {typeof tag === "string" ? tag : tag.name}
                </Text>
              </View>
            ))}
          </View>
          {editingTags ? (
            <View style={styles.tagEditor}>
              <TextInput
                style={styles.tagInput}
                value={tagDraft}
                onChangeText={setTagDraft}
                multiline
                placeholder="Comma-separated tags"
              />
              <TouchableOpacity style={styles.saveTagButton} onPress={handleSaveTags}>
                <Text style={styles.buttonText}>Save Tags</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.summarySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI Summary</Text>
          <TouchableOpacity style={styles.summaryButton} onPress={handleGenerateSummary}>
            <Text style={styles.buttonText}>
              {summaryLoading ? "Generating..." : summaryData ? "Refresh" : "Generate"}
            </Text>
          </TouchableOpacity>
        </View>
        {summaryData ? (
          <Text style={styles.summaryText}>{summaryData}</Text>
        ) : (
          <Text style={styles.summaryPlaceholder}>
            Generate a cached summary to quickly understand this resource.
          </Text>
        )}
      </View>

      {resource.uploadedByName ? (
        <View style={styles.uploaderSection}>
          <Text style={styles.sectionTitle}>Uploaded by</Text>
          <Text style={styles.uploaderName}>{resource.uploadedByName}</Text>
          <Text style={styles.uploaderDate}>
            {new Date(resource.createdAt).toLocaleDateString()}
          </Text>
        </View>
      ) : null}

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={[styles.button, styles.openButton]} onPress={handleOpen}>
          <MaterialCommunityIcons name="eye" size={20} color="#fff" />
          <Text style={styles.buttonText}>Open</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleDownload}>
          <MaterialCommunityIcons name="download" size={20} color="#fff" />
          <Text style={styles.buttonText}>Download</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.likeButton, liked && styles.likedButton]}
          onPress={handleLike}
        >
          <MaterialCommunityIcons
            name={liked ? "heart" : "heart-outline"}
            size={20}
            color={liked ? "#FF6B6B" : "#007AFF"}
          />
          <Text style={[styles.secondaryButtonText, liked && styles.likedButtonText]}>
            {liked ? "Liked" : "Like"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.assistantButton]} onPress={handleAskQuestion}>
          <MaterialCommunityIcons name="robot" size={20} color="#fff" />
          <Text style={styles.buttonText}>Ask AI</Text>
        </TouchableOpacity>
      </View>

      {canDelete ? (
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDelete}
          disabled={deleting}
        >
          <MaterialCommunityIcons name="trash-can" size={20} color="#fff" />
          <Text style={styles.buttonText}>{deleting ? "Deleting..." : "Delete"}</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  processingBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
    textTransform: "capitalize",
  },
  processingBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 20,
  },
  metadataSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  metadataContent: {
    marginLeft: 12,
    flex: 1,
  },
  metadataLabel: {
    fontSize: 12,
    color: "#999",
    textTransform: "uppercase",
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 2,
  },
  tagsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  inlineAction: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "600",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  tagEditor: {
    marginTop: 12,
  },
  tagInput: {
    minHeight: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
  },
  saveTagButton: {
    marginTop: 10,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  summarySection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryButton: {
    backgroundColor: "#0F766E",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 21,
  },
  summaryPlaceholder: {
    fontSize: 13,
    color: "#667085",
  },
  uploaderSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  uploaderName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  uploaderDate: {
    fontSize: 12,
    color: "#999",
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  openButton: {
    backgroundColor: "#10B981",
  },
  primaryButton: {
    backgroundColor: "#007AFF",
  },
  likeButton: {
    backgroundColor: "#f0f0f0",
  },
  likedButton: {
    backgroundColor: "#FFE8E8",
  },
  assistantButton: {
    backgroundColor: "#6366f1",
  },
  deleteButton: {
    backgroundColor: "#FF6B6B",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 14,
  },
  likedButtonText: {
    color: "#FF6B6B",
  },
});

export default ResourceDetailScreen;
