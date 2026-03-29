import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { qaService, resourceService, analyticsService } from "../../services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AssistantScreen = ({ route }) => {
  const insets = useSafeAreaInsets();
  const contextData = route?.params?.context;

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [answerMode, setAnswerMode] = useState(null);
  const [answerLabel, setAnswerLabel] = useState("Answer");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [sourceCount, setSourceCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [resource, setResource] = useState(null);
  const [rateLimitStatus, setRateLimitStatus] = useState(null);

  useEffect(() => {
    void checkRateLimit();
    if (contextData?.resourceId) {
      void loadResource();
    } else {
      setResource(null);
    }
  }, [contextData]);

  const checkRateLimit = async () => {
    try {
      const status = await qaService.getRateLimitStatus();
      setRateLimitStatus(status);
    } catch (error) {
      console.error("Error checking rate limit:", error);
    }
  };

  const loadResource = async () => {
    try {
      const result = await resourceService.getResource(contextData.resourceId);
      setResource(result.resource || null);
    } catch (error) {
      console.error("Error loading resource:", error);
    }
  };

  const handleAskQuestion = async () => {
    const currentQuestion = question.trim();
    if (!currentQuestion) return;

    if (!rateLimitStatus?.allowed) {
      Alert.alert(
        "Rate Limit Exceeded",
        "You've reached your prototype limit of 5 questions per hour. Try again later.",
        [{ text: "OK" }],
      );
      return;
    }

    setLoading(true);
    try {
      const resourceIds = contextData?.resourceId ? [contextData.resourceId] : [];
      const result = await qaService.askQuestion(currentQuestion, resourceIds);

      setAnswer(result.answer);
      setAnswerMode(result.answerMode || null);
      setAnswerLabel(result.answerLabel || "AI Generated Answer");
      setSources(result.sources || []);
      setProcessingTime(result.processingTime || 0);
      setConfidence(result.confidence || 0);
      setSourceCount(result.sourceCount || (result.sources || []).length || 0);
      setHistory((current) => [
        ...current,
        {
          question: currentQuestion,
          answer: result.answer,
          answerLabel: result.answerLabel || "AI Generated Answer",
          timestamp: new Date(),
        },
      ]);
      setQuestion("");
      void checkRateLimit();

      await analyticsService.trackActivity({
        type: "qa_asked",
        topicName: currentQuestion.substring(0, 50),
        resourceId: contextData?.resourceId || null,
        metadata: {
          deviceType: "mobile",
          subject: resource?.subject || null,
          category: resource?.category || null,
        },
      });
    } catch (error) {
      console.error("Error asking question:", error);
      if (error.code === "RATE_LIMIT_EXCEEDED") {
        Alert.alert("Rate Limit", error.message);
        void checkRateLimit();
      } else {
        Alert.alert("Error", error.message || "Could not generate answer. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const rateLimitHint = useMemo(() => {
    if (!rateLimitStatus) {
      return "Checking request allowance...";
    }

    if (rateLimitStatus.allowed) {
      return `${rateLimitStatus.remaining} of 5 prototype requests left this hour`;
    }

    return `Requests reset at ${rateLimitStatus.resetTime?.toLocaleTimeString()}`;
  }, [rateLimitStatus]);

  const renderHistoryItem = (item, index) => (
    <View style={styles.historyItem} key={`${item.question}-${index}`}>
      <Text style={styles.historyQuestion}>
        <Text style={styles.bold}>Q:</Text> {item.question}
      </Text>
      <Text style={styles.historyModeLabel}>{item.answerLabel || "Answer"}</Text>
      <Text style={styles.historyAnswer}>
        <Text style={styles.bold}>A:</Text> {item.answer}
      </Text>
      <Text style={styles.timeStamp}>{item.timestamp?.toLocaleTimeString() || ""}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSubtitle}>
            Ask questions about your academic materials
          </Text>
        </View>

        {rateLimitStatus && (
          <View
            style={[
              styles.rateLimitCard,
              !rateLimitStatus.allowed && styles.rateLimitExceeded,
            ]}
          >
            <MaterialCommunityIcons
              name={rateLimitStatus.allowed ? "information" : "alert"}
              size={20}
              color={rateLimitStatus.allowed ? "#007AFF" : "#FF6B6B"}
            />
            <View style={styles.rateLimitText}>
              <Text style={styles.rateLimitTitle}>
                {rateLimitStatus.allowed
                  ? `${rateLimitStatus.remaining} Requests Remaining`
                  : "Rate Limit Exceeded"}
              </Text>
              <Text style={styles.rateLimitSubtitle}>
                {rateLimitStatus.allowed
                  ? "5 requests per hour"
                  : `Reset at ${rateLimitStatus.resetTime?.toLocaleTimeString()}`}
              </Text>
            </View>
          </View>
        )}

        {resource && (
          <View style={styles.resourceContext}>
            <View style={styles.contextHeader}>
              <MaterialCommunityIcons name="file-document" size={16} color="#007AFF" />
              <Text style={styles.contextTitle}>Resource Context</Text>
            </View>
            <Text style={styles.contextResourceName}>{resource.title}</Text>
            <Text style={styles.contextResourceMeta}>
              {[resource.subject, resource.category].filter(Boolean).join(" • ")}
            </Text>
          </View>
        )}

        {answer && (
          <View style={styles.answerSection}>
            <View style={styles.answerHeader}>
              <Text style={styles.answerTitle}>{answerLabel}</Text>
              {answerMode === "document_fallback" && (
                <View style={styles.answerBadge}>
                  <Text style={styles.answerBadgeText}>Limited mode</Text>
                </View>
              )}
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Confidence</Text>
                <Text style={styles.metricValue}>{Math.round(confidence * 100)}%</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Answered in</Text>
                <Text style={styles.metricValue}>{(processingTime / 1000).toFixed(2)}s</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Sources</Text>
                <Text style={styles.metricValue}>{sourceCount}</Text>
              </View>
            </View>

            <Text style={styles.answerText}>{answer}</Text>
            <View style={styles.guardrailBox}>
              <Text style={styles.guardrailText}>
                Answer uses only retrieved document content.
              </Text>
            </View>

            {sources.length > 0 && (
              <View style={styles.sourcesSection}>
                <Text style={styles.sourcesTitle}>Sources</Text>
                {sources.map((source, idx) => (
                  <View key={`${source.title || source.name}-${idx}`} style={styles.sourceItem}>
                    <MaterialCommunityIcons name="file" size={14} color="#999" />
                    <View style={styles.sourceContent}>
                      <Text style={styles.sourceName}>
                        {source.title || source.name}
                        {source.pageNumber ? ` • Page ${source.pageNumber}` : ""}
                        {source.score || source.relevanceScore
                          ? ` • ${Math.round((source.score || source.relevanceScore) * 100)}% match`
                          : ""}
                      </Text>
                      {source.snippet ? (
                        <Text style={styles.sourceSnippet}>{source.snippet}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>Recent Questions</Text>
            {history.map(renderHistoryItem)}
          </View>
        )}

        {!answer && history.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="robot" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>
              Ask me anything about your academic materials!
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputSection}>
        {loading ? (
          <View style={styles.loadingCard}>
            <MaterialCommunityIcons name="robot-happy-outline" size={18} color="#007AFF" />
            <Text style={styles.loadingCardText}>
              Thinking with retrieved chunks and checking citations...
            </Text>
          </View>
        ) : null}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={
              resource
                ? `Ask about "${resource.title}"...`
                : "Ask a question about your resources..."
            }
            value={question}
            onChangeText={setQuestion}
            multiline
            maxLength={500}
            editable={Boolean(rateLimitStatus?.allowed) && !loading}
            placeholderTextColor="#ccc"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!rateLimitStatus?.allowed || loading) && styles.disabledButton,
            ]}
            onPress={handleAskQuestion}
            disabled={!rateLimitStatus?.allowed || loading || !question.trim()}
          >
            <MaterialCommunityIcons
              name={loading ? "dots-horizontal" : "send"}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.charCount}>{question.length}/500</Text>
        <Text style={styles.rateHint}>{rateLimitHint}</Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#666",
  },
  rateLimitCard: {
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  rateLimitExceeded: {
    backgroundColor: "#FFEBEE",
  },
  rateLimitText: {
    flex: 1,
  },
  rateLimitTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A237E",
  },
  rateLimitSubtitle: {
    fontSize: 12,
    color: "#555",
    marginTop: 2,
  },
  resourceContext: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  contextHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  contextTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
    textTransform: "uppercase",
  },
  contextResourceName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  contextResourceMeta: {
    fontSize: 12,
    color: "#999",
  },
  answerSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  answerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  answerTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
    textTransform: "uppercase",
  },
  answerBadge: {
    backgroundColor: "#EAF3FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  answerBadgeText: {
    color: "#2667C9",
    fontSize: 11,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  metricPill: {
    flex: 1,
    backgroundColor: "#F6F9FC",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: "#667085",
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#101828",
  },
  answerText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 12,
  },
  guardrailBox: {
    backgroundColor: "#ECFDF3",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  guardrailText: {
    fontSize: 12,
    color: "#027A48",
  },
  sourcesSection: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  sourcesTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sourceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
    paddingVertical: 4,
  },
  sourceContent: {
    flex: 1,
  },
  sourceName: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  sourceSnippet: {
    marginTop: 4,
    fontSize: 12,
    color: "#475467",
    lineHeight: 16,
  },
  historySection: {
    marginBottom: 16,
  },
  historySectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  historyItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  historyQuestion: {
    fontSize: 13,
    color: "#333",
    marginBottom: 6,
    lineHeight: 18,
  },
  historyModeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#007AFF",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  historyAnswer: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    lineHeight: 16,
  },
  bold: {
    fontWeight: "700",
    color: "#007AFF",
  },
  timeStamp: {
    fontSize: 11,
    color: "#999",
  },
  emptyState: {
    alignItems: "center",
    marginVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
    textAlign: "center",
  },
  inputSection: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  loadingCard: {
    backgroundColor: "#EEF4FF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  loadingCardText: {
    flex: 1,
    fontSize: 12,
    color: "#3538CD",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#ddd",
  },
  charCount: {
    fontSize: 11,
    color: "#999",
    marginTop: 6,
    textAlign: "right",
  },
  rateHint: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
  },
});

export default AssistantScreen;
