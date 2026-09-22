import type { FastifyPluginAsync } from "fastify";
import { and, asc, desc, eq } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { requireUser } from "../../common/user-auth.js";
import { createGeneratedExam, PRACTICE_SCORING_RULES, selectPublishedQuestions } from "../exams/service.js";
import { rebuildAllProgress } from "./service.js";
import { getEntitlementState, getFreeEntitlements } from "../billing/service.js";

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

  const initialPool = await selectPublishedQuestions({ topicIds: [topicId], language }, 10);
  if (!initialPool.length) return { ok: false as const, error: "insufficient_question_pool" };
  const selectedLanguage = language ?? initialPool[0].language;
  const pool = language ? initialPool : await selectPublishedQuestions({ topicIds: [topicId], language: selectedLanguage }, 10);
  if (!pool.length) return { ok: false as const, error: "insufficient_question_pool" };
  const questionCount = Math.min(10, pool.length);

  const generated = await createGeneratedExam({
    mode: "topic",
    title: `Topic practice — ${topic.titleFa}`,
    language: selectedLanguage,
    questionCount,
    durationSeconds: null,
    criteria: { topicIds: [topicId], language: selectedLanguage },
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

    const analyses = await db.select({
      bySubject: schema.attemptAnalyses.bySubject
    }).from(schema.attemptAnalyses)
      .innerJoin(schema.examAttempts, eq(schema.attemptAnalyses.attemptId, schema.examAttempts.id))
      .where(eq(schema.examAttempts.userId, auth.user.userId));

    const groups = new Map<string, {
      id: string; label: string; total: number; correct: number; incorrect: number;
      unanswered: number; weightedTime: number;
    }>();

    for (const analysis of analyses) {
      for (const raw of analysis.bySubject) {
        const id = typeof raw.id === "string" ? raw.id : "";
        if (!id) continue;
        const total = Number(raw.total ?? 0);
        const current = groups.get(id) ?? {
          id,
          label: typeof raw.label === "string" ? raw.label : "Subject",
          total: 0,
          correct: 0,
          incorrect: 0,
          unanswered: 0,
          weightedTime: 0
        };
        current.total += total;
        current.correct += Number(raw.correct ?? 0);
        current.incorrect += Number(raw.incorrect ?? 0);
        current.unanswered += Number(raw.unanswered ?? 0);
        current.weightedTime += Number(raw.averageTimeSeconds ?? 0) * total;
        groups.set(id, current);
      }
    }

    const items = [...groups.values()].map((item) => {
      const answered = item.correct + item.incorrect;
      return {
        id: item.id,
        label: item.label,
        total: item.total,
        correct: item.correct,
        incorrect: item.incorrect,
        unanswered: item.unanswered,
        accuracyPercentage: item.total ? Math.round((item.correct / item.total) * 10000) / 100 : 0,
        averageTimeSeconds: item.total ? Math.round((item.weightedTime / item.total) * 100) / 100 : 0
      };
    }).sort((a,b) => a.accuracyPercentage - b.accuracyPercentage);

    return { items };
  });

  app.get("/progress/topics", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const entitlement = await getEntitlementState(auth.user.userId);
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

    const normalized = items.map((item) => ({
      ...item,
      accuracyPercentage: Number(item.accuracyPercentage),
      averageTimeSeconds: Number(item.averageTimeSeconds)
    }));
    return {
      items: entitlement.tier === "premium" ? normalized : normalized.slice(0, 3),
      limited: entitlement.tier !== "premium"
    };
  });

  app.get("/progress/history", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const entitlement = await getEntitlementState(auth.user.userId);
    const free = entitlement.tier === "free" ? await getFreeEntitlements() : null;
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
      .limit(entitlement.tier === "premium" ? 100 : Math.max(1, free?.progressHistoryLimit ?? 5));

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
    const entitlement = await getEntitlementState(auth.user.userId);
    if (entitlement.tier !== "premium") {
      return reply.code(402).send({ error: "premium_required", reason: "mistake_notebook" });
    }
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
    const entitlement = await getEntitlementState(auth.user.userId);
    if (entitlement.tier !== "premium") {
      return reply.code(402).send({ error: "premium_required", reason: "weakness_practice" });
    }
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
    const entitlement = await getEntitlementState(auth.user.userId);
    if (entitlement.tier !== "premium") {
      return reply.code(402).send({ error: "premium_required", reason: "weakness_practice" });
    }
    const language = typeof request.body?.language === "string" ? request.body.language : undefined;
    const started = await startTopicPractice(auth.user.userId, request.params.topicId, language);
    if (!started.ok) return reply.code(started.error === "topic_not_found" ? 404 : 409).send({ error: started.error });
    return reply.code(201).send({ attempt: { id: started.attemptId }, questionCount: started.questionCount });
  });
};
