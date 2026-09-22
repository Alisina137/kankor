import type { FastifyPluginAsync } from "fastify";
import { and, asc, desc, eq } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { requireUser } from "../../common/user-auth.js";
import { createGeneratedExam, PRACTICE_SCORING_RULES, selectPublishedQuestions } from "../exams/service.js";
import { rebuildAllProgress } from "./service.js";

type AggregateRow = {
  id: string;
  label: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  time: number;
};

function aggregateRows(rows: Array<{
  groupId: string;
  label: string;
  correct: boolean | null;
  timeSpentSeconds: number;
}>) {
  const groups = new Map<string, AggregateRow>();
  for (const row of rows) {
    const current = groups.get(row.groupId) ?? {
      id: row.groupId,
      label: row.label,
      total: 0,
      correct: 0,
      incorrect: 0,
      unanswered: 0,
      time: 0
    };
    current.total += 1;
    if (row.correct === true) current.correct += 1;
    else if (row.correct === false) current.incorrect += 1;
    else current.unanswered += 1;
    current.time += row.timeSpentSeconds;
    groups.set(row.groupId, current);
  }

  return [...groups.values()].map((row) => {
    const answered = row.correct + row.incorrect;
    return {
      id: row.id,
      label: row.label,
      total: row.total,
      correct: row.correct,
      incorrect: row.incorrect,
      unanswered: row.unanswered,
      accuracyPercentage: answered ? Math.round((row.correct / answered) * 10000) / 100 : 0,
      averageTimeSeconds: row.total ? Math.round((row.time / row.total) * 100) / 100 : 0
    };
  });
}

async function startTopicPractice(userId: string, topicId: string, language?: string) {
  const db = createDatabase();
  const topicRows = await db.select({
    id: schema.topics.id,
    titleFa: schema.topics.titleFa,
    titlePs: schema.topics.titlePs
  }).from(schema.topics).where(eq(schema.topics.id, topicId)).limit(1);
  const topic = topicRows[0];
  if (!topic) return { ok: false as const, error: "topic_not_found" };

  const pool = await selectPublishedQuestions({ topicIds: [topicId], language }, 10);
  if (!pool.length) return { ok: false as const, error: "insufficient_question_pool" };
  const questionCount = Math.min(10, pool.length);

  const generated = await createGeneratedExam({
    mode: "topic",
    title: `Topic practice — ${topic.titleFa}`,
    language: language ?? pool[0].language,
    questionCount,
    durationSeconds: null,
    criteria: { topicIds: [topicId], language: language ?? pool[0].language },
    scoringRules: PRACTICE_SCORING_RULES,
    userId
  });
  if (!generated.ok) return generated;

  const startedAt = new Date();
  const [attempt] = await db.insert(schema.examAttempts).values({
    userId,
    examId: generated.examId,
    status: "in_progress",
    startedAt,
    configurationSnapshot: {
      examId: generated.examId,
      mode: "topic",
      questionCount,
      durationSeconds: null,
      criteria: { topicIds: [topicId] },
      scoring: PRACTICE_SCORING_RULES,
      recoveryPractice: true
    }
  }).returning({ id: schema.examAttempts.id });

  return { ok: true as const, attemptId: attempt.id, questionCount };
}

