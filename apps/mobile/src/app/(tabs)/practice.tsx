import { theme } from "@kankor/config";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../components/screen";
import { apiRequest } from "../../lib/api";
import { useLocale } from "../../providers/locale-provider";

type Grade = { id: string; number: number; nameFa: string; namePs: string | null };
type Subject = { id: string; code: string; nameFa: string; namePs: string | null };
type Book = { id: string; subjectId: string; gradeId: string; titleFa: string; titlePs: string | null };
type Chapter = { id: string; bookId: string; number: number; titleFa: string; titlePs: string | null };
type Topic = { id: string; chapterId: string; titleFa: string; titlePs: string | null };

const copy = {
  fa: {
    title: "تمرین بر اساس نصاب",
    body: "موضوع درسی خود را مرحله‌به‌مرحله انتخاب کنید.",
    grade: "صنف",
    subject: "مضمون",
    book: "کتاب",
    chapter: "فصل",
    topic: "موضوع",
    empty: "هنوز محتوایی برای این بخش اضافه نشده است.",
    error: "محتوای درسی بارگیری نشد. دوباره تلاش کنید.",
    selected: "مسیر انتخاب‌شده"
  },
  ps: {
    title: "د نصاب له مخې تمرین",
    body: "خپل درسي مسیر ګام په ګام وټاکئ.",
    grade: "ټولګی",
    subject: "مضمون",
    book: "کتاب",
    chapter: "څپرکی",
    topic: "موضوع",
    empty: "تر اوسه دې برخې ته محتوا نه ده اضافه شوې.",
    error: "درسي محتوا پورته نه شوه. بیا هڅه وکړئ.",
    selected: "ټاکل شوې لاره"
  },
  en: {
    title: "Practice by curriculum",
    body: "Choose your curriculum path step by step.",
    grade: "Grade",
    subject: "Subject",
    book: "Book",
    chapter: "Chapter",
    topic: "Topic",
    empty: "No content has been added here yet.",
    error: "Curriculum could not be loaded. Try again.",
    selected: "Selected path"
  }
} as const;

