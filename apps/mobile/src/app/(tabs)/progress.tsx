import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState, type ComponentProps } from "react";
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
    subtitle: "روند آمادگی، نقاط قوت و بخش‌هایی را که نیاز به تمرین دارند دنبال کنید.",
    exams: "امتحانات",
    questions: "سوالات",
    average: "میانگین",
    activeMistakes: "اشتباه فعال",
    mastered: "اشتباه یادگرفته‌شده",
    topics: "موضوع تمرین‌شده",
    weakTopics: "نیازمند تمرین",
    subjects: "عملکرد مضامین",
    history: "نتایج اخیر",
    mistakes: "دفترچه اشتباهات",
    practice: "تمرین",
    emptyTitle: "پیشرفت شما از اولین تمرین شروع می‌شود",
    emptyBody: "یک تمرین یا امتحان را تکمیل کنید تا نمودارهای عملکرد، موضوعات ضعیف و پیشنهادهای بعدی در اینجا ساخته شوند.",
    startPractice: "شروع تمرین",
    browseExams: "مشاهده امتحانات",
    coming: "بعد از اولین نتیجه، اینجا خواهید دید",
    comingTrend: "روند نمرات",
    comingWeak: "موضوعات ضعیف",
    comingSubjects: "عملکرد مضامین",
    overall: "وضعیت کلی",
    trend: "روند اخیر",
    improving: "رو به بهبود",
    declining: "نیاز به توجه",
    steady: "ثابت",
    points: "امتیاز",
    journey: "مسیر یادگیری",
    masteredBody: "اشتباهاتی که بعداً درست پاسخ داده‌اید",
    topicsBody: "موضوعاتی که تا اکنون تمرین کرده‌اید",
    nextStep: "قدم بعدی",
    nextWeak: "روی ضعیف‌ترین موضوع فعلی تمرکز کنید.",
    nextGeneral: "یک تمرین جدید انجام دهید تا پیشرفت‌تان به‌روز شود.",
    viewAll: "مشاهده همه",
    error: "بخشی از اطلاعات پیشرفت بارگیری نشد."
  },
  ps: {
    title: "پرمختګ",
    subtitle: "خپل چمتووالی، قوي برخې او د تمرین اړتیا لرونکي ځایونه تعقیب کړئ.",
    exams: "ازموینې",
    questions: "پوښتنې",
    average: "منځنۍ پایله",
    activeMistakes: "فعالې تېروتنې",
    mastered: "زده شوې تېروتنې",
    topics: "تمرین شوې موضوعګانې",
    weakTopics: "تمرین ته اړتیا",
    subjects: "د مضمونونو فعالیت",
    history: "وروستۍ پایلې",
    mistakes: "د تېروتنو کتابچه",
    practice: "تمرین",
    emptyTitle: "ستاسو پرمختګ له لومړي تمرین څخه پیلېږي",
    emptyBody: "یو تمرین یا ازموینه بشپړه کړئ، بیا به دلته د فعالیت روند، کمزورې موضوعګانې او راتلونکې سپارښتنې جوړې شي.",
    startPractice: "تمرین پیل کړئ",
    browseExams: "ازموینې وګورئ",
    coming: "له لومړۍ پایلې وروسته به دلته ووینئ",
    comingTrend: "د نمرو روند",
    comingWeak: "کمزورې موضوعګانې",
    comingSubjects: "د مضمونونو فعالیت",
    overall: "عمومي حالت",
    trend: "وروستی روند",
    improving: "ښه کېدونکی",
    declining: "پاملرنې ته اړتیا",
    steady: "ثابت",
    points: "پواینټ",
    journey: "د زده کړې مسیر",
    masteredBody: "هغه تېروتنې چې وروسته مو سمې کړې",
    topicsBody: "هغه موضوعګانې چې تر اوسه مو تمرین کړې",
    nextStep: "راتلونکی ګام",
    nextWeak: "اوس په تر ټولو کمزورې موضوع تمرکز وکړئ.",
    nextGeneral: "یو نوی تمرین وکړئ ترڅو پرمختګ مو تازه شي.",
    viewAll: "ټول وګورئ",
    error: "د پرمختګ ځینې معلومات پورته نه شول."
  },
  en: {
    title: "Progress",
    subtitle: "Track your preparation, strengths, and the areas that need more work.",
    exams: "Exams",
    questions: "Questions",
    average: "Average",
    activeMistakes: "Active mistakes",
    mastered: "Mastered mistakes",
    topics: "Topics practiced",
    weakTopics: "Needs practice",
    subjects: "Subject performance",
    history: "Recent results",
    mistakes: "Mistake notebook",
    practice: "Practice",
    emptyTitle: "Your progress starts with the first practice",
    emptyBody: "Complete a practice session or exam and this page will build score trends, weak topics, and useful next steps.",
    startPractice: "Start practice",
    browseExams: "Browse exams",
    coming: "After your first result, you will see",
    comingTrend: "Score trend",
    comingWeak: "Weak topics",
    comingSubjects: "Subject performance",
    overall: "Overall status",
    trend: "Recent trend",
    improving: "Improving",
    declining: "Needs attention",
    steady: "Steady",
    points: "points",
    journey: "Learning journey",
    masteredBody: "Mistakes you later answered correctly",
    topicsBody: "Topics you have practiced so far",
    nextStep: "Next step",
    nextWeak: "Focus on your weakest current topic.",
    nextGeneral: "Take another practice session to keep your progress current.",
    viewAll: "View all",
    error: "Some progress information could not be loaded."
  }
} as const;

