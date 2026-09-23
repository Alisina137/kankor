import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ApiError, apiRequest } from "../../lib/api";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

type Choice = { key: "A" | "B" | "C" | "D"; text: string };
type ReviewItem = {
  examQuestionId: string;
  order: number;
  content: string;
  choices: Choice[];
  correctChoice: string;
  selectedChoice: string | null;
  flagged: boolean;
  timeSpentSeconds: number;
  correct: boolean | null;
  awardedScore: number;
  explanation: {
    shortExplanation: string | null;
    detailedExplanation: string | null;
    workedSolution: string | null;
  };
  curriculum: {
    subject?: { nameFa?: string; namePs?: string; code?: string };
    grade?: { number?: number };
    book?: { titleFa?: string; titlePs?: string };
    chapter?: { number?: number; titleFa?: string; titlePs?: string };
    topic?: { id?: string; titleFa?: string; titlePs?: string };
    difficulty?: string;
  };
};

type FilterKey = "all" | "incorrect" | "correct" | "unanswered" | "flagged";

const copy = {
  fa: {
    title: "مرور سوالات",
    all: "همه",
    incorrect: "غلط",
    correct: "صحیح",
    unanswered: "بی‌پاسخ",
    flagged: "علامت‌دار",
    yourAnswer: "پاسخ شما",
    correctAnswer: "پاسخ صحیح",
    explanation: "توضیح",
    detailed: "توضیح کامل",
    solution: "راه‌حل",
    curriculum: "موقعیت در نصاب",
    question: "سوال",
    noItems: "سوالی برای این فیلتر وجود ندارد.",
    loading: "مرور در حال بارگیری است...",
    error: "مرور سوالات بارگیری نشد.",
    back: "بازگشت به نتیجه",
    notAnswered: "پاسخ داده نشده",
    flaggedLabel: "علامت‌گذاری شده",
    correctLabel: "صحیح",
    incorrectLabel: "غلط",
    practiceTopic: "تمرین این موضوع"
  },
  ps: {
    title: "د پوښتنو بیاکتنه",
    all: "ټول",
    incorrect: "ناسم",
    correct: "سم",
    unanswered: "بې ځوابه",
    flagged: "نښه شوي",
    yourAnswer: "ستاسو ځواب",
    correctAnswer: "سم ځواب",
    explanation: "تشریح",
    detailed: "بشپړه تشریح",
    solution: "حل",
    curriculum: "په نصاب کې ځای",
    question: "پوښتنه",
    noItems: "د دې فلټر لپاره پوښتنه نشته.",
    loading: "بیاکتنه پورته کېږي...",
    error: "د پوښتنو بیاکتنه پورته نه شوه.",
    back: "پایلې ته بېرته",
    notAnswered: "ځواب نه دی ورکړل شوی",
    flaggedLabel: "نښه شوې",
    correctLabel: "سم",
    incorrectLabel: "ناسم",
    practiceTopic: "دا موضوع تمرین کړئ"
  },
  en: {
    title: "Question review",
    all: "All",
    incorrect: "Incorrect",
    correct: "Correct",
    unanswered: "Unanswered",
    flagged: "Flagged",
    yourAnswer: "Your answer",
    correctAnswer: "Correct answer",
    explanation: "Explanation",
    detailed: "Detailed explanation",
    solution: "Worked solution",
    curriculum: "Curriculum location",
    question: "Question",
    noItems: "No questions match this filter.",
    loading: "Loading review...",
    error: "The question review could not be loaded.",
    back: "Back to result",
    notAnswered: "Not answered",
    flaggedLabel: "Flagged",
    correctLabel: "Correct",
    incorrectLabel: "Incorrect",
    practiceTopic: "Practice this topic"
  }
} as const;

