import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../components/screen";
import { apiRequest, ApiError } from "../../lib/api";
import { getActivePersistedExam } from "../../lib/exam-storage";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

type Blueprint = {
  id: string;
  code: string;
  name: string;
  effectiveYear: number | null;
  questionCount: number;
  durationSeconds: number | null;
  scoringConfigured?: boolean;
};

type CompletedAttempt = {
  attemptId: string;
  title: string;
  mode: string;
  questionCount: number;
  score: number;
  maxScore: number;
  percentage: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  totalTimeSeconds: number;
  submittedAt: string | null;
};

type ActiveAttemptResponse = {
  attempt: {
    id: string;
    title: string;
    questionCount: number;
    summary: { answered: number; unanswered: number; flagged: number };
  } | null;
};

const copy = {
  fa: {
    title: "امتحانات",
    full: "شبیه‌سازی کامل کانکور",
    fullBody: "امتحان کامل بر اساس طرح فعال و سوالات تاییدشده.",
    questions: "سوال",
    duration: "زمان",
    noTimer: "بدون زمان تعیین‌شده",
    start: "شروع امتحان",
    resume: "ادامه امتحان",
    resumeBody: "یک امتحان ناتمام روی حساب شما وجود دارد.",
    answered: "پاسخ داده",
    noBlueprint: "هنوز طرح فعال کانکور تنظیم نشده است. مدیر محتوا باید یک طرح فعال ایجاد کند.",
    insufficient: "برای این امتحان هنوز سوالات منتشرشده کافی نیست.",
    error: "امتحان شروع نشد. دوباره تلاش کنید.",
    scoring: "قواعد امتیازدهی این طرح هنوز تنظیم نشده است.",
    history: "امتحانات تکمیل‌شده",
    noHistory: "هنوز امتحان تکمیل‌شده ندارید.",
    viewResult: "مشاهده نتیجه",
    historical: "فورم‌های تاریخی",
    historicalBody: "کانکورهای گذشته را با هویت و ترتیب اصلی حفظ‌شده انجام دهید.",
    browseHistorical: "مشاهده آرشیف تاریخی"
  },
  ps: {
    title: "ازموینې",
    full: "بشپړه کانکور ازموینه",
    fullBody: "بشپړه ازموینه د فعال پلان او تایید شوو پوښتنو پر بنسټ.",
    questions: "پوښتنې",
    duration: "وخت",
    noTimer: "ټاکلی وخت نشته",
    start: "ازموینه پیل کړئ",
    resume: "ازموینه ادامه کړئ",
    resumeBody: "ستاسو په حساب کې یوه نیمګړې ازموینه شته.",
    answered: "ځواب شوي",
    noBlueprint: "تر اوسه فعال کانکور پلان نه دی جوړ شوی. د محتوا مدیر باید فعال پلان جوړ کړي.",
    insufficient: "د دې ازموینې لپاره کافي خپرې شوې پوښتنې نشته.",
    error: "ازموینه پیل نه شوه. بیا هڅه وکړئ.",
    scoring: "د دې پلان د نمرې قواعد لا نه دي تنظیم شوي.",
    history: "بشپړې شوې ازموینې",
    noHistory: "تراوسه مو بشپړه ازموینه نه ده کړې.",
    viewResult: "پایله وګورئ",
    historical: "تاریخي فورمې",
    historicalBody: "پخوانۍ کانکور فورمې د خوندي شوي هویت او اصلي ترتیب سره ترسره کړئ.",
    browseHistorical: "تاریخي آرشیف وګورئ"
  },
  en: {
    title: "Exams",
    full: "Full Kankor simulation",
    fullBody: "A complete exam generated from the active blueprint and published questions.",
    questions: "questions",
    duration: "Duration",
    noTimer: "No configured timer",
    start: "Start exam",
    resume: "Resume exam",
    resumeBody: "You have an unfinished exam on this account.",
    answered: "answered",
    noBlueprint: "No active Kankor blueprint is configured yet. A content admin must create and activate one.",
    insufficient: "There are not enough published questions for this exam yet.",
    error: "The exam could not be started. Try again.",
    scoring: "Scoring rules are not configured for this blueprint yet.",
    history: "Completed exams",
    noHistory: "You have not completed an exam yet.",
    viewResult: "View result",
    historical: "Historical forms",
    historicalBody: "Take past Kankor forms with preserved identity and original ordering.",
    browseHistorical: "Browse historical archive"
  }
} as const;

