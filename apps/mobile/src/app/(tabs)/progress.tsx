import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../components/screen";
import { ApiError, apiRequest } from "../../lib/api";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

type Overview = {
  completedExams: number;
  questionsAttempted: number;
  averagePercentage: number;
  activeMistakes: number;
  masteredMistakes: number;
  topicsPracticed: number;
};

type TopicRow = {
  topicId: string;
  topicFa: string;
  topicPs: string | null;
  subjectFa: string;
  subjectPs: string | null;
  attemptsCount: number;
  questionsAnswered: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracyPercentage: number;
  averageTimeSeconds: number;
};

type SubjectRow = {
  id: string;
  label: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracyPercentage: number;
};

type HistoryRow = {
  attemptId: string;
  submittedAt: string | null;
  title: string;
  mode: string;
  score: number;
  maxScore: number;
  percentage: number;
};

const copy = {
  fa: {
    title: "پیشرفت",
    exams: "امتحانات تکمیل‌شده",
    questions: "سوالات انجام‌شده",
    average: "میانگین",
    activeMistakes: "اشتباهات فعال",
    mastered: "اشتباهات یادگرفته‌شده",
    topics: "موضوعات تمرین‌شده",
    weakTopics: "موضوعات نیازمند تمرین",
    subjects: "عملکرد مضامین",
    history: "تاریخچه عملکرد",
    mistakes: "دفترچه اشتباهات",
    practice: "تمرین این موضوع",
    empty: "برای دیدن پیشرفت، ابتدا یک امتحان را تکمیل کنید.",
    error: "اطلاعات پیشرفت بارگیری نشد."
  },
  ps: {
    title: "پرمختګ",
    exams: "بشپړې شوې ازموینې",
    questions: "حل شوې پوښتنې",
    average: "منځنۍ پایله",
    activeMistakes: "فعالې تېروتنې",
    mastered: "زده شوې تېروتنې",
    topics: "تمرین شوې موضوعګانې",
    weakTopics: "د تمرین اړتیا لرونکې موضوعګانې",
    subjects: "د مضمونونو فعالیت",
    history: "د فعالیت تاریخچه",
    mistakes: "د تېروتنو کتابچه",
    practice: "دا موضوع تمرین کړئ",
    empty: "د پرمختګ لپاره لومړی یوه ازموینه بشپړه کړئ.",
    error: "د پرمختګ معلومات پورته نه شول."
  },
  en: {
    title: "Progress",
    exams: "Completed exams",
    questions: "Questions attempted",
    average: "Average score",
    activeMistakes: "Active mistakes",
    mastered: "Mastered mistakes",
    topics: "Topics practiced",
    weakTopics: "Topics to improve",
    subjects: "Subject performance",
    history: "Performance history",
    mistakes: "Mistake notebook",
    practice: "Practice this topic",
    empty: "Complete an exam to start building progress.",
    error: "Progress could not be loaded."
  }
} as const;

