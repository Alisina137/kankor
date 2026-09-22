import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { requireUser } from "../../common/user-auth.js";
import { getOwnedAttempt } from "../exams/service.js";

type BodyRequest = FastifyRequest<{ Body: Record<string, unknown> }>;
const CHOICES = new Set(["A", "B", "C", "D"]);

function attemptSummary(questionCount: number, answers: Array<{ selectedChoice: string | null; flagged: boolean }>) {
  const answered = answers.filter((answer) => Boolean(answer.selectedChoice)).length;
  const flagged = answers.filter((answer) => answer.flagged).length;

  return {
    questionCount,
    answered,
    unanswered: Math.max(0, questionCount - answered),
    flagged
  };
}

async function attemptPayload(attemptId: string, userId: string) {
  const attempt = await getOwnedAttempt(attemptId, userId);
  if (!attempt) return null;

  const db = createDatabase();
  const [questions, answers] = await Promise.all([
    db.select({
      id: schema.examQuestions.id,
      order: schema.examQuestions.order,
      questionId: schema.examQuestions.questionId,
      questionVersion: schema.examQuestions.questionVersion,
      content: schema.examQuestions.contentSnapshot,
      choices: schema.examQuestions.choicesSnapshot,
      curriculum: schema.examQuestions.curriculumSnapshot
    })
      .from(schema.examQuestions)
      .where(eq(schema.examQuestions.examId, attempt.examId))
      .orderBy(asc(schema.examQuestions.order)),
    db.select({
      examQuestionId: schema.attemptAnswers.examQuestionId,
      selectedChoice: schema.attemptAnswers.selectedChoice,
      flagged: schema.attemptAnswers.flagged,
      timeSpentSeconds: schema.attemptAnswers.timeSpentSeconds,
      clientRevision: schema.attemptAnswers.clientRevision,
      savedAt: schema.attemptAnswers.savedAt
    })
      .from(schema.attemptAnswers)
      .where(eq(schema.attemptAnswers.attemptId, attempt.id))
  ]);

  const expiresAtMs = attempt.expiresAt?.getTime() ?? null;
  const remainingSeconds = expiresAtMs == null
    ? null
    : Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));

  return {
    attempt: {
      id: attempt.id,
      examId: attempt.examId,
      status: attempt.status,
      title: attempt.examTitle,
      mode: attempt.examMode,
      questionCount: attempt.questionCount,
      durationSeconds: attempt.durationSeconds,
      language: attempt.language,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      expiresAt: attempt.expiresAt,
      remainingSeconds,
      timeExpired: remainingSeconds === 0 && attempt.expiresAt != null,
      summary: attemptSummary(attempt.questionCount, answers)
    },
    questions,
    answers
  };
}