export const progressRoutes: FastifyPluginAsync = async (app) => {
  app.get("/progress/overview", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    await rebuildAllProgress(auth.user.userId);

    const db = createDatabase();
    const [results, mistakes, mastery] = await Promise.all([
      db.select({
        percentage: schema.attemptResults.percentage,
        correct: schema.attemptResults.correctCount,
        incorrect: schema.attemptResults.incorrectCount,
        unanswered: schema.attemptResults.unansweredCount
      }).from(schema.attemptResults)
        .innerJoin(schema.examAttempts, eq(schema.attemptResults.attemptId, schema.examAttempts.id))
        .where(eq(schema.examAttempts.userId, auth.user.userId)),
      db.select({
        mastered: schema.mistakeItems.eventuallyMastered
      }).from(schema.mistakeItems)
        .where(eq(schema.mistakeItems.userId, auth.user.userId)),
      db.select({
        accuracy: schema.topicMastery.accuracyPercentage
      }).from(schema.topicMastery)
        .where(eq(schema.topicMastery.userId, auth.user.userId))
    ]);

    const averagePercentage = results.length
      ? results.reduce((sum, item) => sum + Number(item.percentage), 0) / results.length
      : 0;

    return {
      completedExams: results.length,
      questionsAttempted: results.reduce((sum, item) => sum + item.correct + item.incorrect + item.unanswered, 0),
      averagePercentage: Math.round(averagePercentage * 100) / 100,
      activeMistakes: mistakes.filter((item) => !item.mastered).length,
      masteredMistakes: mistakes.filter((item) => item.mastered).length,
      topicsPracticed: mastery.length
    };
  });

  app.get("/progress/subjects", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const db = createDatabase();

    const rows = await db.select({
      groupId: schema.subjects.id,
      label: schema.subjects.nameFa,
      correct: schema.attemptAnswers.correct,
      timeSpentSeconds: schema.attemptAnswers.timeSpentSeconds
    }).from(schema.attemptAnswers)
      .innerJoin(schema.examAttempts, eq(schema.attemptAnswers.attemptId, schema.examAttempts.id))
      .innerJoin(schema.examQuestions, eq(schema.attemptAnswers.examQuestionId, schema.examQuestions.id))
      .innerJoin(schema.questions, eq(schema.examQuestions.questionId, schema.questions.id))
      .innerJoin(schema.topics, eq(schema.questions.topicId, schema.topics.id))
      .innerJoin(schema.chapters, eq(schema.topics.chapterId, schema.chapters.id))
      .innerJoin(schema.books, eq(schema.chapters.bookId, schema.books.id))
      .innerJoin(schema.subjects, eq(schema.books.subjectId, schema.subjects.id))
      .where(and(
        eq(schema.examAttempts.userId, auth.user.userId),
        eq(schema.examAttempts.status, "analyzed")
      ));

    return { items: aggregateRows(rows).sort((a,b) => a.accuracyPercentage - b.accuracyPercentage) };
  });

  app.get("/progress/topics", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const db = createDatabase();

    const items = await db.select({
      topicId: schema.topicMastery.topicId,
      topicFa: schema.topics.titleFa,
      topicPs: schema.topics.titlePs,
      subjectFa: schema.subjects.nameFa,
      subjectPs: schema.subjects.namePs,
      attemptsCount: schema.topicMastery.attemptsCount,
      questionsAnswered: schema.topicMastery.questionsAnswered,
      correctCount: schema.topicMastery.correctCount,
      incorrectCount: schema.topicMastery.incorrectCount,
      unansweredCount: schema.topicMastery.unansweredCount,
      accuracyPercentage: schema.topicMastery.accuracyPercentage,
      averageTimeSeconds: schema.topicMastery.averageTimeSeconds,
      firstAttemptedAt: schema.topicMastery.firstAttemptedAt,
      lastAttemptedAt: schema.topicMastery.lastAttemptedAt
    }).from(schema.topicMastery)
      .innerJoin(schema.topics, eq(schema.topicMastery.topicId, schema.topics.id))
      .innerJoin(schema.chapters, eq(schema.topics.chapterId, schema.chapters.id))
      .innerJoin(schema.books, eq(schema.chapters.bookId, schema.books.id))
      .innerJoin(schema.subjects, eq(schema.books.subjectId, schema.subjects.id))
      .where(eq(schema.topicMastery.userId, auth.user.userId))
      .orderBy(asc(schema.topicMastery.accuracyPercentage));

    return {
      items: items.map((item) => ({
        ...item,
        accuracyPercentage: Number(item.accuracyPercentage),
        averageTimeSeconds: Number(item.averageTimeSeconds)
      }))
    };
  });

  app.get("/progress/history", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const db = createDatabase();

    const items = await db.select({
      attemptId: schema.examAttempts.id,
      submittedAt: schema.examAttempts.submittedAt,
      title: schema.exams.title,
      mode: schema.exams.mode,
      score: schema.attemptResults.score,
      maxScore: schema.attemptResults.maxScore,
      percentage: schema.attemptResults.percentage,
      correct: schema.attemptResults.correctCount,
      incorrect: schema.attemptResults.incorrectCount,
      unanswered: schema.attemptResults.unansweredCount
    }).from(schema.attemptResults)
      .innerJoin(schema.examAttempts, eq(schema.attemptResults.attemptId, schema.examAttempts.id))
      .innerJoin(schema.exams, eq(schema.examAttempts.examId, schema.exams.id))
      .where(eq(schema.examAttempts.userId, auth.user.userId))
      .orderBy(desc(schema.examAttempts.submittedAt))
      .limit(100);

    return {
      items: items.map((item) => ({
        ...item,
        score: Number(item.score),
        maxScore: Number(item.maxScore),
        percentage: Number(item.percentage)
      }))
    };
  });

  app.get("/mistakes", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const db = createDatabase();

    const items = await db.select({
      id: schema.mistakeItems.id,
      questionId: schema.mistakeItems.questionId,
      question: schema.questions.content,
      language: schema.questions.language,
      topicId: schema.mistakeItems.topicId,
      topicFa: schema.topics.titleFa,
      topicPs: schema.topics.titlePs,
      subjectFa: schema.subjects.nameFa,
      subjectPs: schema.subjects.namePs,
      firstMissedAt: schema.mistakeItems.firstMissedAt,
      lastAttemptedAt: schema.mistakeItems.lastAttemptedAt,
      timesMissed: schema.mistakeItems.timesMissed,
      eventuallyMastered: schema.mistakeItems.eventuallyMastered,
      masteredAt: schema.mistakeItems.masteredAt
    }).from(schema.mistakeItems)
      .innerJoin(schema.questions, eq(schema.mistakeItems.questionId, schema.questions.id))
      .innerJoin(schema.topics, eq(schema.mistakeItems.topicId, schema.topics.id))
      .innerJoin(schema.chapters, eq(schema.topics.chapterId, schema.chapters.id))
      .innerJoin(schema.books, eq(schema.chapters.bookId, schema.books.id))
      .innerJoin(schema.subjects, eq(schema.books.subjectId, schema.subjects.id))
      .where(eq(schema.mistakeItems.userId, auth.user.userId))
      .orderBy(asc(schema.mistakeItems.eventuallyMastered), desc(schema.mistakeItems.lastAttemptedAt));

    return { items };
  });

  app.post<{ Params: { questionId: string } }>("/mistakes/:questionId/practice", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const db = createDatabase();

    const rows = await db.select({
      topicId: schema.mistakeItems.topicId,
      language: schema.questions.language
    }).from(schema.mistakeItems)
      .innerJoin(schema.questions, eq(schema.mistakeItems.questionId, schema.questions.id))
      .where(and(
        eq(schema.mistakeItems.userId, auth.user.userId),
        eq(schema.mistakeItems.questionId, request.params.questionId)
      )).limit(1);

    if (!rows[0]) return reply.code(404).send({ error: "mistake_not_found" });
    const started = await startTopicPractice(auth.user.userId, rows[0].topicId, rows[0].language);
    if (!started.ok) return reply.code(started.error === "topic_not_found" ? 404 : 409).send({ error: started.error });
    return reply.code(201).send({ attempt: { id: started.attemptId }, questionCount: started.questionCount });
  });

  app.post<{ Params: { topicId: string }; Body: { language?: string } }>("/progress/topics/:topicId/practice", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const language = typeof request.body?.language === "string" ? request.body.language : undefined;
    const started = await startTopicPractice(auth.user.userId, request.params.topicId, language);
    if (!started.ok) return reply.code(started.error === "topic_not_found" ? 404 : 409).send({ error: started.error });
    return reply.code(201).send({ attempt: { id: started.attemptId }, questionCount: started.questionCount });
  });
};
