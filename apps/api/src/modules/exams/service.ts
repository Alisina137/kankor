import { and, eq, inArray, sql } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";

export type ExamCriteria = {
  subjectIds?: string[];
  gradeIds?: string[];
  bookIds?: string[];
  chapterIds?: string[];
  topicIds?: string[];
  difficulties?: string[];
  language?: string;
};

export type GenerateExamInput = {
  mode: string;
  title: string;
  language: string;
  questionCount: number;
  durationSeconds: number | null;
  blueprintId?: string | null;
  criteria: ExamCriteria;
  userId: string;
};

function nonEmpty(values?: string[]) {
  return Array.isArray(values) ? values.filter(Boolean) : [];
}

export async function selectPublishedQuestions(criteria: ExamCriteria, count: number) {
  const db = createDatabase();
  const conditions = [eq(schema.questions.verificationStatus, "published")];

  const subjectIds = nonEmpty(criteria.subjectIds);
  const gradeIds = nonEmpty(criteria.gradeIds);
  const bookIds = nonEmpty(criteria.bookIds);
  const chapterIds = nonEmpty(criteria.chapterIds);
  const topicIds = nonEmpty(criteria.topicIds);
  const difficulties = nonEmpty(criteria.difficulties);

  if (criteria.language) conditions.push(eq(schema.questions.language, criteria.language));
  if (subjectIds.length) conditions.push(inArray(schema.books.subjectId, subjectIds));
  if (gradeIds.length) conditions.push(inArray(schema.books.gradeId, gradeIds));
  if (bookIds.length) conditions.push(inArray(schema.books.id, bookIds));
  if (chapterIds.length) conditions.push(inArray(schema.chapters.id, chapterIds));
  if (topicIds.length) conditions.push(inArray(schema.topics.id, topicIds));
  if (difficulties.length) conditions.push(inArray(schema.questions.difficulty, difficulties));

  return db.select({
    id: schema.questions.id,
    version: schema.questions.version,
    content: schema.questions.content,
    choices: schema.questions.choices,
    correctChoice: schema.questions.correctChoice,
    marks: schema.questions.marks,
    difficulty: schema.questions.difficulty,
    language: schema.questions.language,
    topicId: schema.topics.id,
    topicFa: schema.topics.titleFa,
    topicPs: schema.topics.titlePs,
    chapterId: schema.chapters.id,
    chapterNumber: schema.chapters.number,
    chapterFa: schema.chapters.titleFa,
    chapterPs: schema.chapters.titlePs,
    bookId: schema.books.id,
    bookFa: schema.books.titleFa,
    bookPs: schema.books.titlePs,
    gradeId: schema.grades.id,
    gradeNumber: schema.grades.number,
    subjectId: schema.subjects.id,
    subjectCode: schema.subjects.code,
    subjectFa: schema.subjects.nameFa,
    subjectPs: schema.subjects.namePs
  })
    .from(schema.questions)
    .innerJoin(schema.topics, eq(schema.questions.topicId, schema.topics.id))
    .innerJoin(schema.chapters, eq(schema.topics.chapterId, schema.chapters.id))
    .innerJoin(schema.books, eq(schema.chapters.bookId, schema.books.id))
    .innerJoin(schema.grades, eq(schema.books.gradeId, schema.grades.id))
    .innerJoin(schema.subjects, eq(schema.books.subjectId, schema.subjects.id))
    .where(and(...conditions))
    .orderBy(sql`random()`)
    .limit(count);
}

export async function createGeneratedExam(input: GenerateExamInput) {
  const selected = await selectPublishedQuestions(input.criteria, input.questionCount);

  if (selected.length < input.questionCount) {
    return {
      ok: false as const,
      error: "insufficient_question_pool",
      requested: input.questionCount,
      available: selected.length
    };
  }

  const db = createDatabase();
  const [exam] = await db.insert(schema.exams).values({
    mode: input.mode,
    title: input.title,
    language: input.language,
    blueprintId: input.blueprintId ?? null,
    questionCount: input.questionCount,
    durationSeconds: input.durationSeconds,
    criteriaSnapshot: input.criteria,
    createdByUserId: input.userId
  }).returning({ id: schema.exams.id });

  await db.insert(schema.examQuestions).values(
    selected.map((question, index) => ({
      examId: exam.id,
      questionId: question.id,
      order: index + 1,
      questionVersion: question.version,
      contentSnapshot: question.content,
      choicesSnapshot: question.choices,
      correctChoiceSnapshot: question.correctChoice,
      marksSnapshot: question.marks,
      curriculumSnapshot: {
        difficulty: question.difficulty,
        language: question.language,
        subject: {
          id: question.subjectId,
          code: question.subjectCode,
          nameFa: question.subjectFa,
          namePs: question.subjectPs
        },
        grade: {
          id: question.gradeId,
          number: question.gradeNumber
        },
        book: {
          id: question.bookId,
          titleFa: question.bookFa,
          titlePs: question.bookPs
        },
        chapter: {
          id: question.chapterId,
          number: question.chapterNumber,
          titleFa: question.chapterFa,
          titlePs: question.chapterPs
        },
        topic: {
          id: question.topicId,
          titleFa: question.topicFa,
          titlePs: question.topicPs
        }
      }
    }))
  );

  return { ok: true as const, examId: exam.id, questionCount: selected.length };
}

export async function getOwnedAttempt(attemptId: string, userId: string) {
  const db = createDatabase();
  const rows = await db.select({
    id: schema.examAttempts.id,
    userId: schema.examAttempts.userId,
    examId: schema.examAttempts.examId,
    status: schema.examAttempts.status,
    startedAt: schema.examAttempts.startedAt,
    submittedAt: schema.examAttempts.submittedAt,
    expiresAt: schema.examAttempts.expiresAt,
    configurationSnapshot: schema.examAttempts.configurationSnapshot,
    submissionKey: schema.examAttempts.submissionKey,
    examTitle: schema.exams.title,
    examMode: schema.exams.mode,
    questionCount: schema.exams.questionCount,
    durationSeconds: schema.exams.durationSeconds,
    language: schema.exams.language
  })
    .from(schema.examAttempts)
    .innerJoin(schema.exams, eq(schema.examAttempts.examId, schema.exams.id))
    .where(and(
      eq(schema.examAttempts.id, attemptId),
      eq(schema.examAttempts.userId, userId)
    ))
    .limit(1);

  return rows[0] ?? null;
}
