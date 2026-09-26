import Ionicons from "@expo/vector-icons/Ionicons";
import { theme } from "@kankor/config";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/screen";
import { apiRequest, ApiError } from "../lib/api";
import { useAuth } from "../providers/auth-provider";
import { useLocale } from "../providers/locale-provider";

type HistoricalFilterOptions = {
  years: number[];
  provinces: string[];
  rounds: string[];
};

type HistoricalForm = {
  id: string;
  archiveCode: string;
  year: number;
  cycle: string | null;
  province: string | null;
  round: string | null;
  formCode: string | null;
  language: string;
  title: string;
  accessTier: "free" | "premium";
  locked: boolean;
  sourceStatus: "official" | "verified_secondary" | "unverified";
  originalOrderStatus: "confirmed" | "uncertain";
  questionCount: number;
  durationSeconds: number | null;
};

const copy = {
  fa: {
    title: "فورم‌های تاریخی کانکور",
    body: "فورم‌های گذشته را با ترتیب اصلی سوالات انجام دهید.",
    year: "سال",
    province: "ولایت",
    round: "دور",
    language: "زبان",
    all: "همه",
    questions: "سوال",
    noTimer: "زمان نامشخص",
    minutes: "دقیقه",
    official: "منبع رسمی",
    verified_secondary: "منبع ثانوی تاییدشده",
    unverified: "منبع تاییدنشده",
    confirmed: "ترتیب اصلی تاییدشده",
    uncertain: "ترتیب اصلی نامطمئن",
    start: "شروع فورم اصلی",
    starting: "در حال شروع...",
    empty: "هنوز فورم تاریخی منتشرشده‌ای وجود ندارد.",
    error: "فورم‌های تاریخی بارگیری نشد.",
    startError: "فورم تاریخی شروع نشد.",
    incomplete: "این فورم هنوز کامل نیست."
  },
  ps: {
    title: "تاریخي کانکور فورمې",
    body: "پخوانۍ فورمې د پوښتنو په اصلي ترتیب ترسره کړئ.",
    year: "کال",
    province: "ولایت",
    round: "پړاو",
    language: "ژبه",
    all: "ټول",
    questions: "پوښتنې",
    noTimer: "وخت نامعلوم",
    minutes: "دقیقې",
    official: "رسمي سرچینه",
    verified_secondary: "تایید شوې ثانوي سرچینه",
    unverified: "نا تایید شوې سرچینه",
    confirmed: "اصلي ترتیب تایید شوی",
    uncertain: "اصلي ترتیب نامعلوم",
    start: "اصلي فورمه پیل کړئ",
    starting: "پیل کېږي...",
    empty: "تر اوسه خپره شوې تاریخي فورمه نشته.",
    error: "تاریخي فورمې پورته نه شوې.",
    startError: "تاریخي فورمه پیل نه شوه.",
    incomplete: "دا فورمه لا بشپړه نه ده."
  },
  en: {
    title: "Historical Kankor forms",
    body: "Take past forms in their preserved original question order.",
    year: "Year",
    province: "Province",
    round: "Round",
    language: "Language",
    all: "All",
    questions: "questions",
    noTimer: "Unknown duration",
    minutes: "min",
    official: "Official source",
    verified_secondary: "Verified secondary source",
    unverified: "Unverified source",
    confirmed: "Original order confirmed",
    uncertain: "Original order uncertain",
    start: "Start authentic form",
    starting: "Starting...",
    empty: "No published historical forms are available yet.",
    error: "Historical forms could not be loaded.",
    startError: "The historical form could not be started.",
    incomplete: "This historical form is incomplete."
  }
} as const;

