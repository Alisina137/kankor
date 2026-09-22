import type { FastifyPluginAsync } from "fastify";
import { and, asc, desc, eq } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { requireUser } from "../../common/user-auth.js";
import { parseScoringRules, PRACTICE_SCORING_RULES } from "./service.js";
import { authorizeHistoricalStart, getEntitlementState, recordHistoricalStart } from "../billing/service.js";

export const historicalExamRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { year?: string; province?: string; round?: string; language?: string } }>("/exams/history", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const entitlement = await getEntitlementState(auth.user.userId);
    const db = createDatabase();
    const conditions = [eq(schema.historicalForms.verificationStatus, "published")];

    if (request.query.year) {
      const year = Number(request.query.year);
      if (Number.isInteger(year)) conditions.push(eq(schema.historicalForms.year, year));
    }
    if (request.query.province) conditions.push(eq(schema.historicalForms.province, request.query.province));
    if (request.query.round) conditions.push(eq(schema.historicalForms.round, request.query.round));
    if (request.query.language) conditions.push(eq(schema.historicalForms.language, request.query.language));

    const items = await db.select({
      id: schema.historicalForms.id,
      archiveCode: schema.historicalForms.archiveCode,
      year: schema.historicalForms.year,
      cycle: schema.historicalForms.cycle,
      province: schema.historicalForms.province,
      round: schema.historicalForms.round,
      formCode: schema.historicalForms.formCode,
      language: schema.historicalForms.language,
      title: schema.historicalForms.title,
      accessTier: schema.historicalForms.accessTier,
      sourceStatus: schema.historicalForms.sourceStatus,
      originalOrderStatus: schema.historicalForms.originalOrderStatus,
      questionCount: schema.historicalForms.questionCount,
      durationSeconds: schema.historicalForms.durationSeconds
    }).from(schema.historicalForms)
      .where(and(...conditions))
      .orderBy(desc(schema.historicalForms.year), asc(schema.historicalForms.province), asc(schema.historicalForms.formCode));

    return {
      items: items.map((item) => ({
        ...item,
        locked: entitlement.tier !== "premium" && item.accessTier === "premium"
      }))
    };
  });

  app.get<{ Params: { id: string } }>("/exams/history/:id", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const db = createDatabase();
    const rows = await db.select().from(schema.historicalForms)
      .where(and(
        eq(schema.historicalForms.id, request.params.id),
        eq(schema.historicalForms.verificationStatus, "published")
      )).limit(1);

    const form = rows[0];
    if (!form) return reply.code(404).send({ error: "historical_form_not_found" });

    const questions = await db.select({
      order: schema.historicalFormQuestions.order,
      sourceMetadata: schema.historicalFormQuestions.sourceMetadata,
      historicalScoringMetadata: schema.historicalFormQuestions.historicalScoringMetadata
    }).from(schema.historicalFormQuestions)
      .where(eq(schema.historicalFormQuestions.historicalFormId, form.id))
      .orderBy(asc(schema.historicalFormQuestions.order));

    return {
      form: {
        ...form,
        scoringConfigured: Boolean(parseScoringRules(form.scoringRules)),
        actualQuestionCount: questions.length
      },
      questions: questions.map((item) => ({
        order: item.order,
        sourceMetadata: item.sourceMetadata,
        historicalScoringMetadata: item.historicalScoringMetadata
      }))
    };
  });

  app.post<{ Params: { id: string } }>("/exams/history/:id/start", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const db = createDatabase();
    const forms = await db.select().from(schema.historicalForms)
      .where(and(
        eq(schema.historicalForms.id, request.params.id),
        eq(schema.historicalForms.verificationStatus, "published")
      )).limit(1);
    const form = forms[0];
    if (!form) return reply.code(404).send({ error: "historical_form_not_found" });

    const existing = await db.select({ attemptId: schema.examAttempts.id })
      .from(schema.examAttempts)
      .innerJoin(schema.exams, eq(schema.examAttempts.examId, schema.exams.id))
      .where(and(
        eq(schema.examAttempts.userId, auth.user.userId),
        eq(schema.examAttempts.status, "in_progress"),
        eq(schema.exams.historicalFormId, form.id)
      )).limit(1);
    if (existing[0]) return { attempt: { id: existing[0].attemptId, resumed: true } };

    const access = await authorizeHistoricalStart(auth.user.userId, form.accessTier);
    if (!access.allowed) {
      return reply.code(402).send({
        error: access.error,
        reason: access.reason,
        limit: "limit" in access ? access.limit : undefined,
        used: "used" in access ? access.used : undefined
      });
    }

    const rows = await db.select({
      questionId: schema.questions.id,
      version: schema.questions.version,
      content: schema.questions.content,
      choices: schema.questions.choices,
      correctChoice: schema.questions.correctChoice,
      shortExplanation: schema.questions.shortExplanation,
      detailedExplanation: schema.questions.detailedExplanation,
      workedSolution: schema.questions.workedSolution,
      questionSourceType: schema.questions.sourceType,
      questionSourceMetadata: schema.questions.sourceMetadata,
      marks: schema.questions.marks,
      difficulty: schema.questions.difficulty,
      language: schema.questions.language,
      order: schema.historicalFormQuestions.order,
      relationSource: schema.historicalFormQuestions.sourceMetadata,
      historicalScoring: schema.historicalFormQuestions.historicalScoringMetadata,
      subjectId: schema.subjects.id,
      subjectCode: schema.subjects.code,
      subjectFa: schema.subjects.nameFa,
      subjectPs: schema.subjects.namePs,
      gradeId: schema.grades.id,
      gradeNumber: schema.grades.number,
      bookId: schema.books.id,
      bookFa: schema.books.titleFa,
      bookPs: schema.books.titlePs,
      chapterId: schema.chapters.id,
      chapterNumber: schema.chapters.number,
      chapterFa: schema.chapters.titleFa,
      chapterPs: schema.chapters.titlePs,
      topicId: schema.topics.id,
      topicFa: schema.topics.titleFa,
      topicPs: schema.topics.titlePs
    }).from(schema.historicalFormQuestions)
      .innerJoin(schema.questions, eq(schema.historicalFormQuestions.questionId, schema.questions.id))
      .innerJoin(schema.topics, eq(schema.questions.topicId, schema.topics.id))
      .innerJoin(schema.chapters, eq(schema.topics.chapterId, schema.chapters.id))
      .innerJoin(schema.books, eq(schema.chapters.bookId, schema.books.id))
      .innerJoin(schema.grades, eq(schema.books.gradeId, schema.grades.id))
      .innerJoin(schema.subjects, eq(schema.books.subjectId, schema.subjects.id))
      .where(eq(schema.historicalFormQuestions.historicalFormId, form.id))
      .orderBy(asc(schema.historicalFormQuestions.order));

    if (!rows.length || rows.length !== form.questionCount) {
      return reply.code(409).send({ error: "historical_form_incomplete", expected: form.questionCount, actual: rows.length });
    }

    const configuredScoring = parseScoringRules(form.scoringRules);
    const scoringRules = configuredScoring ?? PRACTICE_SCORING_RULES;
    const provenance = {
      historicalFormId: form.id,
      archiveCode: form.archiveCode,
      year: form.year,
      cycle: form.cycle,
      province: form.province,
      round: form.round,
      formCode: form.formCode,
      sourceReference: form.sourceReference,
      sourceStatus: form.sourceStatus,
      originalOrderStatus: form.originalOrderStatus,
      scoringAuthority: configuredScoring ? "historical_configured" : "practice_fallback"
    };

    const [exam] = await db.insert(schema.exams).values({
      mode: "historical",
      title: form.title,
      language: form.language,
      historicalFormId: form.id,
      questionCount: rows.length,
      durationSeconds: form.durationSeconds,
      criteriaSnapshot: { authenticHistoricalForm: true, provenance },
      scoringSnapshot: scoringRules,
      createdByUserId: auth.user.userId
    }).returning({ id: schema.exams.id });

    await db.insert(schema.examQuestions).values(rows.map((question) => ({
      examId: exam.id,
      questionId: question.questionId,
      order: question.order,
      questionVersion: question.version,
      contentSnapshot: question.content,
      choicesSnapshot: question.choices,
      correctChoiceSnapshot: question.correctChoice,
      marksSnapshot: question.marks,
      explanationSnapshot: {
        shortExplanation: question.shortExplanation,
        detailedExplanation: question.detailedExplanation,
        workedSolution: question.workedSolution
      },
      curriculumSnapshot: {
        difficulty: question.difficulty,
        language: question.language,
        historical: {
          ...provenance,
          relationSourceMetadata: question.relationSource,
          questionSourceType: question.questionSourceType,
          questionSourceMetadata: question.questionSourceMetadata,
          historicalScoringMetadata: question.historicalScoring
        },
        subject: { id: question.subjectId, code: question.subjectCode, nameFa: question.subjectFa, namePs: question.subjectPs },
        grade: { id: question.gradeId, number: question.gradeNumber },
        book: { id: question.bookId, titleFa: question.bookFa, titlePs: question.bookPs },
        chapter: { id: question.chapterId, number: question.chapterNumber, titleFa: question.chapterFa, titlePs: question.chapterPs },
        topic: { id: question.topicId, titleFa: question.topicFa, titlePs: question.topicPs }
      }
    })));

    const startedAt = new Date();
    const expiresAt = form.durationSeconds ? new Date(startedAt.getTime() + form.durationSeconds * 1000) : null;
    const [attempt] = await db.insert(schema.examAttempts).values({
      userId: auth.user.userId,
      examId: exam.id,
      status: "in_progress",
      startedAt,
      expiresAt,
      configurationSnapshot: {
        examId: exam.id,
        mode: "historical",
        questionCount: rows.length,
        durationSeconds: form.durationSeconds,
        scoring: scoringRules,
        historical: provenance
      }
    }).returning({ id: schema.examAttempts.id });

    await recordHistoricalStart(auth.user.userId);

    return reply.code(201).send({
      attempt: { id: attempt.id, resumed: false },
      form: { id: form.id, title: form.title, questionCount: rows.length }
    });
  });
};