export default function ProgressScreen() {
  const { token } = useAuth();
  const { locale, direction } = useLocale();
  const text = copy[locale];
  const align = direction === "rtl" ? "right" : "left";
  const rowDirection = "row";

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

    const results = await Promise.allSettled([
      apiRequest<Overview>("/progress/overview", {}, token),
      apiRequest<{ items: TopicRow[] }>("/progress/topics", {}, token),
      apiRequest<{ items: SubjectRow[] }>("/progress/subjects", {}, token),
      apiRequest<{ items: HistoryRow[] }>("/progress/history", {}, token)
    ]);

    const [overviewResult, topicResult, subjectResult, historyResult] = results;
    if (overviewResult.status === "fulfilled") setOverview(overviewResult.value);
    if (topicResult.status === "fulfilled") setTopics(topicResult.value.items);
    if (subjectResult.status === "fulfilled") setSubjects(subjectResult.value.items);
    if (historyResult.status === "fulfilled") setHistory(historyResult.value.items);
    if (results.every((item) => item.status === "rejected")) setError(text.error);
    setLoading(false);
  }, [token, text.error]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

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

  const trend = useMemo(() => {
    if (history.length < 2) return { delta: 0, label: text.steady, icon: "remove-outline" as const };
    const recent = history.slice(0, Math.min(3, history.length));
    const previous = history.slice(recent.length, recent.length * 2);
    const recentAverage = recent.reduce((sum, item) => sum + item.percentage, 0) / recent.length;
    const previousAverage = previous.length
      ? previous.reduce((sum, item) => sum + item.percentage, 0) / previous.length
      : history[history.length - 1].percentage;
    const delta = Math.round((recentAverage - previousAverage) * 10) / 10;
    if (delta > 1) return { delta, label: text.improving, icon: "trending-up-outline" as const };
    if (delta < -1) return { delta, label: text.declining, icon: "trending-down-outline" as const };
    return { delta, label: text.steady, icon: "remove-outline" as const };
  }, [history, text.improving, text.declining, text.steady]);

  const weakestTopic = topics[0] ?? null;
  const hasProgress = Boolean(overview?.completedExams);
  const previewItems: Array<{ icon: ComponentProps<typeof Ionicons>["name"]; label: string }> = [
    { icon: "stats-chart-outline", label: text.comingTrend },
    { icon: "alert-circle-outline", label: text.comingWeak },
    { icon: "school-outline", label: text.comingSubjects }
  ];

  if (loading && !overview) {
    return <Screen><View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View></Screen>;
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { textAlign: align, writingDirection: direction }]}>{text.title}</Text>
          <Text style={[styles.subtitle, { textAlign: align, writingDirection: direction }]}>{text.subtitle}</Text>
        </View>
        <Pressable style={styles.mistakeButton} onPress={() => router.push("/mistakes")}>
          <Ionicons name="book-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.mistakeButtonText}>{text.mistakes}</Text>
        </Pressable>
      </View>

      {error ? <Text style={[styles.error, { textAlign: align, writingDirection: direction }]}>{error}</Text> : null}

      {!hasProgress ? (
        <>
          <View style={styles.emptyHero}>
            <View style={styles.emptyIcon}>
              <Ionicons name="analytics-outline" size={34} color={theme.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { textAlign: align, writingDirection: direction }]}>{text.emptyTitle}</Text>
            <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.emptyBody}</Text>
            <View style={styles.emptyActions}>
              <Pressable style={styles.primaryButton} onPress={() => router.push("/(tabs)/practice")}>
                <Text style={styles.primaryButtonText}>{text.startPractice}</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => router.push("/(tabs)/exams")}>
                <Text style={styles.secondaryButtonText}>{text.browseExams}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.coming}</Text>
            <View style={styles.previewGrid}>
              {previewItems.map((item) => (
                <View key={item.label} style={styles.previewItem}>
                  <View style={styles.previewIcon}>
                    <Ionicons name={item.icon} size={20} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.previewLabel, { textAlign: align, writingDirection: direction }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryTop, { flexDirection: rowDirection }]}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{overview!.averagePercentage.toFixed(0)}%</Text>
                <Text style={styles.scoreLabel}>{text.average}</Text>
              </View>
              <View style={styles.summaryCopy}>
                <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.overall}</Text>
                <View style={[styles.trendRow, { flexDirection: rowDirection }]}>
                  <Ionicons
                    name={trend.icon}
                    size={20}
                    color={trend.delta < -1 ? theme.colors.warning : trend.delta > 1 ? theme.colors.success : theme.colors.primary}
                  />
                  <Text style={[styles.trendText, { textAlign: align, writingDirection: direction }]}>
                    {trend.label}{trend.delta ? ` · ${trend.delta > 0 ? "+" : ""}${trend.delta} ${text.points}` : ""}
                  </Text>
                </View>
                <View style={styles.overallTrack}>
                  <View style={[styles.overallFill, { width: `${Math.max(4, Math.min(100, overview!.averagePercentage))}%` }]} />
                </View>
              </View>
            </View>

            <View style={[styles.metrics, { flexDirection: rowDirection }]}>
              {[
                [text.exams, overview!.completedExams],
                [text.questions, overview!.questionsAttempted],
                [text.activeMistakes, overview!.activeMistakes]
              ].map(([label, value]) => (
                <View style={styles.metric} key={String(label)}>
                  <Text style={styles.metricValue}>{String(value)}</Text>
                  <Text style={[styles.metricLabel, { textAlign: align, writingDirection: direction }]}>{String(label)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.journey}</Text>
            <View style={[styles.journeyRow, { flexDirection: rowDirection }]}>
              <View style={styles.journeyItem}>
                <View style={styles.journeyIcon}><Ionicons name="checkmark-done-outline" size={22} color={theme.colors.success} /></View>
                <Text style={styles.journeyValue}>{overview!.masteredMistakes}</Text>
                <Text style={[styles.journeyLabel, { textAlign: align, writingDirection: direction }]}>{text.mastered}</Text>
                <Text style={[styles.journeyBody, { textAlign: align, writingDirection: direction }]}>{text.masteredBody}</Text>
              </View>
              <View style={styles.journeyItem}>
                <View style={styles.journeyIcon}><Ionicons name="layers-outline" size={22} color={theme.colors.primary} /></View>
                <Text style={styles.journeyValue}>{overview!.topicsPracticed}</Text>
                <Text style={[styles.journeyLabel, { textAlign: align, writingDirection: direction }]}>{text.topics}</Text>
                <Text style={[styles.journeyBody, { textAlign: align, writingDirection: direction }]}>{text.topicsBody}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.nextStep}</Text>
            {weakestTopic ? (
              <View style={styles.nextStepContent}>
                <Text style={[styles.rowTitle, { textAlign: align, writingDirection: direction }]}>
                  {localize(weakestTopic.topicFa, weakestTopic.topicPs)}
                </Text>
                <Text style={[styles.meta, { textAlign: align, writingDirection: direction }]}>
                  {localize(weakestTopic.subjectFa, weakestTopic.subjectPs)} · {weakestTopic.accuracyPercentage.toFixed(1)}%
                </Text>
                <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.nextWeak}</Text>
                <Pressable
                  disabled={Boolean(startingTopic)}
                  style={[styles.primaryButton, Boolean(startingTopic) && styles.disabled]}
                  onPress={() => void practiceTopic(weakestTopic)}
                >
                  {startingTopic === weakestTopic.topicId
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <Text style={styles.primaryButtonText}>{text.practice}</Text>}
                </Pressable>
              </View>
            ) : (
              <View style={styles.nextStepContent}>
                <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.nextGeneral}</Text>
                <Pressable style={styles.primaryButton} onPress={() => router.push("/(tabs)/practice")}>
                  <Text style={styles.primaryButtonText}>{text.startPractice}</Text>
                </Pressable>
              </View>
            )}
          </View>

          {topics.length ? (
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.weakTopics}</Text>
              {topics.slice(0, 5).map((topic) => (
                <View key={topic.topicId} style={styles.performanceItem}>
                  <View style={[styles.performanceTop, { flexDirection: rowDirection }]}>
                    <View style={styles.rowCopy}>
                      <Text style={[styles.rowTitle, { textAlign: align, writingDirection: direction }]}>
                        {localize(topic.topicFa, topic.topicPs)}
                      </Text>
                      <Text style={[styles.meta, { textAlign: align, writingDirection: direction }]}>
                        {localize(topic.subjectFa, topic.subjectPs)} · {topic.questionsAnswered} {text.questions}
                      </Text>
                    </View>
                    <Text style={styles.percent}>{topic.accuracyPercentage.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.max(3, Math.min(100, topic.accuracyPercentage))}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {subjects.length ? (
            <View style={styles.card}>
              <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.subjects}</Text>
              {subjects.slice(0, 8).map((subject) => (
                <View key={subject.id} style={styles.performanceItem}>
                  <View style={[styles.performanceTop, { flexDirection: rowDirection }]}>
                    <Text style={[styles.rowTitle, styles.rowCopy, { textAlign: align, writingDirection: direction }]}>{subject.label}</Text>
                    <Text style={styles.percent}>{subject.accuracyPercentage.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.max(3, Math.min(100, subject.accuracyPercentage))}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {history.length ? (
            <View style={styles.card}>
              <View style={[styles.sectionHeader, { flexDirection: rowDirection }]}>
                <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.history}</Text>
                <Pressable onPress={() => router.push("/(tabs)/exams")}><Text style={styles.link}>{text.viewAll}</Text></Pressable>
              </View>
              {history.slice(0, 5).map((item) => (
                <Pressable key={item.attemptId} style={styles.historyItem} onPress={() => router.push(`/result/${item.attemptId}`)}>
                  <View style={[styles.performanceTop, { flexDirection: rowDirection }]}>
                    <View style={styles.rowCopy}>
                      <Text style={[styles.rowTitle, { textAlign: align, writingDirection: direction }]} numberOfLines={1}>{item.title}</Text>
                      <Text style={[styles.meta, { textAlign: align, writingDirection: direction }]}>{item.mode}</Text>
                    </View>
                    <Text style={styles.percent}>{item.percentage.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.historyFill, { width: `${Math.max(3, Math.min(100, item.percentage))}%` }]} />
                  </View>
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
  content: { paddingBottom: 130, gap: theme.spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { gap: theme.spacing.sm },
  headerCopy: { gap: 5 },
  title: { color: theme.colors.text, fontSize: theme.typography.title, fontWeight: "900" },
  subtitle: { color: theme.colors.mutedText, lineHeight: 23 },
  mistakeButton: { minHeight: 42, alignSelf: "flex-start", flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft },
  mistakeButtonText: { color: theme.colors.primary, fontWeight: "800" },
  error: { color: theme.colors.danger, lineHeight: 21 },
  emptyHero: { alignItems: "center", gap: theme.spacing.md, padding: theme.spacing.xl, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  emptyIcon: { width: 70, height: 70, alignItems: "center", justifyContent: "center", borderRadius: 35, backgroundColor: theme.colors.primarySoft },
  emptyTitle: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: "800" },
  body: { color: theme.colors.mutedText, lineHeight: 24 },
  emptyActions: { width: "100%", gap: theme.spacing.sm },
  primaryButton: { minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: { minHeight: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md },
  secondaryButtonText: { color: theme.colors.primary, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  card: { gap: theme.spacing.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  previewGrid: { gap: theme.spacing.sm },
  previewItem: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, padding: theme.spacing.sm, borderRadius: theme.radius.md, backgroundColor: theme.colors.background },
  previewIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: theme.colors.primarySoft },
  previewLabel: { flex: 1, color: theme.colors.text, fontWeight: "700" },
  sectionTitle: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: "800" },
  summaryCard: { gap: theme.spacing.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft },
  summaryTop: { alignItems: "center", gap: theme.spacing.md },
  scoreCircle: { width: 94, height: 94, alignItems: "center", justifyContent: "center", borderRadius: 47, borderWidth: 7, borderColor: theme.colors.primary, backgroundColor: "#FFFFFF" },
  scoreValue: { color: theme.colors.text, fontSize: 24, fontWeight: "900" },
  scoreLabel: { color: theme.colors.mutedText, fontSize: 11, fontWeight: "700" },
  summaryCopy: { flex: 1, gap: theme.spacing.sm },
  trendRow: { alignItems: "center", gap: 7 },
  trendText: { flex: 1, color: theme.colors.text, fontWeight: "700" },
  overallTrack: { height: 8, overflow: "hidden", borderRadius: theme.radius.pill, backgroundColor: "#FFFFFF" },
  overallFill: { height: "100%", borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary },
  metrics: { flexWrap: "wrap", gap: theme.spacing.sm },
  metric: { width: "30%", flexGrow: 1, minHeight: 82, justifyContent: "center", gap: 3, padding: theme.spacing.sm, borderRadius: theme.radius.md, backgroundColor: "#FFFFFF" },
  metricValue: { color: theme.colors.text, fontSize: 20, fontWeight: "900" },
  metricLabel: { color: theme.colors.mutedText, fontSize: 11 },
  journeyRow: { gap: theme.spacing.sm },
  journeyItem: { flex: 1, minWidth: 0, gap: 5, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.background },
  journeyIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: theme.colors.surface },
  journeyValue: { color: theme.colors.text, fontSize: 20, fontWeight: "900" },
  journeyLabel: { color: theme.colors.text, fontWeight: "800", fontSize: 12 },
  journeyBody: { color: theme.colors.mutedText, fontSize: 11, lineHeight: 16 },
  nextStepContent: { gap: theme.spacing.sm },
  performanceItem: { gap: 7, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  performanceTop: { alignItems: "center", gap: 10 },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { color: theme.colors.text, fontWeight: "700" },
  meta: { color: theme.colors.mutedText, fontSize: theme.typography.small },
  percent: { color: theme.colors.primary, fontWeight: "900" },
  barTrack: { height: 7, overflow: "hidden", borderRadius: theme.radius.pill, backgroundColor: theme.colors.background },
  barFill: { height: "100%", borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary },
  historyFill: { height: "100%", borderRadius: theme.radius.pill, backgroundColor: theme.colors.success },
  sectionHeader: { alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm },
  link: { color: theme.colors.primary, fontSize: theme.typography.small, fontWeight: "800" },
  historyItem: { gap: 7, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border }
});