export default function ProgressScreen() {
  const { token } = useAuth();
  const { locale, direction } = useLocale();
  const text = copy[locale];
  const align = direction === "rtl" ? "right" : "left";
  const rowDirection = direction === "rtl" ? "row-reverse" : "row";
  const startAlign = direction === "rtl" ? "flex-end" : "flex-start";
  const [overview, setOverview] = useState<Overview | null>(null);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingTopic, setStartingTopic] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const overviewResult = await apiRequest<Overview>("/progress/overview", {}, token);
      const [topicResult, subjectResult, historyResult] = await Promise.all([
        apiRequest<{ items: TopicRow[] }>("/progress/topics", {}, token),
        apiRequest<{ items: SubjectRow[] }>("/progress/subjects", {}, token),
        apiRequest<{ items: HistoryRow[] }>("/progress/history", {}, token)
      ]);
      setOverview(overviewResult);
      setTopics(topicResult.items);
      setSubjects(subjectResult.items);
      setHistory(historyResult.items);
    } catch {
      setError(text.error);
    } finally {
      setLoading(false);
    }
  }, [token, text.error]);

  useEffect(() => { void load(); }, [load]);

  function localize(fa: string, ps: string | null) {
    return locale === "ps" ? (ps || fa) : fa;
  }

  async function practiceTopic(topic: TopicRow) {
    if (!token || startingTopic) return;
    setStartingTopic(topic.topicId);
    setError("");
    try {
      const result = await apiRequest<{ attempt: { id: string } }>(
        `/progress/topics/${topic.topicId}/practice`,
        { method: "POST", body: JSON.stringify({}) },
        token
      );
      router.push(`/exam/${result.attempt.id}`);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "premium_required") router.push("/premium");
      else setError(text.error);
    } finally {
      setStartingTopic("");
    }
  }

  if (loading && !overview) {
    return <Screen><View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View></Screen>;
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { textAlign: align, writingDirection: direction }]}>{text.title}</Text>
        <Pressable style={[styles.mistakeButton, { flexDirection: rowDirection, alignSelf: startAlign }]} onPress={() => router.push("/mistakes")}>
          <Ionicons name="book-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.mistakeButtonText}>{text.mistakes}</Text>
        </Pressable>
      </View>

      {error ? <Text style={[styles.error, { textAlign: align, writingDirection: direction }]}>{error}</Text> : null}

      {!overview?.completedExams ? (
        <View style={styles.empty}><Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.empty}</Text></View>
      ) : (
        <>
          <View style={[styles.metrics, { flexDirection: rowDirection }]}>
            {[
              [text.exams, overview.completedExams],
              [text.questions, overview.questionsAttempted],
              [text.average, `${overview.averagePercentage.toFixed(1)}%`],
              [text.activeMistakes, overview.activeMistakes],
              [text.mastered, overview.masteredMistakes],
              [text.topics, overview.topicsPracticed]
            ].map(([label, value]) => (
              <View style={styles.metric} key={String(label)}>
                <Text style={styles.metricValue}>{String(value)}</Text>
                <Text style={[styles.metricLabel, { textAlign: align, writingDirection: direction }]}>{String(label)}</Text>
              </View>
            ))}
          </View>

          {topics.length ? (
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.weakTopics}</Text>
              {topics.slice(0, 5).map((topic) => (
                <View key={topic.topicId} style={[styles.row, { flexDirection: rowDirection }]}>
                  <View style={styles.rowCopy}>
                    <Text style={[styles.rowTitle, { textAlign: align, writingDirection: direction }]}>{localize(topic.topicFa, topic.topicPs)}</Text>
                    <Text style={[styles.meta, { textAlign: align, writingDirection: direction }]}>
                      {topic.accuracyPercentage.toFixed(1)}% · {topic.questionsAnswered} {text.questions}
                    </Text>
                  </View>
                  <Pressable
                    disabled={Boolean(startingTopic)}
                    style={styles.smallButton}
                    onPress={() => void practiceTopic(topic)}
                  >
                    {startingTopic === topic.topicId
                      ? <ActivityIndicator color="#FFFFFF" size="small" />
                      : <Text style={styles.smallButtonText}>{text.practice}</Text>}
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {subjects.length ? (
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.subjects}</Text>
              {subjects.map((subject) => (
                <View key={subject.id} style={[styles.row, { flexDirection: rowDirection }]}>
                  <Text style={[styles.rowTitle, { textAlign: align, writingDirection: direction }]}>{subject.label}</Text>
                  <Text style={styles.percent}>{subject.accuracyPercentage.toFixed(1)}%</Text>
                </View>
              ))}
            </View>
          ) : null}

          {history.length ? (
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.history}</Text>
              {history.slice(0, 10).map((item) => (
                <Pressable key={item.attemptId} style={[styles.row, { flexDirection: rowDirection }]} onPress={() => router.push(`/result/${item.attemptId}`)}>
                  <View style={styles.rowCopy}>
                    <Text style={[styles.rowTitle, { textAlign: align, writingDirection: direction }]}>{item.title}</Text>
                    <Text style={[styles.meta, { textAlign: align, writingDirection: direction }]}>{item.mode}</Text>
                  </View>
                  <Text style={styles.percent}>{item.percentage.toFixed(1)}%</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120, gap: theme.spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { gap: theme.spacing.sm },
  title: { color: theme.colors.text, fontSize: theme.typography.title, fontWeight: "800" },
  mistakeButton: { minHeight: 44, flexDirection: "row", gap: 8, alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft },
  mistakeButtonText: { color: theme.colors.primary, fontWeight: "800" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  metric: { width: "48%", flexGrow: 1, padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, gap: 4 },
  metricValue: { color: theme.colors.text, fontSize: 22, fontWeight: "900" },
  metricLabel: { color: theme.colors.mutedText, fontSize: theme.typography.small },
  card: { gap: theme.spacing.sm, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  sectionTitle: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: "800" },
  row: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { color: theme.colors.text, fontWeight: "700" },
  meta: { color: theme.colors.mutedText, fontSize: theme.typography.small },
  percent: { color: theme.colors.primary, fontWeight: "900" },
  smallButton: { minHeight: 38, justifyContent: "center", paddingHorizontal: 10, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary },
  smallButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  empty: { padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  body: { color: theme.colors.mutedText, lineHeight: 25 },
  error: { color: theme.colors.danger }
});
