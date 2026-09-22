import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

type DimensionRow = {
  id: string;
  label: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  maxScore: number;
  percentage: number;
  averageTimeSeconds: number;
};

type ResultPayload = {
  result: {
    attemptId: string;
    score: number;
    maxScore: number;
    percentage: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    totalTimeSeconds: number;
  };
  attempt?: {
    id: string;
    title: string;
    mode: string;
    historical: Record<string, unknown> | null;
  } | null;
  analysis: {
    overall: Record<string, unknown>;
    bySubject: DimensionRow[];
    byTopic: DimensionRow[];
    byDifficulty: DimensionRow[];
    timing: Record<string, unknown>;
    strongestAreas: DimensionRow[];
    weakestAreas: DimensionRow[];
    recommendation: Record<string, unknown> | null;
  } | null;
};

const copy = {
  fa: {
    title: "نتیجه امتحان",
    score: "نمره",
    percentage: "درصد",
    correct: "صحیح",
    incorrect: "غلط",
    unanswered: "بی‌پاسخ",
    time: "زمان کل",
    subject: "عملکرد مضامین",
    topic: "عملکرد موضوعات",
    strongest: "قوی‌ترین بخش‌ها",
    weakest: "بخش‌های نیازمند تمرین",
    review: "مرور پاسخ‌ها",
    back: "بازگشت به امتحانات",
    loading: "نتیجه در حال بارگیری است...",
    error: "نتیجه بارگیری نشد.",
    retry: "تلاش دوباره",
    questions: "سوال",
    recommendation: "پیشنهاد بعدی",
    practiceTopic: "تمرین این موضوع",
    anotherExam: "یک امتحان دیگر انجام دهید",
    historicalForm: "فورم تاریخی",
    source: "منبع",
    historicalScoring: "امتیازدهی تاریخی",
    practiceFallback: "قانون تاریخی نامعلوم؛ امتیازدهی تمرینی استفاده شد"
  },
  ps: {
    title: "د ازموینې پایله",
    score: "نمره",
    percentage: "سلنه",
    correct: "سم",
    incorrect: "ناسم",
    unanswered: "بې ځوابه",
    time: "ټول وخت",
    subject: "د مضمونونو فعالیت",
    topic: "د موضوعاتو فعالیت",
    strongest: "تر ټولو قوي برخې",
    weakest: "د تمرین اړتیا لرونکې برخې",
    review: "ځوابونه وڅېړئ",
    back: "ازموینو ته بېرته",
    loading: "پایله پورته کېږي...",
    error: "پایله پورته نه شوه.",
    retry: "بیا هڅه",
    questions: "پوښتنې",
    recommendation: "بل وړاندیز",
    practiceTopic: "دا موضوع تمرین کړئ",
    anotherExam: "بله ازموینه وکړئ",
    historicalForm: "تاریخي فورمه",
    source: "سرچینه",
    historicalScoring: "تاریخي نمره ورکول",
    practiceFallback: "تاریخي قانون نامعلوم؛ تمریني نمره وکارول شوه"
  },
  en: {
    title: "Exam result",
    score: "Score",
    percentage: "Percentage",
    correct: "Correct",
    incorrect: "Incorrect",
    unanswered: "Unanswered",
    time: "Total time",
    subject: "Subject performance",
    topic: "Topic performance",
    strongest: "Strongest areas",
    weakest: "Areas to improve",
    review: "Review answers",
    back: "Back to Exams",
    loading: "Loading result...",
    error: "The result could not be loaded.",
    retry: "Retry",
    questions: "questions",
    recommendation: "Recommended next action",
    practiceTopic: "Practice this topic",
    anotherExam: "Take another exam",
    historicalForm: "Historical form",
    source: "Source",
    historicalScoring: "Historical scoring",
    practiceFallback: "Historical scoring rule unknown; practice scoring was used"
  }
} as const;