function durationLabel(seconds: number | null, noTimer: string) {
  if (!seconds) return noTimer;
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export default function ExamsScreen() {
  const { token } = useAuth();
  const { locale, direction } = useLocale();
  const text = copy[locale];
  const align = direction === "rtl" ? "right" : "left";

  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<ActiveAttemptResponse["attempt"]>(null);
  const [completed, setCompleted] = useState<CompletedAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
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

    try {
      const [blueprintResult, attemptResult, completedResult] = await Promise.all([
        apiRequest<{ blueprint: Blueprint | null }>("/exams/active-blueprint", {}, token),
        apiRequest<ActiveAttemptResponse>("/attempts/active", {}, token),
        apiRequest<{ items: CompletedAttempt[] }>("/attempts/completed", {}, token)
      ]);
      setBlueprint(blueprintResult.blueprint);
      setActiveAttempt(attemptResult.attempt);
      setCompleted(completedResult.items);
    } catch {
      if (!local) setError(text.error);
    } finally {
      setLoading(false);
    }
  }, [token, text.error]);

  useEffect(() => { void load(); }, [load]);

  async function startFullExam() {
    if (!token || starting) return;
    setStarting(true);
    setError("");

    try {
      const generated = await apiRequest<{
        exam: { id: string; title: string; questionCount: number; durationSeconds: number | null };
      }>("/exams/generate", {
        method: "POST",
        body: JSON.stringify({ mode: "full_kankor", language: locale })
      }, token);

      const started = await apiRequest<{ attempt: { id: string } }>("/attempts", {
        method: "POST",
        body: JSON.stringify({ examId: generated.exam.id })
      }, token);

      router.push(`/exam/${started.attempt.id}`);
    } catch (cause) {
      const code = cause instanceof ApiError ? cause.code : "";
      if (code === "premium_required") {
        router.push("/premium");
      } else {
        setError(code === "insufficient_question_pool" ? text.insufficient : code === "active_blueprint_required" ? text.noBlueprint : code === "scoring_rules_required" ? text.scoring : text.error);
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.stack}>
        <Text style={[styles.title, { textAlign: align }]}>{text.title}</Text>

        {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
        {error ? <Text style={[styles.error, { textAlign: align }]}>{error}</Text> : null}

        {activeAttempt ? (
          <View style={styles.card}>
            <View style={styles.iconWrap}><Ionicons name="refresh-circle-outline" size={26} color={theme.colors.primary} /></View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { textAlign: align }]}>{text.resume}</Text>
              <Text style={[styles.body, { textAlign: align }]}>{text.resumeBody}</Text>
              <Text style={[styles.meta, { textAlign: align }]}>
                {activeAttempt.summary.answered}/{activeAttempt.questionCount} {text.answered}
              </Text>
              <Pressable style={styles.primaryButton} onPress={() => router.push(`/exam/${activeAttempt.id}`)}>
                <Text style={styles.primaryButtonText}>{text.resume}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.iconWrap}><Ionicons name="document-text-outline" size={26} color={theme.colors.primary} /></View>
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, { textAlign: align }]}>{text.full}</Text>
            <Text style={[styles.body, { textAlign: align }]}>{text.fullBody}</Text>

            {blueprint ? (
              <>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{blueprint.questionCount} {text.questions}</Text>
                  <Text style={styles.meta}>{text.duration}: {durationLabel(blueprint.durationSeconds, text.noTimer)}</Text>
                </View>
                <Pressable disabled={starting || Boolean(activeAttempt)} style={[styles.primaryButton, (starting || Boolean(activeAttempt)) && styles.disabled]} onPress={() => void startFullExam()}>
                  {starting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{text.start}</Text>}
                </Pressable>
              </>
            ) : !loading ? (
              <Text style={[styles.warning, { textAlign: align }]}>{text.noBlueprint}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.iconWrap}><Ionicons name="archive-outline" size={26} color={theme.colors.primary} /></View>
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, { textAlign: align }]}>{text.historical}</Text>
            <Text style={[styles.body, { textAlign: align }]}>{text.historicalBody}</Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push("/historical")}>
              <Text style={styles.primaryButtonText}>{text.browseHistorical}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={[styles.cardTitle, { textAlign: align }]}>{text.history}</Text>
          {completed.length ? completed.map((item) => (
            <Pressable
              key={item.attemptId}
              style={styles.historyCard}
              onPress={() => router.push(`/result/${item.attemptId}`)}
            >
              <View style={styles.historyCopy}>
                <Text style={[styles.historyTitle, { textAlign: align }]}>{item.title}</Text>
                <Text style={[styles.meta, { textAlign: align }]}>
                  {item.score} / {item.maxScore} · {item.percentage.toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.resultLink}>{text.viewResult}</Text>
            </Pressable>
          )) : (
            <Text style={[styles.body, { textAlign: align }]}>{text.noHistory}</Text>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 120 },
  stack: { gap: theme.spacing.lg },
  title: { color: theme.colors.text, fontSize: theme.typography.title, fontWeight: "800" },
  card: { flexDirection: "row", gap: theme.spacing.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft },
  cardBody: { flex: 1, gap: theme.spacing.sm },
  cardTitle: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: "800" },
  body: { color: theme.colors.mutedText, lineHeight: 25 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md },
  meta: { color: theme.colors.mutedText, fontSize: theme.typography.small, fontWeight: "600" },
  primaryButton: { minHeight: 46, marginTop: theme.spacing.sm, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.md },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  warning: { color: theme.colors.warning, lineHeight: 23 },
  error: { color: theme.colors.danger },
  disabled: { opacity: 0.5 },
  historySection: { gap: theme.spacing.sm },
  historyCard: { minHeight: 72, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
  historyCopy: { flex: 1, gap: 4 },
  historyTitle: { color: theme.colors.text, fontWeight: "700" },
  resultLink: { color: theme.colors.primary, fontWeight: "800" }
});
