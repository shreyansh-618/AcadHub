import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { resourceService } from "../../services/api";

const guidePoints = [
  "Open a resource first if you want an answer based on that file.",
  "Use the Ask AI area inside the resource view.",
  "Ask one clear question at a time.",
  "Read the source snippets before you rely on the answer.",
  "If the answer feels too broad, ask a smaller follow-up question.",
];

const exampleQuestions = [
  "Summarize the main idea of this chapter.",
  "Explain this topic in simple words.",
  "Which page mentions this concept?",
  "What formula is being used here?",
];

const AssistantScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const contextData = route?.params?.context;
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadResource = async () => {
      if (!contextData?.resourceId) {
        setResource(null);
        return;
      }

      try {
        setLoading(true);
        const result = await resourceService.getResource(contextData.resourceId);
        setResource(result.resource || null);
      } catch (error) {
        console.error("Error loading resource:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadResource();
  }, [contextData]);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <Text style={styles.eyebrow}>AI Assistant</Text>
        <Text style={styles.headerTitle}>Use AI from inside a resource.</Text>
        <Text style={styles.headerSubtitle}>
          The best place to ask a question is on a resource screen. That keeps the answer tied to the file you are reading.
        </Text>
      </View>

      {contextData?.resourceId ? (
        <View style={styles.card}>
          {loading ? (
            <View style={styles.inlineRow}>
              <ActivityIndicator size="small" color="#0a66c2" />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>Waking up server...</Text>
                <Text style={styles.statusText}>This may take a few seconds on the deployed app.</Text>
              </View>
            </View>
          ) : resource ? (
            <>
              <Text style={styles.sectionLabel}>Selected resource</Text>
              <Text style={styles.resourceTitle}>{resource.title}</Text>
              <Text style={styles.resourceMeta}>
                {[resource.subject, resource.category].filter(Boolean).join(" | ") || "No extra details"}
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate("resource-detail", { resource })}
              >
                <Text style={styles.primaryButtonText}>Open resource</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>How to use it</Text>
        {guidePoints.map((point) => (
          <View key={point} style={styles.listRow}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color="#0a66c2" />
            <Text style={styles.listText}>{point}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Good question examples</Text>
        {exampleQuestions.map((question) => (
          <View key={question} style={styles.exampleRow}>
            <Text style={styles.exampleText}>{question}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>When to use this tab</Text>
        <Text style={styles.bodyText}>
          Use this screen as a quick guide. When you are ready to ask something, open a specific resource and use the Ask AI option there.
        </Text>
      </View>
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
    gap: 16,
  },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#d0d7de",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0a66c2",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontFamily: "Roboto",
  },
  headerTitle: {
    marginTop: 6,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: "#1f2328",
    fontFamily: "Roboto",
  },
  headerSubtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: "#475467",
    fontFamily: "Roboto",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#d0d7de",
  },
  inlineRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#175cd3",
    fontFamily: "Roboto",
  },
  statusText: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 20,
    color: "#475467",
    fontFamily: "Roboto",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0a66c2",
    textTransform: "uppercase",
    fontFamily: "Roboto",
  },
  resourceTitle: {
    marginTop: 6,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
    color: "#1f2328",
    fontFamily: "Roboto",
  },
  resourceMeta: {
    marginTop: 6,
    fontSize: 14,
    color: "#667085",
    fontFamily: "Roboto",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2328",
    marginBottom: 14,
    fontFamily: "Roboto",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: "#475467",
    fontFamily: "Roboto",
  },
  exampleRow: {
    borderWidth: 1,
    borderColor: "#d0d7de",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: "#f8fafc",
  },
  exampleText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#344054",
    fontFamily: "Roboto",
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#475467",
    fontFamily: "Roboto",
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#0a66c2",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Roboto",
  },
});

export default AssistantScreen;
