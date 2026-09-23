import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/screen";
import { ApiError, apiRequest } from "../lib/api";
import { useAuth } from "../providers/auth-provider";
import { useLocale } from "../providers/locale-provider";

type Mistake = {
  id: string;
  questionId: string;
  question: string;
  language: string;
  topicId: string;
  topicFa: string;
  topicPs: string | null;
  subjectFa: string;
  subjectPs: string | null;
  firstMissedAt: string;
  lastAttemptedAt: string;
  timesMissed: number;
  eventuallyMastered: boolean;
  masteredAt: string | null;
};

const copy = {
  fa: {
    title: "دفترچه اشتباهات",
    active: "فعال",
    mastered: "یادگرفته‌شده",
    missed: "بار اشتباه",
    practice: "تمرین این موضوع",
    empty: "هنوز اشتباه فعالی ندارید.",
    error: "اشتباهات بارگیری نشد."
  },
  ps: {
    title: "د تېروتنو کتابچه",
    active: "فعال",
    mastered: "زده شوی",
    missed: "ځله تېروتنه",
    practice: "دا موضوع تمرین کړئ",
    empty: "تر اوسه فعاله تېروتنه نشته.",
    error: "تېروتنې پورته نه شوې."
  },
  en: {
    title: "Mistake notebook",
    active: "Active",
    mastered: "Mastered",
    missed: "times missed",
    practice: "Practice this topic",
    empty: "You have no recorded mistakes yet.",
    error: "Mistakes could not be loaded."
  }
} as const;

export default function MistakesScreen() {
  const { token } = useAuth();
  const { locale, direction } = useLocale();
  const text = copy[locale];
  const align = direction === "rtl" ? "right" : "left";
  const rowDirection = direction === "rtl" ? "row-reverse" : "row";
  const [items, setItems] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<{ items: Mistake[] }>("/mistakes", {}, token);
      setItems(result.items);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "premium_required") router.replace("/premium");
      else setError(text.error);
    } finally {
      setLoading(false);
    }
  }, [token, text.error]);

  useEffect(() => { void load(); }, [load]);

  function localize(fa: string, ps: string | null) {
    return locale === "ps" ? (ps || fa) : fa;
  }

  async function practice(item: Mistake) {
    if (!token || starting) return;
    setStarting(item.questionId);
    try {
      const result = await apiRequest<{ attempt: { id: string } }>(
        `/mistakes/${item.questionId}/practice`,
        { method: "POST", body: JSON.stringify({}) },
        token
      );
      router.push(`/exam/${result.attempt.id}`);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "premium_required") router.push("/premium");
      else setError(text.error);
    } finally {
      setStarting("");
    }
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={[styles.header, { flexDirection: rowDirection }]}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name={direction === "rtl" ? "arrow-forward" : "arrow-back"} size={22} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.title, { textAlign: align }]}>{text.title}</Text>
      </View>

      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <Text style={[styles.error, { textAlign: align }]}>{error}</Text> : null}
      {!loading && !items.length ? <Text style={[styles.empty, { textAlign: align }]}>{text.empty}</Text> : null}

      {items.map((item) => (
        <View style={styles.card} key={item.id}>
          <View style={[styles.top, { flexDirection: rowDirection }]}>
            <Text style={[
              styles.status,
              item.eventuallyMastered ? styles.mastered : styles.active
            ]}>
              {item.eventuallyMastered ? text.mastered : text.active}
            </Text>
            <Text style={styles.count}>{item.timesMissed} {text.missed}</Text>
          </View>

          <Text style={[styles.question, { textAlign: align }]}>{item.question}</Text>
          <Text style={[styles.meta, { textAlign: align }]}>
            {localize(item.subjectFa, item.subjectPs)} · {localize(item.topicFa, item.topicPs)}
          </Text>

          <Pressable
            disabled={Boolean(starting)}
            style={[styles.button, item.eventuallyMastered && styles.secondaryButton]}
            onPress={() => void practice(item)}
          >
            {starting === item.questionId
              ? <ActivityIndicator color={item.eventuallyMastered ? theme.colors.primary : "#FFFFFF"} />
              : <Text style={item.eventuallyMastered ? styles.secondaryText : styles.buttonText}>{text.practice}</Text>}
          </Pressable>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 80, gap: theme.spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  back: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, color: theme.colors.text, fontSize: theme.typography.title, fontWeight: "800" },
  card: { gap: theme.spacing.sm, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  status: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: theme.radius.pill, fontSize: 12, fontWeight: "800" },
  active: { color: theme.colors.danger, backgroundColor: "#FEF3F2" },
  mastered: { color: theme.colors.success, backgroundColor: "#ECFDF3" },
  count: { color: theme.colors.mutedText, fontSize: theme.typography.small, fontWeight: "700" },
  question: { color: theme.colors.text, fontWeight: "700", lineHeight: 25 },
  meta: { color: theme.colors.mutedText, lineHeight: 22 },
  button: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.md, backgroundColor: theme.colors.primary },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.primary },
  secondaryText: { color: theme.colors.primary, fontWeight: "800" },
  error: { color: theme.colors.danger },
  empty: { color: theme.colors.mutedText, padding: theme.spacing.lg }
});