export const attemptRoutes: FastifyPluginAsync = async (app) => {
  app.post("/attempts", async (request: BodyRequest, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const examId = typeof request.body.examId === "string" ? request.body.examId : "";
    if (!examId) return reply.code(400).send({ error: "exam_id_required" });

    const db = createDatabase();
    const exams = await db.select()
      .from(schema.exams)
      .where(eq(schema.exams.id, examId))
      .limit(1);

    const exam = exams[0];
    if (!exam) return reply.code(404).send({ error: "exam_not_found" });

    if (exam.createdByUserId && exam.createdByUserId !== auth.user.userId) {
      return reply.code(403).send({ error: "exam_not_owned" });
    }

    const existing = await db.select({ id: schema.examAttempts.id })
      .from(schema.examAttempts)
      .where(and(
        eq(schema.examAttempts.userId, auth.user.userId),
        eq(schema.examAttempts.examId, exam.id),
        eq(schema.examAttempts.status, "in_progress")
      ))
      .orderBy(desc(schema.examAttempts.createdAt))
      .limit(1);

    if (existing[0]) {
      return reply.send(await attemptPayload(existing[0].id, auth.user.userId));
    }

    const startedAt = new Date();
    const expiresAt = exam.durationSeconds
      ? new Date(startedAt.getTime() + exam.durationSeconds * 1000)
      : null;

    const [created] = await db.insert(schema.examAttempts).values({
      userId: auth.user.userId,
      examId: exam.id,
      status: "in_progress",
      startedAt,
      expiresAt,
      configurationSnapshot: {
        examId: exam.id,
        mode: exam.mode,
        questionCount: exam.questionCount,
        durationSeconds: exam.durationSeconds,
        criteria: exam.criteriaSnapshot
      }
    }).returning({ id: schema.examAttempts.id });

    return reply.code(201).send(await attemptPayload(created.id, auth.user.userId));
  });

  app.get("/attempts/active", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const db = createDatabase();
    const rows = await db.select({ id: schema.examAttempts.id })
      .from(schema.examAttempts)
      .where(and(
        eq(schema.examAttempts.userId, auth.user.userId),
        eq(schema.examAttempts.status, "in_progress")
      ))
      .orderBy(desc(schema.examAttempts.updatedAt))
      .limit(1);

    if (!rows[0]) return { attempt: null };
    return attemptPayload(rows[0].id, auth.user.userId);
  });

  app.get<{ Params: { id: string } }>("/attempts/:id", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const payload = await attemptPayload(request.params.id, auth.user.userId);
    if (!payload) return reply.code(404).send({ error: "attempt_not_found" });

    return payload;
  });

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/attempts/:id/answers",
    async (request, reply) => {
      const auth = await requireUser(request, reply);
      if (!auth) return;

      const attempt = await getOwnedAttempt(request.params.id, auth.user.userId);
      if (!attempt) return reply.code(404).send({ error: "attempt_not_found" });

      if (attempt.status !== "in_progress") {
        return reply.code(409).send({ error: "attempt_locked" });
      }

      if (attempt.expiresAt && attempt.expiresAt.getTime() <= Date.now()) {
        return reply.code(409).send({ error: "attempt_time_expired" });
      }

      const incoming = Array.isArray(request.body.answers) ? request.body.answers : [];
      if (!incoming.length || incoming.length > 160) {
        return reply.code(400).send({ error: "invalid_answers_batch" });
      }

      const normalized = incoming.map((raw) => {
        const answer = raw && typeof raw === "object"
          ? raw as Record<string, unknown>
          : {};

        const examQuestionId = typeof answer.examQuestionId === "string"
          ? answer.examQuestionId
          : "";

        const selectedChoice = answer.selectedChoice == null
          ? null
          : String(answer.selectedChoice).toUpperCase();

        const flagged = Boolean(answer.flagged);
        const timeSpentSeconds = Math.max(0, Math.floor(Number(answer.timeSpentSeconds ?? 0)));
        const clientRevision = Math.max(0, Math.floor(Number(answer.clientRevision ?? 0)));

        return {
          examQuestionId,
          selectedChoice,
          flagged,
          timeSpentSeconds,
          clientRevision
        };
      });

      if (normalized.some((answer) =>
        !answer.examQuestionId
        || (answer.selectedChoice !== null && !CHOICES.has(answer.selectedChoice))
        || !Number.isFinite(answer.timeSpentSeconds)
        || !Number.isFinite(answer.clientRevision)
      )) {
        return reply.code(400).send({ error: "invalid_answer" });
      }

      const db = createDatabase();
      const questionIds = [...new Set(normalized.map((answer) => answer.examQuestionId))];

      const validQuestions = await db.select({ id: schema.examQuestions.id })
        .from(schema.examQuestions)
        .where(and(
          eq(schema.examQuestions.examId, attempt.examId),
          inArray(schema.examQuestions.id, questionIds)
        ));

      if (validQuestions.length !== questionIds.length) {
        return reply.code(400).send({ error: "question_not_in_attempt" });
      }

      for (const answer of normalized) {
        await db.execute(sql`
          INSERT INTO attempt_answers (
            id,
            attempt_id,
            exam_question_id,
            selected_choice,
            flagged,
            time_spent_seconds,
            client_revision,
            saved_at
          )
          VALUES (
            gen_random_uuid(),
            ${attempt.id},
            ${answer.examQuestionId},
            ${answer.selectedChoice},
            ${answer.flagged},
            ${answer.timeSpentSeconds},
            ${answer.clientRevision},
            now()
          )
          ON CONFLICT (attempt_id, exam_question_id)
          DO UPDATE SET
            selected_choice = EXCLUDED.selected_choice,
            flagged = EXCLUDED.flagged,
            time_spent_seconds = EXCLUDED.time_spent_seconds,
            client_revision = EXCLUDED.client_revision,
            saved_at = now()
          WHERE EXCLUDED.client_revision >= attempt_answers.client_revision
        `);
      }

      await db.update(schema.examAttempts)
        .set({ updatedAt: new Date() })
        .where(eq(schema.examAttempts.id, attempt.id));

      const saved = await db.select({
        examQuestionId: schema.attemptAnswers.examQuestionId,
        selectedChoice: schema.attemptAnswers.selectedChoice,
        flagged: schema.attemptAnswers.flagged,
        timeSpentSeconds: schema.attemptAnswers.timeSpentSeconds,
        clientRevision: schema.attemptAnswers.clientRevision,
        savedAt: schema.attemptAnswers.savedAt
      })
        .from(schema.attemptAnswers)
        .where(eq(schema.attemptAnswers.attemptId, attempt.id));

      return {
        saved,
        summary: attemptSummary(attempt.questionCount, saved)
      };
    }
  );

  app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/attempts/:id/submit",
    async (request, reply) => {
      const auth = await requireUser(request, reply);
      if (!auth) return;

      const attempt = await getOwnedAttempt(request.params.id, auth.user.userId);
      if (!attempt) return reply.code(404).send({ error: "attempt_not_found" });

      const db = createDatabase();

      if (["submitted", "scored", "analyzed"].includes(attempt.status)) {
        const payload = await attemptPayload(attempt.id, auth.user.userId);
        return { ...payload, alreadySubmitted: true };
      }

      if (!["created", "in_progress"].includes(attempt.status)) {
        return reply.code(409).send({ error: "attempt_cannot_submit" });
      }

      const submissionKey =
        typeof request.body?.submissionKey === "string" && request.body.submissionKey.trim()
          ? request.body.submissionKey.trim()
          : `attempt:${attempt.id}`;

      const keyCollision = await db.select({ id: schema.examAttempts.id })
        .from(schema.examAttempts)
        .where(and(
          eq(schema.examAttempts.userId, auth.user.userId),
          eq(schema.examAttempts.submissionKey, submissionKey)
        ))
        .limit(1);

      if (keyCollision[0] && keyCollision[0].id !== attempt.id) {
        return reply.code(409).send({ error: "submission_key_conflict" });
      }

      const submittedAt = new Date();

      await db.update(schema.examAttempts).set({
        status: "submitted",
        submittedAt,
        submissionKey,
        updatedAt: submittedAt
      }).where(eq(schema.examAttempts.id, attempt.id));

      const payload = await attemptPayload(attempt.id, auth.user.userId);

      return {
        ...payload,
        alreadySubmitted: false
      };
    }
  );
};
