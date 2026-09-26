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
    grades: "صنف‌ها",
    subject: "مضمون",
    subjects: "مضامین",
    book: "کتاب",
    books: "کتاب‌ها",
    chapter: "فصل",
    chapters: "فصل‌ها",
    topic: "موضوع",
    topics: "موضوعات",
    empty: "هنوز محتوایی برای این بخش اضافه نشده است.",
    loading: "در حال بارگیری...",
    emptyGrades: "هنوز صنفی برای تمرین آماده نشده است.",
    emptySubjects: "برای این صنف هنوز مضمونی آماده نشده است.",
    emptyBooks: "برای این مضمون در این صنف هنوز کتابی آماده نشده است.",
    emptyChapters: "برای این کتاب هنوز فصلی آماده نشده است.",
    emptyTopics: "برای این فصل هنوز موضوعی آماده نشده است.",
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
    grades: "ټولګي",
    subject: "مضمون",
    subjects: "مضمونونه",
    book: "کتاب",
    books: "کتابونه",
    chapter: "څپرکی",
    chapters: "څپرکي",
    topic: "موضوع",
    topics: "موضوعات",
    empty: "تر اوسه دې برخې ته محتوا نه ده اضافه شوې.",
    loading: "بارېږي...",
    emptyGrades: "تر اوسه د تمرین لپاره ټولګی نه دی چمتو شوی.",
    emptySubjects: "د دې ټولګي لپاره تر اوسه مضمون نه دی چمتو شوی.",
    emptyBooks: "د دې مضمون او ټولګي لپاره تر اوسه کتاب نه دی چمتو شوی.",
    emptyChapters: "د دې کتاب لپاره تر اوسه څپرکی نه دی چمتو شوی.",
    emptyTopics: "د دې څپرکي لپاره تر اوسه موضوع نه ده چمتو شوې.",
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
    grade: "Class",
    grades: "Classes",
    subject: "Subject",
    subjects: "Subjects",
    book: "Book",
    books: "Books",
    chapter: "Chapter",
    chapters: "Chapters",
    topic: "Topic",
    topics: "Topics",
    empty: "No content has been added here yet.",
    loading: "Loading...",
    emptyGrades: "No grade is ready for practice yet.",
    emptySubjects: "No subjects are ready for this grade yet.",
    emptyBooks: "No books are ready for this subject and grade yet.",
    emptyChapters: "No chapters are ready for this book yet.",
    emptyTopics: "No topics are ready for this chapter yet.",
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
  const rowDirection = "row";

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
  const [gradesLoading, setGradesLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [booksLoading, setBooksLoading] = useState(false);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setGradesLoading(true);
    setError("");

    void apiRequest<{ items: Grade[] }>("/grades")
      .then((result) => {
        if (!active) return;
        setGrades(result.items);
        const defaultGrade = result.items.find((item) => item.number === 10);
        if (defaultGrade) {
          setGradeId((current) => current ?? defaultGrade.id);
        }
      })
      .catch(() => {
        if (active) setError(text.error);
      })
      .finally(() => {
        if (active) setGradesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [text.error]);

  useEffect(() => {
    let active = true;

    setSubjectId(null);
    setBookId(null);
    setChapterId(null);
    setTopicId(null);
    setSubjects([]);
    setBooks([]);
    setChapters([]);
    setTopics([]);
    setBooksLoading(false);
    setChaptersLoading(false);
    setTopicsLoading(false);

    if (!gradeId) {
      setSubjectsLoading(false);
      return () => {
        active = false;
      };
    }

    setSubjectsLoading(true);
    setError("");

    void apiRequest<{ items: Subject[] }>(`/subjects?gradeId=${encodeURIComponent(gradeId)}`)
      .then((result) => {
        if (active) setSubjects(result.items);
      })
      .catch(() => {
        if (active) setError(text.error);
      })
      .finally(() => {
        if (active) setSubjectsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [gradeId, text.error]);

  useEffect(() => {
    let active = true;

    setBookId(null);
    setChapterId(null);
    setTopicId(null);
    setBooks([]);
    setChapters([]);
    setTopics([]);
    setChaptersLoading(false);
    setTopicsLoading(false);

    if (!gradeId || !subjectId) {
      setBooksLoading(false);
      return () => {
        active = false;
      };
    }

    setBooksLoading(true);
    setError("");

    void apiRequest<{ items: Book[] }>(`/books?gradeId=${encodeURIComponent(gradeId)}&subjectId=${encodeURIComponent(subjectId)}`)
      .then((result) => {
        if (active) setBooks(result.items);
      })
      .catch(() => {
        if (active) setError(text.error);
      })
      .finally(() => {
        if (active) setBooksLoading(false);
      });

    return () => {
      active = false;
    };
  }, [gradeId, subjectId, text.error]);

  useEffect(() => {
    let active = true;

    setChapterId(null);
    setTopicId(null);
    setChapters([]);
    setTopics([]);
    setTopicsLoading(false);

    if (!bookId) {
      setChaptersLoading(false);
      return () => {
        active = false;
      };
    }

    setChaptersLoading(true);
    setError("");

    void apiRequest<{ items: Chapter[] }>(`/chapters?bookId=${encodeURIComponent(bookId)}`)
      .then((result) => {
        if (!active) return;

        setChapters(result.items);

        if (result.items.length === 1) {
          setTopicsLoading(true);
          setChapterId(result.items[0].id);
        }
      })
      .catch(() => {
        if (active) setError(text.error);
      })
      .finally(() => {
        if (active) setChaptersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookId, text.error]);

  useEffect(() => {
    let active = true;

    setTopicId(null);
    setTopics([]);

    if (!chapterId) {
      setTopicsLoading(false);
      return () => {
        active = false;
      };
    }

    setTopicsLoading(true);
    setError("");

    void apiRequest<{ items: Topic[] }>(`/topics?chapterId=${encodeURIComponent(chapterId)}`)
      .then((result) => {
        if (!active) return;
        setTopics(result.items);
        if (result.items.length <= 1) setTopicId(null);
      })
      .catch(() => {
        if (active) setError(text.error);
      })
      .finally(() => {
        if (active) setTopicsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [chapterId, text.error]);

  function selectGrade(id: string) {
    if (id === gradeId) return;
    setError("");
    setSubjectsLoading(true);
    setBooksLoading(false);
    setChaptersLoading(false);
    setTopicsLoading(false);
    setSubjectId(null);
    setBookId(null);
    setChapterId(null);
    setTopicId(null);
    setSubjects([]);
    setBooks([]);
    setChapters([]);
    setTopics([]);
    setGradeId(id);
  }

  function selectSubject(id: string) {
    if (id === subjectId) return;
    setError("");
    setBooksLoading(true);
    setChaptersLoading(false);
    setTopicsLoading(false);
    setBookId(null);
    setChapterId(null);
    setTopicId(null);
    setBooks([]);
    setChapters([]);
    setTopics([]);
    setSubjectId(id);
  }

  function selectBook(id: string) {
    if (id === bookId) return;
    setError("");
    setChaptersLoading(true);
    setTopicsLoading(false);
    setChapterId(null);
    setTopicId(null);
    setChapters([]);
    setTopics([]);
    setBookId(id);
  }

  function selectChapter(id: string) {
    if (id === chapterId) return;
    setError("");
    setTopicsLoading(true);
    setTopicId(null);
    setTopics([]);
    setChapterId(id);
  }

  const displayName = (fa: string, ps: string | null) => locale === "ps" ? (ps || fa) : fa;
  const countLabel = (count: number, singular: string, plural: string) => count > 1 ? plural : singular;
  const selectedBook = books.find((item) => item.id === bookId) ?? null;
  const selectedSubject = subjects.find((item) => item.id === subjectId) ?? null;
  const availableQuestionCounts = topicId ? questionCounts.filter((count) => count <= 10) : questionCounts;
  useEffect(() => {
    if (topicId && questionCount > 10) setQuestionCount(10);
  }, [topicId, questionCount]);

  const selectedPath = useMemo(() => {
    const subject = subjects.find((item) => item.id === subjectId);
    const book = books.find((item) => item.id === bookId);
    const chapter = chapters.find((item) => item.id === chapterId);
    const topic = topics.find((item) => item.id === topicId);
    const parts = [
      subject && displayName(subject.nameFa, subject.namePs),
      grades.find((item) => item.id === gradeId)?.number,
      book && displayName(book.titleFa, book.titlePs),
      chapter && chapters.length > 1 && displayName(chapter.titleFa, chapter.titlePs),
      topic && topics.length > 1 && displayName(topic.titleFa, topic.titlePs)
    ].filter(Boolean);
    return parts.join(" • ");
  }, [subjects, grades, books, chapters, topics, subjectId, gradeId, bookId, chapterId, topicId, locale]);

  function ChoiceGroup<T extends { id: string }>({
    label,
    items,
    selected,
    onSelect,
    getLabel,
    loading = false,
    emptyMessage = text.empty
  }: {
    label: string;
    items: T[];
    selected: string | null;
    onSelect: (id: string) => void;
    getLabel: (item: T) => string;
    loading?: boolean;
    emptyMessage?: string;
  }) {
    return (
      <View style={styles.section}>
        <Text style={[styles.label, { textAlign: align, writingDirection: direction }]}>{label}</Text>
        {loading ? (
          <View style={[styles.loadingRow, { flexDirection: rowDirection }]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { textAlign: align, writingDirection: direction }]}>{text.loading}</Text>
          </View>
        ) : items.length ? (
          <View style={[styles.chips, { flexDirection: rowDirection }]}>
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
        ) : <Text style={[styles.empty, { textAlign: align, writingDirection: direction }]}>{emptyMessage}</Text>}
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
      language: String(selectedBook?.sourceMetadata?.language ?? (selectedSubject?.code === "pashto" ? "ps" : locale)),
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
      if (code === "premium_required") {
        router.push("/premium");
      } else {
        setError(code === "insufficient_question_pool" ? text.insufficient : text.startError);
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.stack}>
        <View style={styles.header}>
          <Text style={[styles.title, { textAlign: align, writingDirection: direction }]}>{text.title}</Text>
          <Text style={[styles.body, { textAlign: align, writingDirection: direction }]}>{text.body}</Text>
        </View>

        {error ? <Text style={[styles.error, { textAlign: align, writingDirection: direction }]}>{error}</Text> : null}

        <ChoiceGroup
          label={countLabel(grades.length, text.grade, text.grades)}
          items={grades}
          selected={gradeId}
          onSelect={selectGrade}
          getLabel={(item) => String(item.number)}
          loading={gradesLoading}
          emptyMessage={text.emptyGrades}
        />
        {gradeId ? (
          <ChoiceGroup
            label={countLabel(subjects.length, text.subject, text.subjects)}
            items={subjects}
            selected={subjectId}
            onSelect={selectSubject}
            getLabel={(item) => displayName(item.nameFa, item.namePs)}
            loading={subjectsLoading}
            emptyMessage={text.emptySubjects}
          />
        ) : null}
        {gradeId && subjectId ? (
          <ChoiceGroup
            label={countLabel(books.length, text.book, text.books)}
            items={books}
            selected={bookId}
            onSelect={selectBook}
            getLabel={(item) => displayName(item.titleFa, item.titlePs)}
            loading={booksLoading}
            emptyMessage={text.emptyBooks}
          />
        ) : null}
        {bookId && chaptersLoading ? (
          <View style={[styles.loadingRow, { flexDirection: rowDirection }]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { textAlign: align, writingDirection: direction }]}>{text.loading}</Text>
          </View>
        ) : null}
        {bookId && !chaptersLoading && chapters.length > 1 ? (
          <ChoiceGroup
            label={countLabel(chapters.length, text.chapter, text.chapters)}
            items={chapters}
            selected={chapterId}
            onSelect={selectChapter}
            getLabel={(item) => `${item.number}. ${displayName(item.titleFa, item.titlePs)}`}
            emptyMessage={text.emptyChapters}
          />
        ) : null}
        {bookId && !chaptersLoading && chapters.length === 0 ? (
          <Text style={[styles.empty, { textAlign: align, writingDirection: direction }]}>{text.emptyChapters}</Text>
        ) : null}
        {chapterId && topicsLoading ? (
          <View style={[styles.loadingRow, { flexDirection: rowDirection }]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { textAlign: align, writingDirection: direction }]}>{text.loading}</Text>
          </View>
        ) : null}
        {chapterId && !topicsLoading && topics.length > 1 ? (
          <ChoiceGroup
            label={countLabel(topics.length, text.topic, text.topics)}
            items={topics}
            selected={topicId}
            onSelect={setTopicId}
            getLabel={(item) => displayName(item.titleFa, item.titlePs)}
            emptyMessage={text.emptyTopics}
          />
        ) : null}
        {chapterId && !topicsLoading && topics.length === 0 ? (
          <Text style={[styles.empty, { textAlign: align, writingDirection: direction }]}>{text.emptyTopics}</Text>
        ) : null}

        {selectedBook ? (
          <View style={styles.sourceCard}>
            <View style={[styles.sourceHeader, { flexDirection: rowDirection }]}>
              <Text style={[styles.sourceBadge, { textAlign: align, writingDirection: direction }]}>{text.officialBook}</Text>
              {selectedBook.editionYear ? (
                <Text style={styles.sourceEdition}>{text.edition} {selectedBook.editionYear}</Text>
              ) : null}
            </View>
            <Text style={[styles.sourceTitle, { textAlign: align, writingDirection: direction }]}>
              {displayName(selectedBook.titleFa, selectedBook.titlePs)}
            </Text>
            <Text style={[styles.sourceMeta, { textAlign: align, writingDirection: direction }]}>
              {text.publisher}: {String(selectedBook.sourceMetadata?.publisher ?? "—")} · {chaptersLoading ? text.loading : `${chapters.length} ${countLabel(chapters.length, text.chapter, text.chapters)}`}
            </Text>
          </View>
        ) : null}

        {selectedPath ? (
          <View style={styles.pathCard}>
            <Text style={[styles.pathLabel, { textAlign: align, writingDirection: direction }]}>{text.selected}</Text>
            <Text style={[styles.path, { textAlign: align, writingDirection: direction }]}>{selectedPath}</Text>
          </View>
        ) : null}

        {subjectId ? (
          <View style={styles.setupCard}>
            <Text style={[styles.setupTitle, { textAlign: align, writingDirection: direction }]}>{text.examSetup}</Text>

            <Text style={[styles.label, { textAlign: align, writingDirection: direction }]}>{text.questionCount}</Text>
            <View style={[styles.chips, { flexDirection: rowDirection }]}>
              {availableQuestionCounts.map((count) => (
                <Pressable key={count} onPress={() => setQuestionCount(count)} style={[styles.chip, questionCount === count && styles.chipActive]}>
                  <Text style={questionCount === count ? styles.chipTextActive : styles.chipText}>{count}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { textAlign: align, writingDirection: direction }]}>{text.timer}</Text>
            <View style={[styles.chips, { flexDirection: rowDirection }]}>
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
  scrollContent: { paddingBottom: 140 },
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
  loadingRow: { alignItems: "center", gap: theme.spacing.sm, minHeight: 36 },
  loadingText: { color: theme.colors.mutedText, fontSize: theme.typography.small },
  empty: { color: theme.colors.mutedText, fontSize: theme.typography.small, lineHeight: 22 },
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
