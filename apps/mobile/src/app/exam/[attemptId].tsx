import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { AppButton } from "../../components/app-button";
import { apiRequest, ApiError } from "../../lib/api";
import {
  loadPersistedExam,
  mergeExamAnswers,
  removePersistedExam,
  savePersistedExam,
  type ChoiceKey,
  type ExamAnswerState,
  type ExamAttemptState
} from "../../lib/exam-storage";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

const copy = {
  fa: {
    loading: "امتحان در حال بارگیری است...",
    unavailable: "امتحان در دسترس نیست.",
    offline: "آفلاین — پاسخ‌ها روی دستگاه ذخیره می‌شوند.",
    synced: "پاسخ‌ها ذخیره شده‌اند.",
    question: "سوال",
    of: "از",
    flag: "علامت‌گذاری",
    flagged: "علامت‌گذاری شده",
    previous: "قبلی",
    next: "بعدی",
    submit: "ارسال امتحان",
    answered: "پاسخ داده",
    unanswered: "بی‌پاسخ",
    flaggedCount: "علامت‌دار",
    submitTitle: "ارسال امتحان؟",
    submitBody: "پس از ارسال، پاسخ‌ها قفل می‌شوند.",
    returnExam: "بازگشت",
    submitAnyway: "ارسال",
    expired: "زمان امتحان تمام شده است.",
    submitted: "امتحان با موفقیت ارسال شد.",
    backExams: "بازگشت به امتحانات",
    retry: "تلاش دوباره"
  },
  ps: {
    loading: "ازموینه پورته کېږي...",
    unavailable: "ازموینه شتون نه لري.",
    offline: "آفلاین — ځوابونه په وسیله کې ساتل کېږي.",
    synced: "ځوابونه خوندي شوي.",
    question: "پوښتنه",
    of: "له",
    flag: "نښه کول",
    flagged: "نښه شوې",
    previous: "مخکینی",
    next: "بل",
    submit: "ازموینه سپارل",
    answered: "ځواب شوي",
    unanswered: "بې ځوابه",
    flaggedCount: "نښه شوي",
    submitTitle: "ازموینه وسپارئ؟",
    submitBody: "له سپارلو وروسته ځوابونه قفل کېږي.",
    returnExam: "بېرته",
    submitAnyway: "سپارل",
    expired: "د ازموینې وخت پای ته رسېدلی.",
    submitted: "ازموینه په بریالیتوب وسپارل شوه.",
    backExams: "ازموینو ته بېرته",
    retry: "بیا هڅه"
  },
  en: {
    loading: "Loading exam...",
    unavailable: "This exam is unavailable.",
    offline: "Offline — answers are being kept on this device.",
    synced: "Answers saved.",
    question: "Question",
    of: "of",
    flag: "Flag",
    flagged: "Flagged",
    previous: "Previous",
    next: "Next",
    submit: "Submit exam",
    answered: "Answered",
    unanswered: "Unanswered",
    flaggedCount: "Flagged",
    submitTitle: "Submit exam?",
    submitBody: "Your answers will be locked after submission.",
    returnExam: "Return",
    submitAnyway: "Submit",
    expired: "Exam time has expired.",
    submitted: "Exam submitted successfully.",
    backExams: "Back to Exams",
    retry: "Retry"
  }
} as const;

