import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { qaService, resourceService } from "../../services/api";

const guidePoints = [
  "Open a resource first if you want an answer based on that file.",
  "Use the Ask AI button from Resource Details.",
  "Ask one clear question at a time.",
  "Read source snippets before relying on an answer.",
];

const exampleQuestions = [
  "Summarize the main idea of this chapter.",
  "Explain this topic in simple words.",
  "Which section mentions this concept?",
  "What are the key points for revision?",
];

const formatPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

const AssistantScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const contextData = route?.params?.context;
  const resourceId = contextData?.resourceId;
  const [resource, setResource] = useState(null);
  const [loadingResource, setLoadingResource] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answerState, setAnswerState] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const loadResource = async () => {
      if (!resourceId) {
        setResource(null);
        setAnswerState(null);
        setHistory([]);
        return;
      }

      try {
        setLoadingResource(true);
        const result = await resourceService.getResource(resourceId);
        setResource(result.resource || null);
      } catch (error) {
        console.error("Error loading resource:", error);
        Alert.alert("Error", error.message || "Could not load this resource.");
      } finally {
        setLoadingResource(false);
      }
    };

    void loadResource();
  }, [resourceId]);

  const suggestedQuestions = useMemo(() => {
    if (!resource) return exampleQuestions;

    const subject = resource.subject || "this topic";
    return [
      `Summarize ${resource.title}`,
      `Explain ${subject} in simple words`,
      "Give me revision points from this document",
      "What should I remember for exams?",
    ];
  }, [resource]);

  const handleAsk = async (nextQuestion = question) => {
    const cleanQuestion = nextQuestion.trim();

    if (!resourceId) {
      Alert.alert("Open a resource", "Choose a resource first, then tap Ask AI.");
      return;
    }

    if (!cleanQuestion) {
      Alert.alert("Question needed", "Please type a question first.");
      return;
    }

    if (cleanQuestion.length > 500) {
      Alert.alert("Question too long", "Please keep it under 500 characters.");
      return;
    }

    try {
      setAsking(true);
      setAnswerState(null);
      const response = await qaService.askQuestion(cleanQuestion, [resourceId]);
      const nextAnswer = {
        question: cleanQuestion,
        answer: response.answer,
        sources: response.sources || [],
        confidence: response.confidence || 0,
        processingTime: response.processingTime || 0,
        answerLabel: response.answerLabel || "AI Answer",
        sourceCount: response.sourceCount || (response.sources || []).length,
      };

      if (!nextAnswer.answer) {
        throw new Error("The assistant did not return an answer.");
      }

      setAnswerState(nextAnswer);
      setHistory((current) => [nextAnswer, ...current].slice(0, 4));
      setQuestion("");

      void qaService.storeInteraction({
        question: cleanQuestion,
        answer: nextAnswer.answer,
        sources: nextAnswer.sources,
        processingTime: nextAnswer.processingTime,
        confidence: nextAnswer.confidence,
        answerMode: response.answerMode,
        resourceIds: [resourceId],
      });

      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    } catch (error) {
      console.error("Ask AI error:", error);
      Alert.alert("Ask AI failed", error.message || "Please try again.");
    } finally {
      setAsking(false);
    }
  };

  const renderGuide = () => (
    <>
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
        {exampleQuestions.map((item) => (
          <View key={item} style={styles.exampleRow}>
            <Text style={styles.exampleText}>{item}</Text>
          </View>
        ))}
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.keyboardRoot}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>AI Assistant</Text>
          <Text style={styles.headerTitle}>
            {resourceId ? "Ask questions about this resource." : "Use AI from inside a resource."}
          </Text>
          <Text style={styles.headerSubtitle}>
            {resourceId
              ? "Answers stay tied to the selected document and include source snippets when context is available."
              : "Open a resource and tap Ask AI to get document-aware answers."}
          </Text>
        </View>

        {resourceId ? (
          <View style={styles.card}>
            {loadingResource ? (
              <View style={styles.inlineRow}>
                <ActivityIndicator size="small" color="#0a66c2" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusTitle}>Loading resource...</Text>
                  <Text style={styles.statusText}>Preparing the selected document context.</Text>
                </View>
              </View>
            ) : resource ? (
              <>
                <View style={styles.selectedHeader}>
                  <View style={styles.resourceIcon}>
                    <MaterialCommunityIcons name="file-document-outline" size={20} color="#0a66c2" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionLabel}>Selected resource</Text>
                    <Text style={styles.resourceTitle} numberOfLines={2}>
                      {resource.title}
                    </Text>
                    <Text style={styles.resourceMeta} numberOfLines={1}>
                      {[resource.subject, resource.category].filter(Boolean).join(" | ") || "No extra details"}
                    </Text>
                  </View>
                </View>

                <View style={styles.askBox}>
                  <TextInput
                    value={question}
                    onChangeText={setQuestion}
                    placeholder="Ask about this document..."
                    placeholderTextColor="#98a2b3"
                    multiline
                    maxLength={500}
                    style={styles.questionInput}
                    editable={!asking}
                  />
                  <View style={styles.askFooter}>
                    <Text style={styles.charCount}>{question.length}/500</Text>
                    <TouchableOpacity
                      style={[styles.askButton, (!question.trim() || asking) && styles.disabledButton]}
                      onPress={() => handleAsk()}
                      disabled={!question.trim() || asking}
                    >
                      {asking ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="send" size={17} color="#fff" />
                          <Text style={styles.askButtonText}>Ask</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.suggestionWrap}>
                  {suggestedQuestions.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.suggestionChip}
                      onPress={() => handleAsk(item)}
                      disabled={asking}
                      activeOpacity={0.82}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.statusText}>Could not load the selected resource.</Text>
            )}
          </View>
        ) : (
          renderGuide()
        )}

        {asking ? (
          <View style={styles.thinkingCard}>
            <ActivityIndicator color="#0a66c2" />
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>Thinking with document context...</Text>
              <Text style={styles.statusText}>This can take a few seconds on the deployed app.</Text>
            </View>
          </View>
        ) : null}

        {answerState ? (
          <View style={styles.answerCard}>
            <Text style={styles.sectionLabel}>{answerState.answerLabel}</Text>
            <Text style={styles.answerQuestion}>{answerState.question}</Text>
            <Text style={styles.answerText}>{answerState.answer}</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricChip}>
                <Text style={styles.metricLabel}>Confidence</Text>
                <Text style={styles.metricValue}>{formatPercent(answerState.confidence)}</Text>
              </View>
              <View style={styles.metricChip}>
                <Text style={styles.metricLabel}>Sources</Text>
                <Text style={styles.metricValue}>{answerState.sourceCount}</Text>
              </View>
              <View style={styles.metricChip}>
                <Text style={styles.metricLabel}>Time</Text>
                <Text style={styles.metricValue}>
                  {(answerState.processingTime / 1000).toFixed(1)}s
                </Text>
              </View>
            </View>

            {answerState.sources.length ? (
              <View style={styles.sourcesBlock}>
                <Text style={styles.sectionTitle}>Sources</Text>
                {answerState.sources.slice(0, 3).map((source, index) => (
                  <View key={`${source.docId || "source"}-${index}`} style={styles.sourceCard}>
                    <Text style={styles.sourceTitle}>
                      {index + 1}. {source.title || resource?.title || "Document"}
                    </Text>
                    {source.snippet ? (
                      <Text style={styles.sourceSnippet} numberOfLines={5}>
                        {source.snippet}
                      </Text>
                    ) : null}
                    <Text style={styles.sourceMeta}>
                      Match {formatPercent(source.score ?? source.relevanceScore)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {history.length > 1 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Recent questions</Text>
            {history.slice(1).map((item, index) => (
              <TouchableOpacity
                key={`${item.question}-${index}`}
                style={styles.historyItem}
                onPress={() => setAnswerState(item)}
              >
                <Text style={styles.historyQuestion} numberOfLines={1}>
                  {item.question}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#98a2b3" />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {resourceId ? renderGuide() : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    backgroundColor: "#f3f2ef",
  },
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
  selectedHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  resourceIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#e8f3ff",
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 4,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: "#1f2328",
    fontFamily: "Roboto",
  },
  resourceMeta: {
    marginTop: 4,
    fontSize: 14,
    color: "#667085",
    fontFamily: "Roboto",
  },
  askBox: {
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d0d7de",
    backgroundColor: "#f8fafc",
    overflow: "hidden",
  },
  questionInput: {
    minHeight: 96,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    color: "#1f2328",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Roboto",
    textAlignVertical: "top",
  },
  askFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e7ecf0",
  },
  charCount: {
    color: "#667085",
    fontSize: 12,
    fontFamily: "Roboto",
  },
  askButton: {
    minWidth: 88,
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: "#0a66c2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  disabledButton: {
    opacity: 0.55,
  },
  askButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "Roboto",
  },
  suggestionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  suggestionChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#e8f3ff",
    borderWidth: 1,
    borderColor: "#c7ddf5",
  },
  suggestionText: {
    color: "#0a66c2",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Roboto",
  },
  thinkingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d0d7de",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  answerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#b7d2ee",
  },
  answerQuestion: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 23,
    color: "#1f2328",
    fontWeight: "800",
    fontFamily: "Roboto",
  },
  answerText: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
    color: "#344054",
    fontFamily: "Roboto",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  metricChip: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#d0d7de",
    padding: 10,
  },
  metricLabel: {
    fontSize: 11,
    color: "#667085",
    fontWeight: "700",
    fontFamily: "Roboto",
  },
  metricValue: {
    marginTop: 4,
    fontSize: 15,
    color: "#1f2328",
    fontWeight: "800",
    fontFamily: "Roboto",
  },
  sourcesBlock: {
    marginTop: 18,
  },
  sourceCard: {
    borderRadius: 13,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#d0d7de",
    marginTop: 10,
  },
  sourceTitle: {
    color: "#1f2328",
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "Roboto",
  },
  sourceSnippet: {
    marginTop: 8,
    color: "#475467",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Roboto",
  },
  sourceMeta: {
    marginTop: 8,
    color: "#667085",
    fontSize: 12,
    fontWeight: "700",
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
  historyItem: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e7ecf0",
  },
  historyQuestion: {
    flex: 1,
    color: "#475467",
    fontSize: 14,
    fontFamily: "Roboto",
  },
});

export default AssistantScreen;