export default function PracticeScreen() {
  const { locale, direction } = useLocale();
  const text = copy[locale];
  const align = direction === "rtl" ? "right" : "left";

  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      apiRequest<{ items: Grade[] }>("/grades"),
      apiRequest<{ items: Subject[] }>("/subjects")
    ]).then(([gradeResult, subjectResult]) => {
      setGrades(gradeResult.items);
      setSubjects(subjectResult.items);
    }).catch(() => setError(text.error)).finally(() => setLoading(false));
  }, [text.error]);

  useEffect(() => {
    setBookId(null); setChapterId(null); setTopicId(null); setChapters([]); setTopics([]);
    if (!gradeId || !subjectId) { setBooks([]); return; }
    void apiRequest<{ items: Book[] }>(`/books?gradeId=${encodeURIComponent(gradeId)}&subjectId=${encodeURIComponent(subjectId)}`)
      .then((result) => setBooks(result.items))
      .catch(() => setError(text.error));
  }, [gradeId, subjectId, text.error]);

  useEffect(() => {
    setChapterId(null); setTopicId(null); setTopics([]);
    if (!bookId) { setChapters([]); return; }
    void apiRequest<{ items: Chapter[] }>(`/chapters?bookId=${encodeURIComponent(bookId)}`)
      .then((result) => setChapters(result.items))
      .catch(() => setError(text.error));
  }, [bookId, text.error]);

  useEffect(() => {
    setTopicId(null);
    if (!chapterId) { setTopics([]); return; }
    void apiRequest<{ items: Topic[] }>(`/topics?chapterId=${encodeURIComponent(chapterId)}`)
      .then((result) => setTopics(result.items))
      .catch(() => setError(text.error));
  }, [chapterId, text.error]);

  const displayName = (fa: string, ps: string | null) => locale === "ps" ? (ps || fa) : fa;
  const selectedPath = useMemo(() => {
    const parts = [
      subjects.find((item) => item.id === subjectId) && displayName(subjects.find((item) => item.id === subjectId)!.nameFa, subjects.find((item) => item.id === subjectId)!.namePs),
      grades.find((item) => item.id === gradeId)?.number,
      books.find((item) => item.id === bookId) && displayName(books.find((item) => item.id === bookId)!.titleFa, books.find((item) => item.id === bookId)!.titlePs),
      chapters.find((item) => item.id === chapterId) && displayName(chapters.find((item) => item.id === chapterId)!.titleFa, chapters.find((item) => item.id === chapterId)!.titlePs),
      topics.find((item) => item.id === topicId) && displayName(topics.find((item) => item.id === topicId)!.titleFa, topics.find((item) => item.id === topicId)!.titlePs)
    ].filter(Boolean);
    return parts.join(" • ");
  }, [subjects, grades, books, chapters, topics, subjectId, gradeId, bookId, chapterId, topicId, locale]);

  function ChoiceGroup<T extends { id: string }>({
    label,
    items,
    selected,
    onSelect,
    getLabel
  }: {
    label: string;
    items: T[];
    selected: string | null;
    onSelect: (id: string) => void;
    getLabel: (item: T) => string;
  }) {
    return (
      <View style={styles.section}>
        <Text style={[styles.label, { textAlign: align }]}>{label}</Text>
        {items.length ? (
          <View style={styles.chips}>
            {items.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: selected === item.id }}
                onPress={() => onSelect(item.id)}
                style={[styles.chip, selected === item.id && styles.chipActive]}
              >
                <Text style={selected === item.id ? styles.chipTextActive : styles.chipText}>{getLabel(item)}</Text>
              </Pressable>
            ))}
          </View>
        ) : <Text style={[styles.empty, { textAlign: align }]}>{text.empty}</Text>}
      </View>
    );
  }

  return (
    <Screen>
      <View style={styles.stack}>
        <View style={styles.header}>
          <Text style={[styles.title, { textAlign: align }]}>{text.title}</Text>
          <Text style={[styles.body, { textAlign: align }]}>{text.body}</Text>
        </View>

        {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
        {error ? <Text style={[styles.error, { textAlign: align }]}>{error}</Text> : null}

        {!loading ? (
          <>
            <ChoiceGroup label={text.grade} items={grades} selected={gradeId} onSelect={setGradeId} getLabel={(item) => String(item.number)} />
            <ChoiceGroup label={text.subject} items={subjects} selected={subjectId} onSelect={setSubjectId} getLabel={(item) => displayName(item.nameFa, item.namePs)} />
            {gradeId && subjectId ? <ChoiceGroup label={text.book} items={books} selected={bookId} onSelect={setBookId} getLabel={(item) => displayName(item.titleFa, item.titlePs)} /> : null}
            {bookId ? <ChoiceGroup label={text.chapter} items={chapters} selected={chapterId} onSelect={setChapterId} getLabel={(item) => `${item.number}. ${displayName(item.titleFa, item.titlePs)}`} /> : null}
            {chapterId ? <ChoiceGroup label={text.topic} items={topics} selected={topicId} onSelect={setTopicId} getLabel={(item) => displayName(item.titleFa, item.titlePs)} /> : null}
          </>
        ) : null}

        {selectedPath ? (
          <View style={styles.pathCard}>
            <Text style={[styles.pathLabel, { textAlign: align }]}>{text.selected}</Text>
            <Text style={[styles.path, { textAlign: align }]}>{selectedPath}</Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.lg },
  header: { gap: theme.spacing.sm },
  title: { color: theme.colors.text, fontSize: theme.typography.title, fontWeight: "800" },
  body: { color: theme.colors.mutedText, fontSize: theme.typography.body, lineHeight: 26 },
  section: { gap: theme.spacing.sm },
  label: { color: theme.colors.text, fontWeight: "700", fontSize: theme.typography.body },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  chip: { minHeight: 44, justifyContent: "center", paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  chipText: { color: theme.colors.text, fontWeight: "600" },
  chipTextActive: { color: theme.colors.primary, fontWeight: "700" },
  empty: { color: theme.colors.mutedText, fontSize: theme.typography.small },
  error: { color: theme.colors.danger },
  pathCard: { padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, gap: theme.spacing.xs },
  pathLabel: { color: theme.colors.mutedText, fontSize: theme.typography.small, fontWeight: "600" },
  path: { color: theme.colors.text, fontWeight: "700", lineHeight: 24 }
});