export default function HistoricalFormsScreen() {
  const { token } = useAuth();
  const { locale, direction } = useLocale();
  const text = copy[locale];
  const align = direction === "rtl" ? "right" : "left";
  const rowDirection = "row";

  const [forms, setForms] = useState<HistoricalForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [year, setYear] = useState("");
  const [province, setProvince] = useState("");
  const [round, setRound] = useState("");
  const [language, setLanguage] = useState("");
  const [filterOptions, setFilterOptions] = useState<HistoricalFilterOptions>({
    years: [],
    provinces: [],
    rounds: []
  });
  const [openFilter, setOpenFilter] = useState<"year" | "province" | "round" | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (year.trim()) params.set("year", year.trim());
    if (province.trim()) params.set("province", province.trim());
    if (round.trim()) params.set("round", round.trim());
    if (language) params.set("language", language);

    try {
      const query = params.toString();
      const result = await apiRequest<{
        items: HistoricalForm[];
        filterOptions: HistoricalFilterOptions;
      }>(
        `/exams/history${query ? `?${query}` : ""}`,
        {},
        token
      );
      setForms(result.items);
      setFilterOptions(result.filterOptions);
    } catch {
      setError(text.error);
    } finally {
      setLoading(false);
    }
  }, [token, year, province, round, language, text.error]);

  useEffect(() => { void load(); }, [load]);

  function SelectFilter({
    filterKey,
    label,
    value,
    options,
    onSelect
  }: {
    filterKey: "year" | "province" | "round";
    label: string;
    value: string;
    options: string[];
    onSelect: (value: string) => void;
  }) {
    return (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ expanded: openFilter === filterKey }}
          onPress={() => setOpenFilter(filterKey)}
          style={styles.select}
        >
          <View style={styles.selectCopy}>
            <Text style={[styles.selectLabel, { textAlign: align, writingDirection: direction }]}>{label}</Text>
            <Text
              numberOfLines={1}
              style={[styles.selectValue, { textAlign: align, writingDirection: direction }]}
            >
              {value || text.all}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={theme.colors.mutedText} />
        </Pressable>

        <Modal
          transparent
          animationType="fade"
          visible={openFilter === filterKey}
          onRequestClose={() => setOpenFilter(null)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setOpenFilter(null)}>
            <Pressable style={styles.selectModal} onPress={() => undefined}>
              <Text style={[styles.selectModalTitle, { textAlign: align, writingDirection: direction }]}>{label}</Text>
              <ScrollView style={styles.selectOptions} contentContainerStyle={styles.selectOptionsContent}>
                {["", ...options].map((option) => {
                  const selected = value === option;
                  return (
                    <Pressable
                      key={option || "all"}
                      onPress={() => {
                        onSelect(option);
                        setOpenFilter(null);
                      }}
                      style={[styles.selectOption, selected && styles.selectOptionActive]}
                    >
                      <Text
                        style={[
                          styles.selectOptionText,
                          selected && styles.selectOptionTextActive,
                          { textAlign: align, writingDirection: direction }
                        ]}
                      >
                        {option || text.all}
                      </Text>
                      {selected ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </>
    );
  }

  async function startForm(id: string) {
    const selected = forms.find((item) => item.id === id);
    if (selected?.locked) {
      router.push("/premium");
      return;
    }
    if (!token || startingId) return;
    setStartingId(id);
    setError("");
    try {
      const response = await apiRequest<{ attempt: { id: string } }>(
        `/exams/history/${id}/start`,
        { method: "POST", body: JSON.stringify({}) },
        token
      );
      router.push(`/exam/${response.attempt.id}`);
    } catch (cause) {
      const code = cause instanceof ApiError ? cause.code : "";
      if (code === "premium_required") router.push("/premium");
      else setError(code === "historical_form_incomplete" ? text.incomplete : text.startError);
    } finally {
      setStartingId(null);
    }
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={[styles.header, { flexDirection: rowDirection }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name={direction === "rtl" ? "arrow-forward" : "arrow-back"} size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { textAlign: align, writingDirection: direction }]}>{text.title}</Text>
          <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.body}</Text>
        </View>
      </View>

      <View style={styles.filterCard}>
        <View style={[styles.filterRow, { flexDirection: rowDirection }]}>
          <SelectFilter
            filterKey="year"
            label={text.year}
            value={year}
            options={filterOptions.years.map(String)}
            onSelect={setYear}
          />
          <SelectFilter
            filterKey="province"
            label={text.province}
            value={province}
            options={filterOptions.provinces}
            onSelect={setProvince}
          />
        </View>
        <View style={[styles.filterRow, { flexDirection: rowDirection }]}>
          <SelectFilter
            filterKey="round"
            label={text.round}
            value={round}
            options={filterOptions.rounds}
            onSelect={setRound}
          />
          <View style={[styles.languageRow, { flexDirection: rowDirection }]}>
            {["", "fa", "ps"].map((item) => (
              <Pressable
                key={item || "all"}
                onPress={() => setLanguage(item)}
                style={[styles.languageChip, language === item && styles.languageChipActive]}
              >
                <Text style={language === item ? styles.languageTextActive : styles.languageText}>
                  {item === "" ? text.all : item === "fa" ? "دری" : "پښتو"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <Text style={[styles.error, { textAlign: align, writingDirection: direction }]}>{error}</Text> : null}

      {!loading && !forms.length ? (
        <View style={styles.emptyCard}>
          <Ionicons name="archive-outline" size={34} color={theme.colors.mutedText} />
          <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.empty}</Text>
        </View>
      ) : null}

      {forms.map((form) => (
        <View style={styles.card} key={form.id}>
          <View style={[styles.cardTop, { flexDirection: rowDirection }]}>
            <View style={styles.cardTitleWrap}>
              <Text style={[styles.cardTitle, { textAlign: align, writingDirection: direction }]}>{form.title}</Text>
              <Text style={[styles.meta, { textAlign: align, writingDirection: direction }]}>
                {form.year}
                {form.province ? ` · ${form.province}` : ""}
                {form.round ? ` · ${form.round}` : ""}
                {form.formCode ? ` · ${form.formCode}` : ""}
              </Text>
            </View>
            <Text style={styles.archiveCode}>{form.archiveCode}</Text>
          </View>

          <View style={[styles.badges, { flexDirection: rowDirection }]}>
            <Text style={styles.badge}>{text[form.sourceStatus]}</Text>
            <Text style={styles.badge}>{text[form.originalOrderStatus]}</Text>
            {form.accessTier === "premium" ? <Text style={styles.premiumBadge}>Premium</Text> : null}
          </View>

          <View style={[styles.stats, { flexDirection: rowDirection }]}>
            <Text style={styles.stat}>{form.questionCount} {text.questions}</Text>
            <Text style={styles.stat}>
              {form.durationSeconds ? `${Math.round(form.durationSeconds / 60)} ${text.minutes}` : text.noTimer}
            </Text>
          </View>

          <Pressable
            disabled={Boolean(startingId)}
            onPress={() => void startForm(form.id)}
            style={[styles.startButton, startingId === form.id && styles.disabled]}
          >
            {startingId === form.id
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.startText}>{text.start}</Text>}
          </Pressable>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 80, gap: theme.spacing.md },
  header: { flexDirection: "row", gap: theme.spacing.sm, alignItems: "flex-start" },
  back: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, gap: 6 },
  title: { color: theme.colors.text, fontSize: theme.typography.title, fontWeight: "800" },
  body: { color: theme.colors.mutedText, lineHeight: 24 },
  filterCard: { gap: 10, padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg },
  filterRow: { flexDirection: "row", gap: 10 },
  select: { flex: 1, minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: theme.colors.background },
  selectCopy: { flex: 1, minWidth: 0, gap: 2 },
  selectLabel: { color: theme.colors.mutedText, fontSize: 11, fontWeight: "700" },
  selectValue: { color: theme.colors.text, fontWeight: "700" },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: theme.spacing.lg, backgroundColor: "rgba(0,0,0,0.35)" },
  selectModal: { maxHeight: "70%", gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  selectModalTitle: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: "800" },
  selectOptions: { maxHeight: 420 },
  selectOptionsContent: { gap: 6 },
  selectOption: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 12, borderRadius: theme.radius.md },
  selectOptionActive: { backgroundColor: theme.colors.primarySoft },
  selectOptionText: { flex: 1, color: theme.colors.text, fontWeight: "600" },
  selectOptionTextActive: { color: theme.colors.primary, fontWeight: "800" },
  languageRow: { flex: 1, flexDirection: "row", gap: 6 },
  languageChip: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md },
  languageChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  languageText: { color: theme.colors.text, fontWeight: "600" },
  languageTextActive: { color: theme.colors.primary, fontWeight: "800" },
  emptyCard: { alignItems: "center", gap: 10, padding: theme.spacing.xl, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  card: { gap: theme.spacing.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface },
  cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  cardTitleWrap: { flex: 1, gap: 5 },
  cardTitle: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: "800" },
  meta: { color: theme.colors.mutedText },
  archiveCode: { color: theme.colors.primary, fontSize: theme.typography.small, fontWeight: "700" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  badge: { color: theme.colors.mutedText, backgroundColor: theme.colors.background, borderRadius: theme.radius.pill, paddingHorizontal: 9, paddingVertical: 5, fontSize: 12, fontWeight: "700" },
  premiumBadge: { color: theme.colors.primary, backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.pill, paddingHorizontal: 9, paddingVertical: 5, fontSize: 12, fontWeight: "800" },
  stats: { flexDirection: "row", gap: theme.spacing.lg },
  stat: { color: theme.colors.text, fontWeight: "700" },
  startButton: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
  startText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  error: { color: theme.colors.danger }
});