function formatTime(seconds: number | null) {
  if (seconds == null) return "—";
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function summary(questionCount: number, answers: ExamAnswerState[]) {
  const answered = answers.filter((answer) => Boolean(answer.selectedChoice)).length;
  const flagged = answers.filter((answer) => answer.flagged).length;
  return {
    questionCount,
    answered,
    unanswered: Math.max(0, questionCount - answered),
    flagged
  };
}

export default function ExamSessionScreen() {
  const params = useLocalSearchParams<{ attemptId: string }>();
  const attemptId = Array.isArray(params.attemptId) ? params.attemptId[0] : params.attemptId;
  const { token } = useAuth();
  const { locale, direction } = useLocale();
  const text = copy[locale];
  const align = direction === "rtl" ? "right" : "left";
  const rowDirection = "row";

  const [payload, setPayload] = useState<ExamAttemptState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [fatalError, setFatalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const enteredAtRef = useRef(Date.now());
  const payloadRef = useRef<ExamAttemptState | null>(null);
  const indexRef = useRef(0);

  useEffect(() => { payloadRef.current = payload; }, [payload]);
  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);

  const persist = useCallback(async (nextPayload: ExamAttemptState, index = indexRef.current) => {
    if (!attemptId) return;
    await savePersistedExam({
      attemptId,
      payload: nextPayload,
      currentIndex: index,
      updatedAt: new Date().toISOString()
    });
  }, [attemptId]);

  const syncAnswers = useCallback(async (answers: ExamAnswerState[]) => {
    if (!attemptId || !token || !answers.length) return;
    try {
      await apiRequest(`/attempts/${attemptId}/answers`, {
        method: "PATCH",
        body: JSON.stringify({ answers })
      }, token);
      setOffline(false);
    } catch (error) {
      if (error instanceof ApiError && error.code === "attempt_time_expired") return;
      setOffline(true);
    }
  }, [attemptId, token]);

  const applyAnswer = useCallback(async (
    examQuestionId: string,
    patch: Partial<Pick<ExamAnswerState, "selectedChoice" | "flagged" | "timeSpentSeconds">>,
    includeElapsed = false
  ) => {
    const currentPayload = payloadRef.current;
    if (!currentPayload) return null;

    const current = currentPayload.answers.find((item) => item.examQuestionId === examQuestionId);
    const elapsed = includeElapsed ? Math.max(0, Math.floor((Date.now() - enteredAtRef.current) / 1000)) : 0;

    const nextAnswer: ExamAnswerState = {
      examQuestionId,
      selectedChoice: patch.selectedChoice !== undefined ? patch.selectedChoice : (current?.selectedChoice ?? null),
      flagged: patch.flagged !== undefined ? patch.flagged : (current?.flagged ?? false),
      timeSpentSeconds: patch.timeSpentSeconds !== undefined
        ? patch.timeSpentSeconds
        : (current?.timeSpentSeconds ?? 0) + elapsed,
      clientRevision: (current?.clientRevision ?? 0) + 1
    };

    const answers = current
      ? currentPayload.answers.map((item) => item.examQuestionId === examQuestionId ? nextAnswer : item)
      : [...currentPayload.answers, nextAnswer];

    const nextPayload: ExamAttemptState = {
      ...currentPayload,
      attempt: {
        ...currentPayload.attempt,
        summary: summary(currentPayload.attempt.questionCount, answers)
      },
      answers
    };

    payloadRef.current = nextPayload;
    setPayload(nextPayload);
    enteredAtRef.current = Date.now();
    await persist(nextPayload);
    void syncAnswers([nextAnswer]);
    return nextAnswer;
  }, [persist, syncAnswers]);

  const commitCurrentElapsed = useCallback(async () => {
    const currentPayload = payloadRef.current;
    if (!currentPayload) return;
    const question = currentPayload.questions[indexRef.current];
    if (!question) return;

    const elapsed = Math.max(0, Math.floor((Date.now() - enteredAtRef.current) / 1000));
    if (elapsed <= 0) return;

    await applyAnswer(question.id, {
      timeSpentSeconds:
        (currentPayload.answers.find((answer) => answer.examQuestionId === question.id)?.timeSpentSeconds ?? 0)
        + elapsed
    });
  }, [applyAnswer]);

  const hydrate = useCallback(async () => {
    if (!attemptId || !token) return;
    setLoading(true);
    setFatalError("");

    const local = await loadPersistedExam(attemptId);
    if (local) {
      payloadRef.current = local.payload;
      setPayload(local.payload);
      setCurrentIndex(Math.min(local.currentIndex, Math.max(0, local.payload.questions.length - 1)));
      setRemainingSeconds(local.payload.attempt.remainingSeconds);
    }

    try {
      const remote = await apiRequest<ExamAttemptState>(`/attempts/${attemptId}`, {}, token);
      const mergedAnswers = mergeExamAnswers(local?.payload.answers ?? [], remote.answers);
      const merged: ExamAttemptState = {
        ...remote,
        attempt: {
          ...remote.attempt,
          summary: summary(remote.attempt.questionCount, mergedAnswers)
        },
        answers: mergedAnswers
      };

      payloadRef.current = merged;
      setPayload(merged);
      setRemainingSeconds(remote.attempt.remainingSeconds);
      setOffline(false);
      await persist(merged, local?.currentIndex ?? 0);

      const unsynced = mergedAnswers.filter((answer) => {
        const serverAnswer = remote.answers.find((item) => item.examQuestionId === answer.examQuestionId);
        return !serverAnswer || answer.clientRevision > serverAnswer.clientRevision;
      });
      if (unsynced.length && remote.attempt.status === "in_progress" && !remote.attempt.timeExpired) {
        void syncAnswers(unsynced);
      }
    } catch {
      if (!local) setFatalError(text.unavailable);
      else setOffline(true);
    } finally {
      setLoading(false);
      enteredAtRef.current = Date.now();
    }
  }, [attemptId, token, persist, syncAnswers, text.unavailable]);

  useEffect(() => { void hydrate(); }, [hydrate]);

  useEffect(() => {
    const expiresAt = payload?.attempt.expiresAt;
    if (!expiresAt) {
      setRemainingSeconds(null);
      return;
    }

    const update = () => {
      const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(seconds);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [payload?.attempt.expiresAt]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        void commitCurrentElapsed();
        const current = payloadRef.current;
        if (current) void persist(current);
      } else {
        enteredAtRef.current = Date.now();
      }
    });
    return () => subscription.remove();
  }, [commitCurrentElapsed, persist]);

  const answerMap = useMemo(
    () => new Map((payload?.answers ?? []).map((answer) => [answer.examQuestionId, answer])),
    [payload?.answers]
  );

  const currentQuestion = payload?.questions[currentIndex];
  const currentAnswer = currentQuestion ? answerMap.get(currentQuestion.id) : undefined;
  const locked = payload?.attempt.status !== "in_progress" || remainingSeconds === 0;

  async function moveTo(index: number) {
    await commitCurrentElapsed();
    setCurrentIndex(index);
    indexRef.current = index;
    enteredAtRef.current = Date.now();
    if (payloadRef.current) void persist(payloadRef.current, index);
  }

  async function submitAttempt() {
    if (!attemptId || !token || submitting) return;
    setSubmitting(true);
    await commitCurrentElapsed();

    const current = payloadRef.current;

    try {
      await apiRequest(`/attempts/${attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          submissionKey: `attempt:${attemptId}`,
          answers: current?.answers ?? []
        })
      }, token);
      await removePersistedExam(attemptId);
      setSubmitted(true);
      setOffline(false);
      router.replace(`/result/${attemptId}`);
    } catch {
      setOffline(true);
    } finally {
      setSubmitting(false);
    }
  }

  function confirmSubmit() {
    const info = payloadRef.current?.attempt.summary;
    if (!info) return;

    Alert.alert(
      text.submitTitle,
      `${text.answered}: ${info.answered}/${info.questionCount}\n${text.unanswered}: ${info.unanswered}\n${text.flaggedCount}: ${info.flagged}\n\n${text.submitBody}`,
      [
        { text: text.returnExam, style: "cancel" },
        { text: text.submitAnyway, style: "destructive", onPress: () => void submitAttempt() }
      ]
    );
  }

  useEffect(() => {
    if (remainingSeconds !== 0 || !payload || payload.attempt.status !== "in_progress" || submitting || submitted) return;
    void submitAttempt();
  }, [remainingSeconds, payload?.attempt.status]);

  if (loading && !payload) {
    return <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /><Text>{text.loading}</Text></View>;
  }

  if (fatalError && !payload) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{fatalError}</Text>
        <AppButton label={text.retry} onPress={() => void hydrate()} />
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={styles.center}>
        <Ionicons name="checkmark-circle-outline" size={54} color={theme.colors.success} />
        <Text style={styles.submitted}>{text.submitted}</Text>
        <AppButton label={text.backExams} onPress={() => router.replace("/(tabs)/exams")} />
      </View>
    );
  }

  if (!payload || !currentQuestion) return null;

  return (
    <View style={styles.page}>
      <View style={[styles.topbar, { flexDirection: rowDirection }]}>
        <View style={styles.titleBlock}>
          <Text style={[styles.examTitle, { textAlign: align, writingDirection: direction }]} numberOfLines={1}>{payload.attempt.title}</Text>
          <Text style={[styles.progressText, { textAlign: align, writingDirection: direction }]}>
            {text.question} {currentIndex + 1} {text.of} {payload.questions.length}
          </Text>
        </View>
        <View style={[styles.timer, remainingSeconds === 0 && styles.timerExpired]}>
          <Ionicons name="time-outline" size={18} color={remainingSeconds === 0 ? theme.colors.danger : theme.colors.text} />
          <Text style={[styles.timerText, remainingSeconds === 0 && { color: theme.colors.danger }]}>{formatTime(remainingSeconds)}</Text>
        </View>
      </View>

      {offline ? <Text style={styles.offline}>{text.offline}</Text> : <Text style={styles.synced}>{text.synced}</Text>}
      {remainingSeconds === 0 ? <Text style={styles.expired}>{text.expired}</Text> : null}

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.questionText, { textAlign: align, writingDirection: direction }]}>{currentQuestion.content}</Text>

        <View style={styles.choices}>
          {currentQuestion.choices.map((choice) => {
            const selected = currentAnswer?.selectedChoice === choice.key;
            return (
              <Pressable
                key={choice.key}
                disabled={locked}
                onPress={() => void applyAnswer(currentQuestion.id, { selectedChoice: choice.key as ChoiceKey }, true)}
                style={[styles.choice, selected && styles.choiceSelected, locked && styles.disabled]}
              >
                <Text style={[styles.choiceKey, selected && styles.choiceKeySelected]}>{choice.key}</Text>
                <Text style={[styles.choiceText, { textAlign: align, writingDirection: direction }]}>{choice.text}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          disabled={locked}
          onPress={() => void applyAnswer(currentQuestion.id, { flagged: !currentAnswer?.flagged }, true)}
          style={[styles.flagButton, currentAnswer?.flagged && styles.flagButtonActive, locked && styles.disabled]}
        >
          <Ionicons
            name={currentAnswer?.flagged ? "flag" : "flag-outline"}
            size={20}
            color={currentAnswer?.flagged ? theme.colors.warning : theme.colors.mutedText}
          />
          <Text style={styles.flagText}>{currentAnswer?.flagged ? text.flagged : text.flag}</Text>
        </Pressable>

        <View style={[styles.navigator, { flexDirection: rowDirection }]}>
          {payload.questions.map((question, index) => {
            const answer = answerMap.get(question.id);
            return (
              <Pressable
                key={question.id}
                onPress={() => void moveTo(index)}
                style={[
                  styles.navItem,
                  answer?.selectedChoice && styles.navAnswered,
                  answer?.flagged && styles.navFlagged,
                  index === currentIndex && styles.navCurrent
                ]}
              >
                <Text style={[styles.navText, index === currentIndex && styles.navTextCurrent]}>{index + 1}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { flexDirection: rowDirection }]}>
        <Pressable
          disabled={currentIndex === 0}
          onPress={() => void moveTo(Math.max(0, currentIndex - 1))}
          style={[styles.footerButton, currentIndex === 0 && styles.disabled]}
        >
          <Ionicons name={direction === "rtl" ? "chevron-forward" : "chevron-back"} size={20} color={theme.colors.text} />
          <Text style={styles.footerText}>{text.previous}</Text>
        </Pressable>

        {currentIndex < payload.questions.length - 1 ? (
          <Pressable onPress={() => void moveTo(currentIndex + 1)} style={[styles.footerButton, { flexDirection: rowDirection }]}>
            <Text style={styles.footerText}>{text.next}</Text>
            <Ionicons name={direction === "rtl" ? "chevron-back" : "chevron-forward"} size={20} color={theme.colors.text} />
          </Pressable>
        ) : (
          <Pressable onPress={confirmSubmit} style={[styles.submitButton, submitting && styles.disabled]}>
            <Text style={styles.submitText}>{text.submit}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 44 },
  center: { flex: 1, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center", gap: theme.spacing.md, padding: theme.spacing.lg },
  topbar: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
  titleBlock: { flex: 1 },
  examTitle: { color: theme.colors.text, fontWeight: "700", fontSize: theme.typography.body },
  progressText: { color: theme.colors.mutedText, fontSize: theme.typography.small, marginTop: 2 },
  timer: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, minHeight: 38, borderRadius: theme.radius.pill, backgroundColor: theme.colors.background },
  timerExpired: { backgroundColor: "#FEF3F2" },
  timerText: { color: theme.colors.text, fontWeight: "800", fontVariant: ["tabular-nums"] },
  offline: { backgroundColor: "#FFF4E5", color: theme.colors.warning, paddingVertical: 7, paddingHorizontal: theme.spacing.md, textAlign: "center", fontSize: theme.typography.small },
  synced: { color: theme.colors.success, paddingVertical: 5, textAlign: "center", fontSize: 12 },
  expired: { color: theme.colors.danger, fontWeight: "700", textAlign: "center", padding: theme.spacing.sm },
  content: { padding: theme.spacing.md, paddingBottom: 110, gap: theme.spacing.lg },
  questionText: { color: theme.colors.text, fontSize: 20, lineHeight: 32, fontWeight: "700" },
  choices: { gap: theme.spacing.sm },
  choice: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, padding: theme.spacing.md },
  choiceSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  choiceKey: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, textAlign: "center", textAlignVertical: "center", color: theme.colors.text, fontWeight: "700" },
  choiceKeySelected: { borderColor: theme.colors.primary, color: theme.colors.primary },
  choiceText: { flex: 1, color: theme.colors.text, lineHeight: 25 },
  flagButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
  flagButtonActive: { borderColor: theme.colors.warning, backgroundColor: "#FFF4E5" },
  flagText: { color: theme.colors.text, fontWeight: "600" },
  navigator: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: theme.spacing.sm },
  navItem: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  navAnswered: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  navFlagged: { borderColor: theme.colors.warning, borderWidth: 2 },
  navCurrent: { backgroundColor: theme.colors.primary },
  navText: { color: theme.colors.text, fontWeight: "600", fontSize: 12 },
  navTextCurrent: { color: "#FFFFFF" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, minHeight: 72, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.sm },
  footerButton: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md },
  footerText: { color: theme.colors.text, fontWeight: "700" },
  submitButton: { minHeight: 46, alignItems: "center", justifyContent: "center", paddingHorizontal: theme.spacing.lg, backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
  submitText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.45 },
  error: { color: theme.colors.danger, textAlign: "center" },
  submitted: { color: theme.colors.text, fontWeight: "800", fontSize: theme.typography.heading, textAlign: "center" }
});
