import type { FastifyPluginAsync } from "fastify";
import { and, asc, desc, eq } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { requireUser } from "../../common/user-auth.js";
import { getOwnedAttempt } from "../exams/service.js";
import { getStoredResult, scoreAttempt } from "./service.js";

const FILTERS = new Set(["all", "incorrect", "correct", "unanswered", "flagged"]);

async function ensureResult(attemptId: string, userId: string) {
  const attempt = await getOwnedAttempt(attemptId, userId);
  if (!attempt) throw new Error("attempt_not_found");
  if (!["submitted", "scored", "analyzed"].includes(attempt.status)) {
    throw new Error("attempt_not_submitted");
  }

  const existing = await getStoredResult(attemptId);
  return existing?.analysis ? existing : scoreAttempt(attemptId, userId);
}

export const resultRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>("/attempts/:id/result", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    try {
      const stored = await ensureResult(request.params.id, auth.user.userId);
      return stored;
    } catch (error) {
      const code = error instanceof Error ? error.message : "result_failed";
      if (code === "attempt_not_found") return reply.code(404).send({ error: code });
      if (code === "attempt_not_submitted") return reply.code(409).send({ error: code });
      if (code === "scoring_configuration_missing") return reply.code(409).send({ error: code });
      throw error;
    }
  });

  app.get<{ Params: { id: string }; Querystring: { filter?: string } }>("/attempts/:id/review", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const attempt = await getOwnedAttempt(request.params.id, auth.user.userId);
    if (!attempt) return reply.code(404).send({ error: "attempt_not_found" });
    if (!["submitted", "scored", "analyzed"].includes(attempt.status)) {
      return reply.code(409).send({ error: "attempt_not_submitted" });
    }

    try {
      await ensureResult(attempt.id, auth.user.userId);
    } catch (error) {
      if (error instanceof Error && error.message === "scoring_configuration_missing") {
        return reply.code(409).send({ error: "scoring_configuration_missing" });
      }
      throw error;
    }

    const filter = request.query.filter && FILTERS.has(request.query.filter)
      ? request.query.filter
      : "all";

    const db = createDatabase();
    const rows = await db.select({
      examQuestionId: schema.examQuestions.id,
      order: schema.examQuestions.order,
      questionVersion: schema.examQuestions.questionVersion,
      content: schema.examQuestions.contentSnapshot,
      choices: schema.examQuestions.choicesSnapshot,
      correctChoice: schema.examQuestions.correctChoiceSnapshot,
      marks: schema.examQuestions.marksSnapshot,
      explanation: schema.examQuestions.explanationSnapshot,
      curriculum: schema.examQuestions.curriculumSnapshot,
      selectedChoice: schema.attemptAnswers.selectedChoice,
      flagged: schema.attemptAnswers.flagged,
      timeSpentSeconds: schema.attemptAnswers.timeSpentSeconds,
      correct: schema.attemptAnswers.correct,
      awardedScore: schema.attemptAnswers.awardedScore
    })
      .from(schema.examQuestions)
      .leftJoin(
        schema.attemptAnswers,
        and(
          eq(schema.attemptAnswers.examQuestionId, schema.examQuestions.id),
          eq(schema.attemptAnswers.attemptId, attempt.id)
        )
      )
      .where(eq(schema.examQuestions.examId, attempt.examId))
      .orderBy(asc(schema.examQuestions.order));

    const items = rows.map((row) => ({
      ...row,
      selectedChoice: row.selectedChoice ?? null,
      flagged: row.flagged ?? false,
      timeSpentSeconds: row.timeSpentSeconds ?? 0,
      correct: row.selectedChoice == null ? null : row.correct,
      awardedScore: row.awardedScore == null ? 0 : Number(row.awardedScore)
    })).filter((row) => {
      if (filter === "incorrect") return row.correct === false;
      if (filter === "correct") return row.correct === true;
      if (filter === "unanswered") return row.selectedChoice == null;
      if (filter === "flagged") return row.flagged;
      return true;
    });

    return {
      attempt: {
        id: attempt.id,
        title: attempt.examTitle,
        mode: attempt.examMode,
        status: attempt.status
      },
      filter,
      items
    };
  });

  app.get("/attempts/completed", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const db = createDatabase();
    const rows = await db.select({
      attemptId: schema.examAttempts.id,
      status: schema.examAttempts.status,
      submittedAt: schema.examAttempts.submittedAt,
      title: schema.exams.title,
      mode: schema.exams.mode,
      questionCount: schema.exams.questionCount,
      score: schema.attemptResults.score,
      maxScore: schema.attemptResults.maxScore,
      percentage: schema.attemptResults.percentage,
      correct: schema.attemptResults.correctCount,
      incorrect: schema.attemptResults.incorrectCount,
      unanswered: schema.attemptResults.unansweredCount,
      totalTimeSeconds: schema.attemptResults.totalTimeSeconds
    })
      .from(schema.examAttempts)
      .innerJoin(schema.exams, eq(schema.examAttempts.examId, schema.exams.id))
      .innerJoin(schema.attemptResults, eq(schema.attemptResults.attemptId, schema.examAttempts.id))
      .where(eq(schema.examAttempts.userId, auth.user.userId))
      .orderBy(desc(schema.examAttempts.submittedAt))
      .limit(50);

    return {
      items: rows.map((row) => ({
        ...row,
        score: Number(row.score),
        maxScore: Number(row.maxScore),
        percentage: Number(row.percentage)
      }))
    };
  });
};