function timeLabel(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

function metric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function ResultScreen() {
  const params = useLocalSearchParams<{ attemptId: string }>();
  const attemptId = Array.isArray(params.attemptId) ? params.attemptId[0] : params.attemptId;
  const { token } = useAuth();
  const { locale, direction } = useLocale();
  const text = copy[locale];
  const align = direction === "rtl" ? "right" : "left";

  const [data, setData] = useState<ResultPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingTopic, setStartingTopic] = useState(false);

  const load = useCallback(async () => {
    if (!attemptId || !token) return;
    setLoading(true);
    setError("");
    try {
      setData(await apiRequest<ResultPayload>(`/attempts/${attemptId}/result`, {}, token));
    } catch {
      setError(text.error);
    } finally {
      setLoading(false);
    }
  }, [attemptId, token, text.error]);

  useEffect(() => { void load(); }, [load]);

  const subjectRows = data?.analysis?.bySubject ?? [];
  const topicRows = data?.analysis?.byTopic ?? [];
  const strongest = data?.analysis?.strongestAreas ?? [];
  const weakest = data?.analysis?.weakestAreas ?? [];

  const primary = useMemo(() => data?.result, [data]);

  if (loading && !data) {
    return <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /><Text>{text.loading}</Text></View>;
  }

  if (!data || !primary) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || text.error}</Text>
        <Pressable style={styles.primaryButton} onPress={() => void load()}><Text style={styles.primaryText}>{text.retry}</Text></Pressable>
      </View>
    );
  }

  async function practiceRecommendedTopic() {
    const topicId = data?.analysis?.recommendation?.topicId;
    if (!token || typeof topicId !== "string" || startingTopic) return;
    setStartingTopic(true);
    try {
      const response = await apiRequest<{ attempt: { id: string } }>(
        `/progress/topics/${topicId}/practice`,
        { method: "POST", body: JSON.stringify({}) },
        token
      );
      router.push(`/exam/${response.attempt.id}`);
    } catch {
      setError(text.error);
    } finally {
      setStartingTopic(false);
    }
  }

  function PerformanceList({ title, rows }: { title: string; rows: DimensionRow[] }) {
    if (!rows.length) return null;
    return (
      <View style={styles.card}>
        <Text style={[styles.sectionTitle, { textAlign: align }]}>{title}</Text>
        {rows.map((row) => (
          <View style={styles.performanceRow} key={row.id}>
            <View style={styles.performanceTop}>
              <Text style={[styles.performanceLabel, { textAlign: align }]}>{row.label}</Text>
              <Text style={styles.performanceValue}>{row.percentage.toFixed(1)}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, row.percentage))}%` as `${number}%` }]} />
            </View>
            <Text style={[styles.small, { textAlign: align }]}>
              {row.correct}/{row.total} {text.questions}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="trophy-outline" size={34} color={theme.colors.primary} />
        <Text style={[styles.title, { textAlign: align }]}>{text.title}</Text>
      </View>

      {data.attempt?.mode === "historical" && data.attempt.historical ? (
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { textAlign: align }]}>{text.historicalForm}</Text>
          <Text style={[styles.bodyText, { textAlign: align }]}>
            {String(data.attempt.historical.year ?? "")}
            {data.attempt.historical.province ? ` · ${String(data.attempt.historical.province)}` : ""}
            {data.attempt.historical.round ? ` · ${String(data.attempt.historical.round)}` : ""}
            {data.attempt.historical.formCode ? ` · ${String(data.attempt.historical.formCode)}` : ""}
          </Text>
          <Text style={[styles.small, { textAlign: align }]}>
            {text.source}: {String(data.attempt.historical.sourceStatus ?? "unverified")}
          </Text>
          {data.attempt.historical.scoringAuthority === "practice_fallback" ? (
            <Text style={[styles.small, { textAlign: align }]}>{text.practiceFallback}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>{text.score}</Text>
        <Text style={styles.score}>{metric(primary.score)} / {metric(primary.maxScore)}</Text>
        <Text style={styles.percentage}>{primary.percentage.toFixed(1)}%</Text>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricValue}>{primary.correctCount}</Text><Text style={styles.metricLabel}>{text.correct}</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{primary.incorrectCount}</Text><Text style={styles.metricLabel}>{text.incorrect}</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{primary.unansweredCount}</Text><Text style={styles.metricLabel}>{text.unanswered}</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{timeLabel(primary.totalTimeSeconds)}</Text><Text style={styles.metricLabel}>{text.time}</Text></View>
      </View>

      <PerformanceList title={text.subject} rows={subjectRows} />
      <PerformanceList title={text.topic} rows={topicRows} />

      {strongest.length ? <PerformanceList title={text.strongest} rows={strongest} /> : null}
      {weakest.length ? <PerformanceList title={text.weakest} rows={weakest} /> : null}

      {data.analysis?.recommendation ? (
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { textAlign: align }]}>{text.recommendation}</Text>
          <Text style={[styles.bodyText, { textAlign: align }]}>
            {data.analysis.recommendation.type === "practice_topic"
              ? `${text.practiceTopic}: ${String(data.analysis.recommendation.label ?? "")}`
              : text.anotherExam}
          </Text>
          {data.analysis.recommendation.type === "practice_topic" ? (
            <Pressable style={styles.primaryButton} disabled={startingTopic} onPress={() => void practiceRecommendedTopic()}>
              {startingTopic ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{text.practiceTopic}</Text>}
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Pressable style={styles.primaryButton} onPress={() => router.push(`/review/${attemptId}`)}>
        <Text style={styles.primaryText}>{text.review}</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={() => router.replace("/(tabs)/exams")}>
        <Text style={styles.secondaryText}>{text.back}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingTop: 52, paddingBottom: 48, gap: theme.spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: theme.spacing.md, padding: theme.spacing.lg, backgroundColor: theme.colors.background },
  header: { alignItems: "center", gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  title: { color: theme.colors.text, fontSize: theme.typography.title, fontWeight: "800" },
  scoreCard: { alignItems: "center", padding: theme.spacing.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, gap: 6 },
  scoreLabel: { color: theme.colors.mutedText, fontWeight: "700" },
  score: { color: theme.colors.text, fontSize: 34, fontWeight: "900" },
  percentage: { color: theme.colors.primary, fontSize: 22, fontWeight: "800" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  metric: { flexGrow: 1, minWidth: "45%", alignItems: "center", padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md },
  metricValue: { color: theme.colors.text, fontSize: 21, fontWeight: "800" },
  metricLabel: { color: theme.colors.mutedText, marginTop: 4, fontSize: theme.typography.small },
  card: { padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, gap: theme.spacing.md },
  sectionTitle: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: "800" },
  performanceRow: { gap: 6 },
  performanceTop: { flexDirection: "row", justifyContent: "space-between", gap: theme.spacing.sm },
  performanceLabel: { flex: 1, color: theme.colors.text, fontWeight: "700" },
  performanceValue: { color: theme.colors.primary, fontWeight: "800" },
  track: { height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: theme.colors.background },
  fill: { height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
  small: { color: theme.colors.mutedText, fontSize: theme.typography.small },
  bodyText: { color: theme.colors.text, lineHeight: 24 },
  primaryButton: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  secondaryText: { color: theme.colors.text, fontWeight: "700" },
  error: { color: theme.colors.danger, textAlign: "center" }
});
