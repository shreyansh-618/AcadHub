// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import {
  resourceService,
  searchService,
  analyticsService,
} from "../../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "lecture-notes", label: "Lecture Notes" },
  { value: "textbooks", label: "Textbooks" },
  { value: "question-papers", label: "Question Papers" },
  { value: "assignments", label: "Assignments" },
  { value: "other", label: "Other" },
];

const SUBJECTS = [
  { value: "all", label: "All Subjects" },
  { value: "Mathematics", label: "Mathematics" },
  { value: "Physics", label: "Physics" },
  { value: "Chemistry", label: "Chemistry" },
  { value: "Computer Science", label: "Computer Science" },
  { value: "Data Structures", label: "Data Structures" },
  { value: "Algorithms", label: "Algorithms" },
  { value: "Web Development", label: "Web Development" },
  { value: "Database Management", label: "Database Management" },
];

const SEMESTERS = Array.from({ length: 8 }, (_, index) => ({
  value: String(index + 1),
  label: `Semester ${index + 1}`,
}));

const ResourcesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filters, setFilters] = useState({
    category: "all",
    subject: "all",
  });
  const [uploadData, setUploadData] = useState({
    title: "",
    description: "",
    category: "other",
    subject: "",
    semester: "",
    academicYear: new Date().getFullYear().toString(),
  });

  useEffect(() => {
    loadResources();
  }, [filters]);

  const loadResources = async () => {
    setLoading(true);
    try {
      let url = "?";
      if (filters.category !== "all") url += `category=${filters.category}&`;
      if (filters.subject !== "all") url += `subject=${filters.subject}&`;
      
      const result = await resourceService.getResources(url);
      setResources(result.resources || []);
    } catch (error) {
      console.error("Error loading resources:", error);
      Alert.alert("Error", "Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log("Selected file:", file);
        setSelectedFile(file);
        Alert.alert("Success", `Selected: ${file.name}`);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadResources();
      return;
    }

    setLoading(true);
    try {
      const result = await searchService.search(query, {
        category: filters.category !== "all" ? filters.category : "",
        subject: filters.subject !== "all" ? filters.subject : "",
      });
      setResources(result.resources || []);

      await analyticsService.trackActivity({
        type: "search",
        searchQuery: query,
        metadata: { deviceType: "mobile" },
      });
    } catch (error) {
      console.error("Error searching:", error);
      Alert.alert("Error", "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResourcePress = async (resource) => {
    await analyticsService.trackActivity({
      type: "view",
      resourceId: resource._id,
      topicName: resource.metadata?.subject || resource.subject,
      metadata: { deviceType: "mobile" },
    });

    navigation.navigate("resource-detail", { resource });
  };

  const handleUpload = async () => {
    if (!uploadData.title.trim()) {
      Alert.alert("Error", "Please enter a resource title");
      return;
    }

    if (!selectedFile) {
      Alert.alert("Error", "Please select a file to upload");
      return;
    }

    if (!uploadData.subject || !uploadData.semester) {
      Alert.alert("Error", "Please select a subject and semester");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("title", uploadData.title);
      formData.append("description", uploadData.description);
      formData.append("category", uploadData.category);
      formData.append("subject", uploadData.subject);
      formData.append("semester", uploadData.semester);
      formData.append("academicYear", uploadData.academicYear);
      formData.append("file", {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || "application/octet-stream",
      });

      await resourceService.uploadResource(formData);
      
      Alert.alert("Success", "Resource uploaded successfully");
      setShowUploadModal(false);
      setUploadData({
        title: "",
        description: "",
        category: "other",
        subject: "",
        semester: "",
        academicYear: new Date().getFullYear().toString(),
      });
      setSelectedFile(null);
      
      loadResources();
    } catch (error) {
      console.error("Error uploading:", error);
      Alert.alert("Error", "Failed to upload resource: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const renderResourceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resourceCard}
      onPress={() => handleResourcePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="file-document" size={20} color="#007AFF" />
        <Text style={styles.category}>{item.category}</Text>
      </View>

      <Text style={styles.resourceTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.resourceSubject}>
        {item.subject || item.metadata?.subject || "General"}
      </Text>

      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.slice(0, 2).map((tag, idx) => (
            <Text key={idx} style={styles.tag}>
              {typeof tag === "string" ? tag : tag.name}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.resourceFooter}>
        <View style={styles.stat}>
          <MaterialCommunityIcons name="download" size={14} color="#666" />
          <Text style={styles.statText}>{item.downloads || 0}</Text>
        </View>
        <View style={styles.stat}>
          <MaterialCommunityIcons name="heart" size={14} color="#FF6B6B" />
          <Text style={styles.statText}>{item.likes || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Resources</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => setShowUploadModal(true)}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search resources..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#ccc"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <MaterialCommunityIcons name="close" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filters.category !== "all" && styles.filterButtonActive,
          ]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={18}
            color={filters.category !== "all" || filters.subject !== "all" ? "#007AFF" : "#666"}
          />
          <Text
            style={[
              styles.filterButtonText,
              (filters.category !== "all" || filters.subject !== "all") &&
                styles.filterButtonTextActive,
            ]}
          >
            Filters
          </Text>
        </TouchableOpacity>

        {(filters.category !== "all" || filters.subject !== "all") && (
          <TouchableOpacity
            onPress={() => setFilters({ category: "all", subject: "all" })}
            style={styles.clearFiltersButton}
          >
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <ScrollView style={styles.filterPanel}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Category</Text>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={styles.filterOption}
                onPress={() => setFilters({ ...filters, category: cat.value })}
              >
                <View
                  style={[
                    styles.checkbox,
                    filters.category === cat.value && styles.checkboxChecked,
                  ]}
                >
                  {filters.category === cat.value && (
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color="#007AFF"
                    />
                  )}
                </View>
                <Text style={styles.filterOptionText}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Subject</Text>
            {SUBJECTS.map((sub) => (
              <TouchableOpacity
                key={sub.value}
                style={styles.filterOption}
                onPress={() => setFilters({ ...filters, subject: sub.value })}
              >
                <View
                  style={[
                    styles.checkbox,
                    filters.subject === sub.value && styles.checkboxChecked,
                  ]}
                >
                  {filters.subject === sub.value && (
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color="#007AFF"
                    />
                  )}
                </View>
                <Text style={styles.filterOptionText}>{sub.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Resources List */}
      {loading && !searchQuery ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : resources.length === 0 ? (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={48}
            color="#ccc"
          />
          <Text style={styles.emptyText}>No resources available</Text>
        </View>
      ) : (
        <FlatList
          data={resources}
          renderItem={renderResourceItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.1}
        />
      )}

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { marginTop: insets.top }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Resource</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                }}
              >
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Resource Title *"
                value={uploadData.title}
                onChangeText={(text) =>
                  setUploadData({ ...uploadData, title: text })
                }
                placeholderTextColor="#ccc"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                value={uploadData.description}
                onChangeText={(text) =>
                  setUploadData({ ...uploadData, description: text })
                }
                placeholderTextColor="#ccc"
                multiline
              />

              <Text style={styles.label}>Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryChips}
              >
                {CATEGORIES.slice(1).map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.chip,
                      uploadData.category === cat.value && styles.chipSelected,
                    ]}
                    onPress={() =>
                      setUploadData({ ...uploadData, category: cat.value })
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        uploadData.category === cat.value &&
                          styles.chipTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Subject *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryChips}
              >
                {SUBJECTS.slice(1).map((sub) => (
                  <TouchableOpacity
                    key={sub.value}
                    style={[
                      styles.chip,
                      uploadData.subject === sub.value && styles.chipSelected,
                    ]}
                    onPress={() =>
                      setUploadData({ ...uploadData, subject: sub.value })
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        uploadData.subject === sub.value &&
                          styles.chipTextSelected,
                      ]}
                    >
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Semester *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryChips}
              >
                {SEMESTERS.map((semester) => (
                  <TouchableOpacity
                    key={semester.value}
                    style={[
                      styles.chip,
                      uploadData.semester === semester.value && styles.chipSelected,
                    ]}
                    onPress={() =>
                      setUploadData({ ...uploadData, semester: semester.value })
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        uploadData.semester === semester.value &&
                          styles.chipTextSelected,
                      ]}
                    >
                      {semester.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={styles.input}
                placeholder="Academic Year (e.g. 2025-2026)"
                value={uploadData.academicYear}
                onChangeText={(text) =>
                  setUploadData({ ...uploadData, academicYear: text })
                }
                placeholderTextColor="#ccc"
              />

              <View style={styles.filePickerSection}>
                <Text style={styles.label}>Select File *</Text>
                <TouchableOpacity
                  style={styles.uploadFileButton}
                  onPress={pickDocument}
                  disabled={uploading}
                >
                  <MaterialCommunityIcons
                    name="folder-plus"
                    size={32}
                    color="#007AFF"
                  />
                  {selectedFile ? (
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={2}>
                        {selectedFile.name}
                      </Text>
                      <Text style={styles.fileSize}>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.uploadFileText}>
                        Tap to select file
                      </Text>
                      <Text style={styles.uploadFileSubtext}>
                        PDF, DOC, Images, etc.
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (uploading || !selectedFile) && styles.disabledButton,
                ]}
                onPress={handleUpload}
                disabled={uploading || !selectedFile}
              >
                <Text style={styles.confirmButtonText}>
                  {uploading ? "Uploading..." : "Upload Resource"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  uploadButton: {
    backgroundColor: "#007AFF",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#333",
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: "#e3f2fd",
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  filterButtonTextActive: {
    color: "#007AFF",
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
  },
  filterPanel: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    maxHeight: 400,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    borderColor: "#007AFF",
    backgroundColor: "#e3f2fd",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#333",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  resourceCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  category: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
    textTransform: "capitalize",
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  resourceSubject: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    marginVertical: 8,
    gap: 6,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#e3f2fd",
    color: "#007AFF",
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: "500",
  },
  resourceFooter: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  categoryChips: {
    marginBottom: 16,
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  chipSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  chipText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#fff",
  },
  filePickerSection: {
    marginVertical: 16,
  },
  uploadFileButton: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#007AFF",
    gap: 12,
  },
  fileInfo: {
    alignItems: "center",
  },
  fileName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    maxWidth: 200,
  },
  fileSize: {
    fontSize: 11,
    color: "#999",
  },
  uploadFileText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  uploadFileSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  confirmButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 32,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});

export default ResourcesScreen;
