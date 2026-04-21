import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  TextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../store";
import { authService, resourceService, analyticsService } from "../../services/api";

const getProcessingStatusMeta = (status) => {
  switch (status) {
    case "indexed":
      return { label: "Indexed", backgroundColor: "#dcfce7", color: "#166534" };
    case "processing":
      return { label: "Processing", backgroundColor: "#fef3c7", color: "#92400e" };
    case "pending_embedding":
      return { label: "Retrying", backgroundColor: "#ffedd5", color: "#9a3412" };
    case "failed":
      return { label: "Failed", backgroundColor: "#fee2e2", color: "#991b1b" };
    default:
      return { label: "Pending", backgroundColor: "#e5e7eb", color: "#374151" };
  }
};

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout, setUser } = useAuthStore();
  const [userResources, setUserResources] = useState([]);
  const [likedResources, setLikedResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourceError, setResourceError] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    university: "",
    semester: "",
    bio: "",
  });

  useEffect(() => {
    setFormData({
      name: user?.name || user?.displayName || "",
      department: user?.department || user?.branch || "",
      university: user?.university || "",
      semester: user?.semester ? String(user.semester) : "",
      bio: user?.bio || "",
    });
  }, [user]);

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
      setResourceError("Failed to load your resources");
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

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const updatedUser = await authService.updateProfile({
        name: formData.name.trim(),
        department: formData.department.trim(),
        university: formData.university.trim(),
        semester: formData.semester ? Number(formData.semester) : undefined,
        bio: formData.bio.trim(),
      });
      await setUser(updatedUser);
      Alert.alert("Profile updated", "Your changes have been saved.");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", error.message || "Could not update your profile.");
    } finally {
      setSavingProfile(false);
    }
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
      <TouchableOpacity style={styles.resourceCard} onPress={() => handleResourcePress(item)} activeOpacity={0.8}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="file-document-outline" size={18} color="#0a66c2" />
          <Text style={styles.category}>{item.category}</Text>
          <View style={styles.spacer} />
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.backgroundColor }]}>
            <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
          </View>
        </View>

        <Text style={styles.resourceTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.resourceSubject}>{item.subject || item.metadata?.subject || "General"}</Text>

        <View style={styles.resourceFooter}>
          <View style={styles.statInline}>
            <MaterialCommunityIcons name="download" size={14} color="#667085" />
            <Text style={styles.statText}>{item.downloads || 0}</Text>
          </View>
          <View style={styles.statInline}>
            <MaterialCommunityIcons name="heart-outline" size={14} color="#667085" />
            <Text style={styles.statText}>{item.likes || 0}</Text>
          </View>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const stats = useMemo(
    () => [
      { label: "Uploads", value: userResources.length },
      { label: "Downloads", value: userResources.reduce((sum, r) => sum + (r.downloads || 0), 0) },
      { label: "Upload Likes", value: userResources.reduce((sum, r) => sum + (r.likes || 0), 0) },
      { label: "Liked", value: likedResources.length },
    ],
    [likedResources, userResources],
  );

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name || user?.displayName || "U").charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.name || user?.displayName || "User"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.metaText}>{[user?.role, user?.department].filter(Boolean).join(" | ")}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Edit profile</Text>
        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={formData.name} onChangeText={(value) => setFormData((current) => ({ ...current, name: value }))} placeholder="Your name" placeholderTextColor="#98a2b3" />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Department</Text>
            <TextInput style={styles.input} value={formData.department} onChangeText={(value) => setFormData((current) => ({ ...current, department: value }))} placeholder="Department" placeholderTextColor="#98a2b3" />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>University</Text>
            <TextInput style={styles.input} value={formData.university} onChangeText={(value) => setFormData((current) => ({ ...current, university: value }))} placeholder="University" placeholderTextColor="#98a2b3" />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Semester</Text>
            <TextInput style={styles.input} value={formData.semester} onChangeText={(value) => setFormData((current) => ({ ...current, semester: value }))} keyboardType="numeric" placeholder="Semester" placeholderTextColor="#98a2b3" />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={styles.textarea}
              value={formData.bio}
              onChangeText={(value) => setFormData((current) => ({ ...current, bio: value }))}
              multiline
              numberOfLines={4}
              placeholder="A short note about you"
              placeholderTextColor="#98a2b3"
              textAlignVertical="top"
            />
          </View>
          <TouchableOpacity style={[styles.primaryButton, savingProfile && styles.disabledButton]} onPress={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save Profile</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your numbers</Text>
        <View style={styles.statsContainer}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statBox}>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My uploads</Text>
          <TouchableOpacity onPress={loadProfileResources}>
            <MaterialCommunityIcons name="refresh" size={20} color="#0a66c2" />
          </TouchableOpacity>
        </View>

        {loadingResources ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0a66c2" />
            <Text style={styles.loadingText}>Waking up server... this may take a few seconds.</Text>
          </View>
        ) : resourceError ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#b42318" />
            <Text style={styles.errorText}>{resourceError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadProfileResources}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : userResources.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={40} color="#98a2b3" />
            <Text style={styles.emptyText}>No uploads yet</Text>
            <Text style={styles.emptySubtext}>Upload resources to see them here.</Text>
          </View>
        ) : (
          <FlatList data={userResources} renderItem={renderResourceItem} keyExtractor={(item) => item._id} scrollEnabled={false} contentContainerStyle={styles.listGap} />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Liked resources</Text>
        {likedResources.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="heart-outline" size={40} color="#98a2b3" />
            <Text style={styles.emptyText}>No liked resources yet</Text>
            <Text style={styles.emptySubtext}>Like resources to keep them easy to find.</Text>
          </View>
        ) : (
          <FlatList data={likedResources} renderItem={renderResourceItem} keyExtractor={(item) => item._id} scrollEnabled={false} contentContainerStyle={styles.listGap} />
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
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
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#d0d7de",
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#98a2b3",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Roboto",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2328",
    fontFamily: "Roboto",
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    color: "#475467",
    fontFamily: "Roboto",
  },
  metaText: {
    marginTop: 6,
    fontSize: 14,
    color: "#667085",
    fontFamily: "Roboto",
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
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2328",
    marginBottom: 12,
    fontFamily: "Roboto",
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#d0d7de",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#344054",
    fontFamily: "Roboto",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0d7de",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1f2328",
    backgroundColor: "#fff",
    fontFamily: "Roboto",
  },
  textarea: {
    borderWidth: 1,
    borderColor: "#d0d7de",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 96,
    fontSize: 15,
    color: "#1f2328",
    backgroundColor: "#fff",
    lineHeight: 24,
    fontFamily: "Roboto",
  },
  primaryButton: {
    backgroundColor: "#0a66c2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Roboto",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statBox: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d0d7de",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0a66c2",
    fontFamily: "Roboto",
  },
  statLabel: {
    marginTop: 6,
    fontSize: 12,
    color: "#667085",
    fontFamily: "Roboto",
  },
  loadingContainer: {
    backgroundColor: "#fff",
    padding: 28,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 150,
    borderWidth: 1,
    borderColor: "#d0d7de",
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 22,
    color: "#475467",
    textAlign: "center",
    fontFamily: "Roboto",
  },
  errorContainer: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 150,
    borderWidth: 1,
    borderColor: "#fecdca",
  },
  errorText: {
    fontSize: 14,
    color: "#b42318",
    marginTop: 12,
    textAlign: "center",
    fontFamily: "Roboto",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#0a66c2",
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    fontFamily: "Roboto",
  },
  emptyContainer: {
    backgroundColor: "#fff",
    padding: 28,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 150,
    borderWidth: 1,
    borderColor: "#d0d7de",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2328",
    marginTop: 12,
    fontFamily: "Roboto",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#667085",
    marginTop: 4,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Roboto",
  },
  listGap: {
    gap: 12,
  },
  resourceCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d0d7de",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  category: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0a66c2",
    textTransform: "capitalize",
    fontFamily: "Roboto",
  },
  spacer: {
    flex: 1,
  },
  date: {
    fontSize: 11,
    color: "#667085",
    fontFamily: "Roboto",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Roboto",
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2328",
    marginBottom: 4,
    fontFamily: "Roboto",
  },
  resourceSubject: {
    fontSize: 13,
    color: "#667085",
    marginBottom: 10,
    fontFamily: "Roboto",
  },
  resourceFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eaecf0",
  },
  statInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "#667085",
    fontFamily: "Roboto",
  },
  logoutButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fecdca",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  logoutButtonText: {
    color: "#b42318",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Roboto",
  },
});

export default ProfileScreen;
