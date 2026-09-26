import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../components/screen";
import { ApiError, apiRequest } from "../../lib/api";
import { getActivePersistedExam } from "../../lib/exam-storage";
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
  accuracyPercentage: number;
  questionsAnswered: number;
};

type HistoryRow = {
  attemptId: string;
  submittedAt: string | null;
  title: string;
  mode: string;
  percentage: number;
};

type ActiveAttempt = {
  id: string;
  title: string;
  questionCount: number;
  summary: {
    answered: number;
    unanswered: number;
    flagged: number;
  };
};

type SubscriptionState = {
  tier: "free" | "premium";
  subscription: {
    planNameFa: string;
    planNamePs: string;
    planNameEn: string;
  } | null;
};

const copy = {
  fa: {
    welcome: "آماده‌اید ادامه دهید؟",
    subtitle: "امروز یک قدم دیگر به هدف کانکور نزدیک شوید.",
    target: "هدف",
    free: "رایگان",
    premium: "Premium",
    continueExam: "ادامه امتحان",
    continueBody: "امتحان ناتمام شما آماده ادامه دادن است.",
    answered: "پاسخ داده شده",
    continue: "ادامه",
    recommendation: "پیشنهاد امروز",
    weakArea: "این موضوع به تمرین بیشتر نیاز دارد.",
    firstAction: "اولین تمرین خود را شروع کنید تا پیشنهادهای شخصی ساخته شوند.",
    practiceNow: "تمرین اکنون",
    browsePractice: "رفتن به تمرین",
    progress: "خلاصه پیشرفت",
    completed: "امتحان",
    questions: "سوال",
    average: "میانگین",
    mistakes: "اشتباه فعال",
    viewProgress: "مشاهده پیشرفت",
    quick: "دسترسی سریع",
    practice: "تمرین",
    fullKankor: "کانکور کامل",
    historical: "آرشیف تاریخی",
    mistakeNotebook: "اشتباهات",
    recent: "فعالیت اخیر",
    noRecent: "پس از تکمیل امتحان، نتایج اخیر شما اینجا نمایش داده می‌شود.",
    viewAll: "همه نتایج",
    loadingError: "بخشی از اطلاعات خانه بارگیری نشد. می‌توانید دوباره وارد این صفحه شوید."
  },
  ps: {
    welcome: "دوام ته چمتو یاست؟",
    subtitle: "نن خپل کانکور هدف ته یو بل ګام نږدې شئ.",
    target: "هدف",
    free: "وړیا",
    premium: "Premium",
    continueExam: "ازموینه ادامه کړئ",
    continueBody: "ستاسو نیمګړې ازموینه د ادامه لپاره چمتو ده.",
    answered: "ځواب شوي",
    continue: "ادامه",
    recommendation: "د نن وړاندیز",
    weakArea: "دا موضوع لا ډېر تمرین ته اړتیا لري.",
    firstAction: "خپل لومړی تمرین پیل کړئ تر څو شخصي وړاندیزونه جوړ شي.",
    practiceNow: "اوس تمرین",
    browsePractice: "تمرین ته لاړ شئ",
    progress: "د پرمختګ لنډیز",
    completed: "ازموینې",
    questions: "پوښتنې",
    average: "منځنۍ پایله",
    mistakes: "فعالې تېروتنې",
    viewProgress: "پرمختګ وګورئ",
    quick: "چټک لاسرسی",
    practice: "تمرین",
    fullKankor: "بشپړ کانکور",
    historical: "تاریخي آرشیف",
    mistakeNotebook: "تېروتنې",
    recent: "وروستی فعالیت",
    noRecent: "د ازموینې له بشپړولو وروسته به وروستۍ پایلې دلته ښکاره شي.",
    viewAll: "ټولې پایلې",
    loadingError: "د کور پاڼې ځینې معلومات پورته نه شول. پاڼه بیا پرانیستلی شئ."
  },
  en: {
    welcome: "Ready to continue?",
    subtitle: "Take one more useful step toward your Kankor goal today.",
    target: "Target",
    free: "Free",
    premium: "Premium",
    continueExam: "Continue exam",
    continueBody: "Your unfinished exam is ready to resume.",
    answered: "answered",
    continue: "Continue",
    recommendation: "Today's recommendation",
    weakArea: "This topic needs more practice.",
    firstAction: "Start your first practice session to build personalized recommendations.",
    practiceNow: "Practice now",
    browsePractice: "Go to Practice",
    progress: "Progress snapshot",
    completed: "Exams",
    questions: "Questions",
    average: "Average",
    mistakes: "Active mistakes",
    viewProgress: "View Progress",
    quick: "Quick actions",
    practice: "Practice",
    fullKankor: "Full Kankor",
    historical: "Historical forms",
    mistakeNotebook: "Mistakes",
    recent: "Recent activity",
    noRecent: "Your latest results will appear here after you complete an exam.",
    viewAll: "View all results",
    loadingError: "Some Home information could not be loaded. You can reopen this page to retry."
  }
} as const;

