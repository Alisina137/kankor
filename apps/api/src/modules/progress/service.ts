import { and, asc, eq, inArray } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";

type AnswerHistoryRow = {
  attemptId: string;
  submittedAt: Date | null;
  questionId: string;
  topicId: string;
  correct: boolean | null;
  timeSpentSeconds: number;
};

function snapshotTopicId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const topic = (value as Record<string, unknown>).topic;
  if (!topic || typeof topic !== "object" || Array.isArray(topic)) return "";
  const id = (topic as Record<string, unknown>).id;
  return typeof id === "string" ? id : "";
}

async function answerHistoryForUser(userId: string) {
  const db = createDatabase();
  const rows = await db.select({
    attemptId: schema.examAttempts.id,
    submittedAt: schema.examAttempts.submittedAt,
    questionId: schema.examQuestions.questionId,
    curriculum: schema.examQuestions.curriculumSnapshot,
    correct: schema.attemptAnswers.correct,
    timeSpentSeconds: schema.attemptAnswers.timeSpentSeconds
  })
    .from(schema.attemptAnswers)
    .innerJoin(schema.examAttempts, eq(schema.attemptAnswers.attemptId, schema.examAttempts.id))
    .innerJoin(schema.examQuestions, eq(schema.attemptAnswers.examQuestionId, schema.examQuestions.id))
    .where(and(
      eq(schema.examAttempts.userId, userId),
      eq(schema.examAttempts.status, "analyzed")
    ))
    .orderBy(asc(schema.examAttempts.submittedAt));

  return rows.map((row) => ({
    attemptId: row.attemptId,
    submittedAt: row.submittedAt,
    questionId: row.questionId,
    topicId: snapshotTopicId(row.curriculum),
    correct: row.correct,
    timeSpentSeconds: row.timeSpentSeconds
  })).filter((row) => Boolean(row.topicId));
}

export async function refreshProgressForAttempt(attemptId: string, userId: string) {
  const db = createDatabase();

  const affectedRows = await db.select({
    questionId: schema.examQuestions.questionId,
    curriculum: schema.examQuestions.curriculumSnapshot
  })
    .from(schema.attemptAnswers)
    .innerJoin(schema.examAttempts, eq(schema.attemptAnswers.attemptId, schema.examAttempts.id))
    .innerJoin(schema.examQuestions, eq(schema.attemptAnswers.examQuestionId, schema.examQuestions.id))
    .where(and(
      eq(schema.attemptAnswers.attemptId, attemptId),
      eq(schema.examAttempts.userId, userId)
    ));

  const affected = affectedRows.map((item) => ({
    questionId: item.questionId,
    topicId: snapshotTopicId(item.curriculum)
  })).filter((item) => Boolean(item.topicId));

  if (!affected.length) return;

  const affectedQuestionIds = [...new Set(affected.map((item) => item.questionId))];
  const affectedTopicIds = [...new Set(affected.map((item) => item.topicId))];

  const history = await answerHistoryForUser(userId);

  for (const questionId of affectedQuestionIds) {
    const rows = history.filter((row) => row.questionId === questionId);
    const missed = rows.filter((row) => row.correct === false);
    if (!missed.length) continue;

    const last = rows[rows.length - 1];
    const topicId = last.topicId;
    const firstMissedAt = missed[0].submittedAt ?? new Date();
    const lastAttemptedAt = last.submittedAt ?? firstMissedAt;
    const eventuallyMastered = last.correct === true;
    const masteredAt = eventuallyMastered ? lastAttemptedAt : null;

    await db.insert(schema.mistakeItems).values({
      userId,
      questionId,
      topicId,
      firstMissedAt,
      lastAttemptedAt,
      timesMissed: missed.length,
      eventuallyMastered,
      masteredAt,
      latestAttemptId: last.attemptId
    }).onConflictDoUpdate({
      target: [schema.mistakeItems.userId, schema.mistakeItems.questionId],
      set: {
        topicId,
        firstMissedAt,
        lastAttemptedAt,
        timesMissed: missed.length,
        eventuallyMastered,
        masteredAt,
        latestAttemptId: last.attemptId,
        updatedAt: new Date()
      }
    });
  }

  for (const topicId of affectedTopicIds) {
    const rows = history.filter((row) => row.topicId === topicId);
    if (!rows.length) continue;

    const attemptIds = new Set(rows.map((row) => row.attemptId));
    const correctCount = rows.filter((row) => row.correct === true).length;
    const incorrectCount = rows.filter((row) => row.correct === false).length;
    const unansweredCount = rows.filter((row) => row.correct === null).length;
    const answeredForAccuracy = correctCount + incorrectCount;
    const accuracyPercentage = answeredForAccuracy > 0
      ? (correctCount / answeredForAccuracy) * 100
      : 0;
    const averageTimeSeconds = rows.reduce((sum, row) => sum + row.timeSpentSeconds, 0) / rows.length;
    const timestamps = rows.map((row) => row.submittedAt).filter((value): value is Date => Boolean(value));
    const firstAttemptedAt = timestamps[0] ?? null;
    const lastAttemptedAt = timestamps[timestamps.length - 1] ?? null;

    await db.insert(schema.topicMastery).values({
      userId,
      topicId,
      attemptsCount: attemptIds.size,
      questionsAnswered: rows.length,
      correctCount,
      incorrectCount,
      unansweredCount,
      accuracyPercentage: String(Math.round(accuracyPercentage * 100) / 100),
      averageTimeSeconds: String(Math.round(averageTimeSeconds * 100) / 100),
      firstAttemptedAt,
      lastAttemptedAt
    }).onConflictDoUpdate({
      target: [schema.topicMastery.userId, schema.topicMastery.topicId],
      set: {
        attemptsCount: attemptIds.size,
        questionsAnswered: rows.length,
        correctCount,
        incorrectCount,
        unansweredCount,
        accuracyPercentage: String(Math.round(accuracyPercentage * 100) / 100),
        averageTimeSeconds: String(Math.round(averageTimeSeconds * 100) / 100),
        firstAttemptedAt,
        lastAttemptedAt,
        updatedAt: new Date()
      }
    });
  }
}

export async function rebuildAllProgress(userId: string) {
  const db = createDatabase();
  const attempts = await db.select({ id: schema.examAttempts.id })
    .from(schema.examAttempts)
    .where(and(
      eq(schema.examAttempts.userId, userId),
      eq(schema.examAttempts.status, "analyzed")
    ));

  for (const attempt of attempts) {
    await refreshProgressForAttempt(attempt.id, userId);
  }
}
