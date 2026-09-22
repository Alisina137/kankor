import { theme } from "@kankor/config";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../components/screen";
import { apiRequest, ApiError } from "../../lib/api";
import { useAuth } from "../../providers/auth-provider";
import { useLocale } from "../../providers/locale-provider";

type Grade = { id: string; number: number; nameFa: string; namePs: string | null };
type Subject = { id: string; code: string; nameFa: string; namePs: string | null };
type Book = { id: string; subjectId: string; gradeId: string; code: string; titleFa: string; titlePs: string | null; editionYear: number | null; sourceMetadata: Record<string, unknown> };
type Chapter = { id: string; bookId: string; number: number; titleFa: string; titlePs: string | null };
type Topic = { id: string; chapterId: string; titleFa: string; titlePs: string | null };

const questionCounts = [5, 10, 20, 30];
const timerOptions = [null, 900, 1800, 3600] as const;

const copy = {
  fa: {
    title: "تمرین بر اساس نصاب",
    body: "مسیر درسی خود را انتخاب کنید و یک امتحان هدفمند بسازید.",
    grade: "صنف",
    subject: "مضمون",
    book: "کتاب",
    chapter: "فصل",
    topic: "موضوع",
    empty: "هنوز محتوایی برای این بخش اضافه نشده است.",
    error: "محتوای درسی بارگیری نشد. دوباره تلاش کنید.",
    selected: "مسیر انتخاب‌شده",
    examSetup: "تنظیم امتحان",
    questionCount: "تعداد سوال",
    timer: "زمان",
    noTimer: "بدون زمان",
    minutes: "دقیقه",
    start: "شروع امتحان",
    starting: "در حال ساخت امتحان...",
    selectPath: "حداقل یک مضمون را انتخاب کنید.",
    insufficient: "برای این مسیر هنوز سوالات منتشرشده کافی نیست.",
    startError: "امتحان شروع نشد. دوباره تلاش کنید.",
    officialBook: "کتاب درسی رسمی",
    edition: "چاپ",
    publisher: "ناشر",
    lessons: "درس"
  },
  ps: {
    title: "د نصاب له مخې تمرین",
    body: "خپل درسي مسیر وټاکئ او هدفمنده ازموینه جوړه کړئ.",
    grade: "ټولګی",
    subject: "مضمون",
    book: "کتاب",
    chapter: "څپرکی",
    topic: "موضوع",
    empty: "تر اوسه دې برخې ته محتوا نه ده اضافه شوې.",
    error: "درسي محتوا پورته نه شوه. بیا هڅه وکړئ.",
    selected: "ټاکل شوې لاره",
    examSetup: "د ازموینې تنظیم",
    questionCount: "د پوښتنو شمېر",
    timer: "وخت",
    noTimer: "بې وخته",
    minutes: "دقیقې",
    start: "ازموینه پیل کړئ",
    starting: "ازموینه جوړېږي...",
    selectPath: "لږ تر لږه یو مضمون وټاکئ.",
    insufficient: "د دې مسیر لپاره کافي خپرې شوې پوښتنې نشته.",
    startError: "ازموینه پیل نه شوه. بیا هڅه وکړئ.",
    officialBook: "رسمي درسي کتاب",
    edition: "چاپ",
    publisher: "خپرونکی",
    lessons: "درسونه"
  },
  en: {
    title: "Practice by curriculum",
    body: "Choose a curriculum path and build a targeted exam.",
    grade: "Grade",
    subject: "Subject",
    book: "Book",
    chapter: "Chapter",
    topic: "Topic",
    empty: "No content has been added here yet.",
    error: "Curriculum could not be loaded. Try again.",
    selected: "Selected path",
    examSetup: "Exam setup",
    questionCount: "Questions",
    timer: "Timer",
    noTimer: "No timer",
    minutes: "min",
    start: "Start exam",
    starting: "Creating exam...",
    selectPath: "Select at least a subject.",
    insufficient: "There are not enough published questions for this path yet.",
    startError: "The exam could not be started. Try again.",
    officialBook: "Official textbook",
    edition: "Edition",
    publisher: "Publisher",
    lessons: "lessons"
  }
} as const;