export default function HomeScreen() {
  const { user, token } = useAuth();
  const { locale, direction, text: sharedText } = useLocale();
  const text = copy[locale];
  const align = direction === "rtl" ? "right" : "left";
  const rowDirection = "row";

  const [overview, setOverview] = useState<Overview | null>(null);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [activeAttempt, setActiveAttempt] = useState<ActiveAttempt | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingTopic, setStartingTopic] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    const local = await getActivePersistedExam();
    if (local?.payload.attempt.status === "in_progress") {
      setActiveAttempt({
        id: local.payload.attempt.id,
        title: local.payload.attempt.title,
        questionCount: local.payload.attempt.questionCount,
        summary: local.payload.attempt.summary
      });
    }

    const results = await Promise.allSettled([
      apiRequest<Overview>("/progress/overview", {}, token),
      apiRequest<{ items: TopicRow[] }>("/progress/topics", {}, token),
      apiRequest<{ items: HistoryRow[] }>("/progress/history", {}, token),
      apiRequest<{ attempt: ActiveAttempt | null }>("/attempts/active", {}, token),
      apiRequest<SubscriptionState>("/subscription", {}, token)
    ]);

    const [overviewResult, topicResult, historyResult, attemptResult, subscriptionResult] = results;

    if (overviewResult.status === "fulfilled") setOverview(overviewResult.value);
    if (topicResult.status === "fulfilled") setTopics(topicResult.value.items);
    if (historyResult.status === "fulfilled") setHistory(historyResult.value.items);
    if (attemptResult.status === "fulfilled") setActiveAttempt(attemptResult.value.attempt);
    if (subscriptionResult.status === "fulfilled") setSubscription(subscriptionResult.value);

    if (results.every((item) => item.status === "rejected") && !local) {
      setError(text.loadingError);
    }

    setLoading(false);
  }, [token, text.loadingError]);

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  const weakestTopic = topics[0] ?? null;
  const isPremium = subscription?.tier === "premium";

  const planLabel = useMemo(() => {
    if (!subscription) return "—";
    if (subscription.tier === "free") return text.free;
    const plan = subscription.subscription;
    if (!plan) return text.premium;
    if (locale === "ps") return plan.planNamePs || plan.planNameFa || text.premium;
    if (locale === "en") return plan.planNameEn || plan.planNameFa || text.premium;
    return plan.planNameFa || text.premium;
  }, [subscription, locale, text.free, text.premium]);

  function localize(fa: string, ps: string | null) {
    return locale === "ps" ? (ps || fa) : fa;
  }

  async function practiceWeakTopic() {
    if (!weakestTopic || !token || startingTopic) {
      router.push("/(tabs)/practice");
      return;
    }

    if (!isPremium) {
      router.push("/(tabs)/practice");
      return;
    }

    setStartingTopic(true);
    try {
      const result = await apiRequest<{ attempt: { id: string } }>(
        `/progress/topics/${weakestTopic.topicId}/practice`,
        { method: "POST", body: JSON.stringify({}) },
        token
      );
      router.push(`/exam/${result.attempt.id}`);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "premium_required") {
        router.push("/premium");
      } else {
        router.push("/(tabs)/practice");
      }
    } finally {
      setStartingTopic(false);
    }
  }

  const quickActions = [
    { label: text.practice, icon: "book-outline" as const, action: () => router.push("/(tabs)/practice") },
    { label: text.fullKankor, icon: "document-text-outline" as const, action: () => router.push("/(tabs)/exams") },
    { label: text.historical, icon: "archive-outline" as const, action: () => router.push("/historical") },
    {
      label: text.mistakeNotebook,
      icon: "alert-circle-outline" as const,
      action: () => router.push("/mistakes")
    }
  ];

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.appName, { textAlign: align, writingDirection: direction }]}>{sharedText.appName}</Text>
          <Text style={[styles.title, { textAlign: align, writingDirection: direction }]}>{text.welcome}</Text>
          <Text style={[styles.subtitle, { textAlign: align, writingDirection: direction }]}>{text.subtitle}</Text>
        </View>
        <View style={[styles.badges, { flexDirection: rowDirection }]}>
          <View style={styles.targetBadge}>
            <Text style={styles.badgeLabel}>{text.target}</Text>
            <Text style={styles.badgeValue}>{user?.targetExamYear ?? "—"}</Text>
          </View>
          <Pressable style={[styles.planBadge, isPremium && styles.planBadgePremium]} onPress={() => router.push("/premium")}>
            <Ionicons name={isPremium ? "diamond-outline" : "person-circle-outline"} size={16} color={isPremium ? theme.colors.primary : theme.colors.mutedText} />
            <Text style={[styles.planText, isPremium && styles.planTextPremium]} numberOfLines={1}>{planLabel}</Text>
          </Pressable>
        </View>
      </View>

      {loading && !overview && !activeAttempt ? (
        <View style={styles.loading}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : null}
      {error ? <Text style={[styles.error, { textAlign: align, writingDirection: direction }]}>{error}</Text> : null}

      {activeAttempt ? (
        <View style={styles.heroCard}>
          <View style={[styles.cardHeader, { flexDirection: rowDirection }]}>
            <View style={styles.iconCircle}>
              <Ionicons name="play-circle-outline" size={26} color={theme.colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.continueExam}</Text>
              <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.continueBody}</Text>
            </View>
          </View>
          <Text style={[styles.attemptTitle, { textAlign: align, writingDirection: direction }]} numberOfLines={2}>
            {activeAttempt.title}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.round((activeAttempt.summary.answered / Math.max(1, activeAttempt.questionCount)) * 100))}%` }
              ]}
            />
          </View>
          <View style={[styles.between, { flexDirection: rowDirection }]}>
            <Text style={styles.meta}>{activeAttempt.summary.answered}/{activeAttempt.questionCount} {text.answered}</Text>
            <Pressable style={styles.compactPrimary} onPress={() => router.push(`/exam/${activeAttempt.id}`)}>
              <Text style={styles.compactPrimaryText}>{text.continue}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.recommendation}</Text>
        {weakestTopic ? (
          <>
            <View style={[styles.recommendationRow, { flexDirection: rowDirection }]}>
              <View style={styles.iconCircleSoft}>
                <Ionicons name="trending-up-outline" size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.itemTitle, { textAlign: align, writingDirection: direction }]}>
                  {localize(weakestTopic.topicFa, weakestTopic.topicPs)}
                </Text>
                <Text style={[styles.meta, { textAlign: align, writingDirection: direction }]}>
                  {localize(weakestTopic.subjectFa, weakestTopic.subjectPs)} · {weakestTopic.accuracyPercentage.toFixed(1)}%
                </Text>
                <Text style={[styles.bodySmall, { textAlign: align, writingDirection: direction }]}>{text.weakArea}</Text>
              </View>
            </View>
            <Pressable disabled={startingTopic} style={[styles.fullPrimary, startingTopic && styles.disabled]} onPress={() => void practiceWeakTopic()}>
              {startingTopic
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.fullPrimaryText}>{isPremium ? text.practiceNow : text.browsePractice}</Text>}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.firstAction}</Text>
            <Pressable style={styles.fullPrimary} onPress={() => router.push("/(tabs)/practice")}>
              <Text style={styles.fullPrimaryText}>{text.browsePractice}</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <View style={[styles.between, { flexDirection: rowDirection }]}>
          <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.progress}</Text>
          <Pressable onPress={() => router.push("/(tabs)/progress")}><Text style={styles.link}>{text.viewProgress}</Text></Pressable>
        </View>
        <View style={[styles.metrics, { flexDirection: rowDirection }]}>
          {[
            [text.completed, overview?.completedExams ?? 0],
            [text.questions, overview?.questionsAttempted ?? 0],
            [text.average, `${(overview?.averagePercentage ?? 0).toFixed(1)}%`],
            [text.mistakes, overview?.activeMistakes ?? 0]
          ].map(([label, value]) => (
            <View style={styles.metric} key={String(label)}>
              <Text style={styles.metricValue}>{String(value)}</Text>
              <Text style={[styles.metricLabel, { textAlign: align, writingDirection: direction }]}>{String(label)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.quick}</Text>
        <View style={[styles.quickGrid, { flexDirection: rowDirection }]}>
          {quickActions.map((item) => (
            <Pressable key={item.label} style={styles.quickCard} onPress={item.action}>
              <View style={styles.quickIcon}><Ionicons name={item.icon} size={23} color={theme.colors.primary} /></View>
              <Text style={[styles.quickLabel, { textAlign: align, writingDirection: direction }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={[styles.between, { flexDirection: rowDirection }]}>
          <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.recent}</Text>
          {history.length ? (
            <Pressable onPress={() => router.push("/(tabs)/exams")}><Text style={styles.link}>{text.viewAll}</Text></Pressable>
          ) : null}
        </View>
        {history.length ? history.slice(0, 3).map((item) => (
          <Pressable
            key={item.attemptId}
            style={[styles.historyRow, { flexDirection: rowDirection }]}
            onPress={() => router.push(`/result/${item.attemptId}`)}
          >
            <View style={styles.flex}>
              <Text style={[styles.itemTitle, { textAlign: align, writingDirection: direction }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.meta, { textAlign: align, writingDirection: direction }]}>{item.mode}</Text>
            </View>
            <Text style={styles.score}>{item.percentage.toFixed(1)}%</Text>
          </Pressable>
        )) : (
          <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.noRecent}</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 130, gap: theme.spacing.md },
  header: { gap: theme.spacing.md },
  headerCopy: { gap: 5 },
  appName: { color: theme.colors.primary, fontSize: theme.typography.small, fontWeight: "800" },
  title: { color: theme.colors.text, fontSize: theme.typography.title, fontWeight: "900" },
  subtitle: { color: theme.colors.mutedText, lineHeight: 23 },
  badges: { flexWrap: "wrap", gap: theme.spacing.sm },
  targetBadge: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft },
  badgeLabel: { color: theme.colors.primary, fontSize: theme.typography.small, fontWeight: "700" },
  badgeValue: { color: theme.colors.primary, fontWeight: "900" },
  planBadge: { minHeight: 42, maxWidth: 180, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface },
  planBadgePremium: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  planText: { flexShrink: 1, color: theme.colors.mutedText, fontWeight: "800" },
  planTextPremium: { color: theme.colors.primary },
  loading: { minHeight: 80, alignItems: "center", justifyContent: "center" },
  error: { color: theme.colors.danger, lineHeight: 22 },
  heroCard: { gap: theme.spacing.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft },
  card: { gap: theme.spacing.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  section: { gap: theme.spacing.sm },
  cardHeader: { alignItems: "center", gap: theme.spacing.sm },
  iconCircle: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 23, backgroundColor: "#FFFFFF" },
  iconCircleSoft: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 21, backgroundColor: theme.colors.primarySoft },
  flex: { flex: 1 },
  sectionTitle: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: "800" },
  body: { color: theme.colors.mutedText, lineHeight: 24 },
  bodySmall: { color: theme.colors.mutedText, fontSize: theme.typography.small, lineHeight: 21, marginTop: 3 },
  attemptTitle: { color: theme.colors.text, fontWeight: "800", lineHeight: 22 },
  progressTrack: { height: 8, overflow: "hidden", borderRadius: theme.radius.pill, backgroundColor: "#FFFFFF" },
  progressFill: { height: "100%", borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary },
  between: { alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm },
  meta: { color: theme.colors.mutedText, fontSize: theme.typography.small, fontWeight: "600" },
  compactPrimary: { minHeight: 38, justifyContent: "center", paddingHorizontal: 14, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary },
  compactPrimaryText: { color: "#FFFFFF", fontWeight: "800" },
  recommendationRow: { alignItems: "center", gap: theme.spacing.sm },
  itemTitle: { color: theme.colors.text, fontWeight: "800", lineHeight: 22 },
  fullPrimary: { minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.md, backgroundColor: theme.colors.primary },
  fullPrimaryText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  link: { color: theme.colors.primary, fontSize: theme.typography.small, fontWeight: "800" },
  metrics: { flexWrap: "wrap", gap: theme.spacing.sm },
  metric: { width: "47%", flexGrow: 1, minHeight: 88, justifyContent: "center", gap: 4, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.background },
  metricValue: { color: theme.colors.text, fontSize: 22, fontWeight: "900" },
  metricLabel: { color: theme.colors.mutedText, fontSize: theme.typography.small },
  quickGrid: { flexWrap: "wrap", gap: theme.spacing.sm },
  quickCard: { width: "47%", flexGrow: 1, minHeight: 92, justifyContent: "space-between", gap: 10, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
  quickIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: theme.colors.primarySoft },
  quickLabel: { color: theme.colors.text, fontWeight: "800" },
  historyRow: { minHeight: 58, alignItems: "center", gap: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.sm },
  score: { color: theme.colors.primary, fontWeight: "900" }
});