const filterKeys: FilterKey[] = ["all", "incorrect", "correct", "unanswered", "flagged"];

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ attemptId: string }>();
  const attemptId = Array.isArray(params.attemptId) ? params.attemptId[0] : params.attemptId;
  const { token } = useAuth();
  const { locale, direction } = useLocale();
  const text = copy[locale];
  const align = direction === "rtl" ? "right" : "left";
  const rowDirection = direction === "rtl" ? "row-reverse" : "row";

  const [filter, setFilter] = useState<FilterKey>("all");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingTopic, setStartingTopic] = useState("");

  const load = useCallback(async (nextFilter: FilterKey) => {
    if (!attemptId || !token) return;
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<{ items: ReviewItem[] }>(
        `/attempts/${attemptId}/review?filter=${nextFilter}`,
        {},
        token
      );
      setItems(result.items);
    } catch {
      setError(text.error);
    } finally {
      setLoading(false);
    }
  }, [attemptId, token, text.error]);

  useEffect(() => { void load(filter); }, [filter, load]);

  async function practiceTopic(topicId?: string) {
    if (!topicId || !token || startingTopic) return;
    setStartingTopic(topicId);
    try {
      const response = await apiRequest<{ attempt: { id: string } }>(
        `/progress/topics/${topicId}/practice`,
        { method: "POST", body: JSON.stringify({}) },
        token
      );
      router.push(`/exam/${response.attempt.id}`);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "premium_required") router.push("/premium");
      else setError(text.error);
    } finally {
      setStartingTopic("");
    }
  }

  function localized(fa?: string, ps?: string) {
    return locale === "ps" ? (ps || fa || "") : (fa || ps || "");
  }

  function curriculumLabel(item: ReviewItem) {
    const c = item.curriculum ?? {};
    return [
      localized(c.subject?.nameFa, c.subject?.namePs) || c.subject?.code,
      c.grade?.number ? String(c.grade.number) : "",
      localized(c.book?.titleFa, c.book?.titlePs),
      localized(c.chapter?.titleFa, c.chapter?.titlePs),
      localized(c.topic?.titleFa, c.topic?.titlePs)
    ].filter(Boolean).join(" • ");
  }

  return (
    <View style={styles.page}>
      <View style={[styles.header, { flexDirection: rowDirection }]}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={direction === "rtl" ? "arrow-forward" : "arrow-back"} size={22} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.title, { textAlign: align, writingDirection: direction }]}>{text.title}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filters, { flexDirection: rowDirection }]}>
        {filterKeys.map((key) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={[styles.filter, filter === key && styles.filterActive]}
          >
            <Text style={filter === key ? styles.filterTextActive : styles.filterText}>{text[key]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? <View style={styles.loading}><ActivityIndicator color={theme.colors.primary} /><Text>{text.loading}</Text></View> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.content}>
        {!loading && !items.length ? <Text style={[styles.empty, { textAlign: align, writingDirection: direction }]}>{text.noItems}</Text> : null}

        {items.map((item) => {
          const statusText = item.correct === true
            ? text.correctLabel
            : item.correct === false
              ? text.incorrectLabel
              : text.notAnswered;

          return (
            <View style={styles.card} key={item.examQuestionId}>
              <View style={[styles.cardTop, { flexDirection: rowDirection }]}>
                <Text style={styles.questionNumber}>{text.question} {item.order}</Text>
                <View style={[styles.statusRow, { flexDirection: rowDirection }]}>
                  <Text style={[
                    styles.status,
                    item.correct === true ? styles.statusCorrect : item.correct === false ? styles.statusIncorrect : styles.statusNeutral
                  ]}>{statusText}</Text>
                  {item.flagged ? <Text style={styles.flagged}>{text.flaggedLabel}</Text> : null}
                </View>
              </View>

              <Text style={[styles.question, { textAlign: align, writingDirection: direction }]}>{item.content}</Text>

              <View style={styles.choices}>
                {item.choices.map((choice) => {
                  const isCorrect = choice.key === item.correctChoice;
                  const isSelected = choice.key === item.selectedChoice;
                  return (
                    <View
                      key={choice.key}
                      style={[
                        styles.choice,
                        isCorrect && styles.choiceCorrect,
                        isSelected && !isCorrect && styles.choiceIncorrect
                      ]}
                    >
                      <Text style={styles.choiceKey}>{choice.key}</Text>
                      <Text style={[styles.choiceText, { textAlign: align, writingDirection: direction }]}>{choice.text}</Text>
                      <View style={styles.choiceBadges}>
                        {isSelected ? <Text style={styles.yourBadge}>{text.yourAnswer}</Text> : null}
                        {isCorrect ? <Text style={styles.correctBadge}>{text.correctAnswer}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </View>

              {item.selectedChoice == null ? (
                <Text style={[styles.unanswered, { textAlign: align, writingDirection: direction }]}>{text.notAnswered}</Text>
              ) : null}

              {item.explanation?.shortExplanation ? (
                <View style={styles.explanation}>
                  <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.explanation}</Text>
                  <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{item.explanation.shortExplanation}</Text>
                </View>
              ) : null}

              {item.explanation?.detailedExplanation ? (
                <View style={styles.explanation}>
                  <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.detailed}</Text>
                  <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{item.explanation.detailedExplanation}</Text>
                </View>
              ) : null}

              {item.explanation?.workedSolution ? (
                <View style={styles.solution}>
                  <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.solution}</Text>
                  <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{item.explanation.workedSolution}</Text>
                </View>
              ) : null}

              <View style={styles.curriculum}>
                <Text style={[styles.sectionTitle, { textAlign: align, writingDirection: direction }]}>{text.curriculum}</Text>
                <Text style={[styles.small, { textAlign: align, writingDirection: direction }]}>{curriculumLabel(item)}</Text>
                {item.curriculum?.topic?.id ? (
                  <Pressable style={styles.practiceButton} disabled={Boolean(startingTopic)} onPress={() => void practiceTopic(item.curriculum.topic?.id)}>
                    {startingTopic === item.curriculum.topic.id
                      ? <ActivityIndicator color="#FFFFFF" size="small" />
                      : <Text style={styles.practiceButtonText}>{text.practiceTopic}</Text>}
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}

        <Pressable style={styles.backResult} onPress={() => router.replace(`/result/${attemptId}`)}>
          <Text style={styles.backResultText}>{text.back}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background, paddingTop: 44 },
  header: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: "800" },
  filters: { gap: 8, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  filter: { minHeight: 40, justifyContent: "center", paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  filterActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterText: { color: theme.colors.text, fontWeight: "600" },
  filterTextActive: { color: "#FFFFFF", fontWeight: "700" },
  loading: { alignItems: "center", gap: 8, padding: theme.spacing.md },
  content: { padding: theme.spacing.md, paddingBottom: 48, gap: theme.spacing.md },
  card: { padding: theme.spacing.md, gap: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.sm },
  questionNumber: { color: theme.colors.mutedText, fontWeight: "700" },
  statusRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  status: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: theme.radius.pill, fontSize: 12, fontWeight: "800" },
  statusCorrect: { color: theme.colors.success, backgroundColor: "#ECFDF3" },
  statusIncorrect: { color: theme.colors.danger, backgroundColor: "#FEF3F2" },
  statusNeutral: { color: theme.colors.mutedText, backgroundColor: theme.colors.background },
  flagged: { color: theme.colors.warning, backgroundColor: "#FFF4E5", paddingHorizontal: 9, paddingVertical: 4, borderRadius: theme.radius.pill, fontSize: 12, fontWeight: "700" },
  question: { color: theme.colors.text, fontSize: 19, lineHeight: 30, fontWeight: "700" },
  choices: { gap: 8 },
  choice: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md },
  choiceCorrect: { borderColor: theme.colors.success, backgroundColor: "#ECFDF3" },
  choiceIncorrect: { borderColor: theme.colors.danger, backgroundColor: "#FEF3F2" },
  choiceKey: { width: 28, color: theme.colors.text, fontWeight: "800" },
  choiceText: { flex: 1, color: theme.colors.text, lineHeight: 23 },
  choiceBadges: { gap: 3, alignItems: "flex-end" },
  yourBadge: { color: theme.colors.primary, fontSize: 10, fontWeight: "700" },
  correctBadge: { color: theme.colors.success, fontSize: 10, fontWeight: "700" },
  unanswered: { color: theme.colors.warning, fontWeight: "700" },
  explanation: { gap: 6, padding: theme.spacing.sm, borderRadius: theme.radius.md, backgroundColor: theme.colors.background },
  solution: { gap: 6, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft },
  curriculum: { gap: 5, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  sectionTitle: { color: theme.colors.text, fontWeight: "800" },
  body: { color: theme.colors.text, lineHeight: 25 },
  small: { color: theme.colors.mutedText, lineHeight: 22 },
  empty: { color: theme.colors.mutedText, padding: theme.spacing.lg },
  error: { color: theme.colors.danger, textAlign: "center", padding: theme.spacing.md },
  backResult: { minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
  backResultText: { color: theme.colors.text, fontWeight: "700" },
  practiceButton: { minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.md, backgroundColor: theme.colors.primary },
  practiceButtonText: { color: "#FFFFFF", fontWeight: "800" }
});