export default function PracticeScreen() {
  const { token } = useAuth();
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
  const [questionCount, setQuestionCount] = useState(10);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
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
  const selectedBook = books.find((item) => item.id === bookId) ?? null;
  const selectedPath = useMemo(() => {
    const subject = subjects.find((item) => item.id === subjectId);
    const book = books.find((item) => item.id === bookId);
    const chapter = chapters.find((item) => item.id === chapterId);
    const topic = topics.find((item) => item.id === topicId);
    const parts = [
      subject && displayName(subject.nameFa, subject.namePs),
      grades.find((item) => item.id === gradeId)?.number,
      book && displayName(book.titleFa, book.titlePs),
      chapter && displayName(chapter.titleFa, chapter.titlePs),
      topic && displayName(topic.titleFa, topic.titlePs)
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

  async function startTargetedExam() {
    if (!token || !subjectId || starting) {
      if (!subjectId) setError(text.selectPath);
      return;
    }

    const mode = topicId ? "topic" : chapterId ? "chapter" : bookId ? "book" : "subject";
    const body: Record<string, unknown> = {
      mode,
      title: selectedPath || text.title,
      language: locale,
      questionCount,
      durationSeconds
    };

    if (topicId) body.topicIds = [topicId];
    else if (chapterId) body.chapterIds = [chapterId];
    else if (bookId) body.bookIds = [bookId];
    else {
      body.subjectIds = [subjectId];
      if (gradeId) body.gradeIds = [gradeId];
    }

    setStarting(true);
    setError("");

    try {
      const generated = await apiRequest<{ exam: { id: string } }>("/exams/generate", {
        method: "POST",
        body: JSON.stringify(body)
      }, token);

      const started = await apiRequest<{ attempt: { id: string } }>("/attempts", {
        method: "POST",
        body: JSON.stringify({ examId: generated.exam.id })
      }, token);

      router.push(`/exam/${started.attempt.id}`);
    } catch (cause) {
      const code = cause instanceof ApiError ? cause.code : "";
      setError(code === "insufficient_question_pool" ? text.insufficient : text.startError);
    } finally {
      setStarting(false);
    }
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

        {selectedBook ? (
          <View style={styles.sourceCard}>
            <View style={styles.sourceHeader}>
              <Text style={[styles.sourceBadge, { textAlign: align }]}>{text.officialBook}</Text>
              {selectedBook.editionYear ? (
                <Text style={styles.sourceEdition}>{text.edition} {selectedBook.editionYear}</Text>
              ) : null}
            </View>
            <Text style={[styles.sourceTitle, { textAlign: align }]}>
              {displayName(selectedBook.titleFa, selectedBook.titlePs)}
            </Text>
            <Text style={[styles.sourceMeta, { textAlign: align }]}>
              {text.publisher}: {String(selectedBook.sourceMetadata?.publisher ?? "—")} · {chapters.length} {text.chapter}
            </Text>
          </View>
        ) : null}

        {selectedPath ? (
          <View style={styles.pathCard}>
            <Text style={[styles.pathLabel, { textAlign: align }]}>{text.selected}</Text>
            <Text style={[styles.path, { textAlign: align }]}>{selectedPath}</Text>
          </View>
        ) : null}

        {subjectId ? (
          <View style={styles.setupCard}>
            <Text style={[styles.setupTitle, { textAlign: align }]}>{text.examSetup}</Text>

            <Text style={[styles.label, { textAlign: align }]}>{text.questionCount}</Text>
            <View style={styles.chips}>
              {questionCounts.map((count) => (
                <Pressable key={count} onPress={() => setQuestionCount(count)} style={[styles.chip, questionCount === count && styles.chipActive]}>
                  <Text style={questionCount === count ? styles.chipTextActive : styles.chipText}>{count}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { textAlign: align }]}>{text.timer}</Text>
            <View style={styles.chips}>
              {timerOptions.map((seconds) => (
                <Pressable key={String(seconds)} onPress={() => setDurationSeconds(seconds)} style={[styles.chip, durationSeconds === seconds && styles.chipActive]}>
                  <Text style={durationSeconds === seconds ? styles.chipTextActive : styles.chipText}>
                    {seconds == null ? text.noTimer : `${seconds / 60} ${text.minutes}`}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable disabled={starting} onPress={() => void startTargetedExam()} style={[styles.startButton, starting && styles.disabled]}>
              {starting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.startButtonText}>{text.start}</Text>}
            </Pressable>
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
  sourceCard: { padding: theme.spacing.md, gap: 8, backgroundColor: theme.colors.primarySoft, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: theme.radius.lg },
  sourceHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm },
  sourceBadge: { color: theme.colors.primary, fontSize: theme.typography.small, fontWeight: "800" },
  sourceEdition: { color: theme.colors.mutedText, fontSize: theme.typography.small, fontWeight: "700" },
  sourceTitle: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: "800" },
  sourceMeta: { color: theme.colors.mutedText, lineHeight: 22 },
  pathCard: { padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, gap: theme.spacing.xs },
  pathLabel: { color: theme.colors.mutedText, fontSize: theme.typography.small, fontWeight: "600" },
  path: { color: theme.colors.text, fontWeight: "700", lineHeight: 24 },
  setupCard: { padding: theme.spacing.md, gap: theme.spacing.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg },
  setupTitle: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: "800" },
  startButton: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
  startButtonText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.5 }
});
