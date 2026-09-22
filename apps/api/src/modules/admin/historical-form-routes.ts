import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { requireAdmin } from "../../common/admin-auth.js";
import { parseScoringRules } from "../exams/service.js";

type BodyRequest = FastifyRequest<{ Body: Record<string, unknown> }>;
const LANGUAGES = new Set(["fa", "ps", "en"]);
const SOURCE_STATUSES = new Set(["official", "verified_secondary", "unverified"]);
const VERIFICATION_STATUSES = new Set(["draft", "review", "approved", "published", "deprecated"]);
const ORDER_STATUSES = new Set(["confirmed", "uncertain"]);

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function optionalString(value: unknown) {
  const valueString = stringValue(value);
  return valueString || null;
}
function optionalPositiveInt(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export const adminHistoricalFormRoutes: FastifyPluginAsync = async (app) => {
  app.get("/historical-forms", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const db = createDatabase();
    const items = await db.select().from(schema.historicalForms)
      .orderBy(desc(schema.historicalForms.year), desc(schema.historicalForms.updatedAt));
    return { items };
  });

  app.get<{ Params: { id: string } }>("/historical-forms/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const db = createDatabase();
    const forms = await db.select().from(schema.historicalForms)
      .where(eq(schema.historicalForms.id, request.params.id)).limit(1);
    if (!forms[0]) return reply.code(404).send({ error: "historical_form_not_found" });

    const questions = await db.select({
      id: schema.historicalFormQuestions.id,
      order: schema.historicalFormQuestions.order,
      questionId: schema.historicalFormQuestions.questionId,
      sourceMetadata: schema.historicalFormQuestions.sourceMetadata,
      historicalScoringMetadata: schema.historicalFormQuestions.historicalScoringMetadata,
      content: schema.questions.content,
      language: schema.questions.language,
      verificationStatus: schema.questions.verificationStatus
    }).from(schema.historicalFormQuestions)
      .innerJoin(schema.questions, eq(schema.historicalFormQuestions.questionId, schema.questions.id))
      .where(eq(schema.historicalFormQuestions.historicalFormId, request.params.id))
      .orderBy(asc(schema.historicalFormQuestions.order));

    return { form: forms[0], questions };
  });

  app.post("/historical-forms", async (request: BodyRequest, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const archiveCode = stringValue(request.body.archiveCode).toLowerCase();
    const year = Number(request.body.year);
    const language = stringValue(request.body.language) || "fa";
    const title = stringValue(request.body.title);
    const sourceStatus = stringValue(request.body.sourceStatus) || "unverified";
    const originalOrderStatus = stringValue(request.body.originalOrderStatus) || "uncertain";
    const durationSeconds = optionalPositiveInt(request.body.durationSeconds);
    const scoringRules = request.body.scoringRules == null ? null : parseScoringRules(request.body.scoringRules);

    if (
      !archiveCode || !title || !Number.isInteger(year) || year <= 1300 || year >= 1600
      || !LANGUAGES.has(language)
      || !SOURCE_STATUSES.has(sourceStatus)
      || !ORDER_STATUSES.has(originalOrderStatus)
    ) {
      return reply.code(400).send({ error: "invalid_historical_form" });
    }
    if (request.body.durationSeconds != null && request.body.durationSeconds !== "" && durationSeconds == null) {
      return reply.code(400).send({ error: "invalid_duration" });
    }
    if (request.body.scoringRules != null && !scoringRules) {
      return reply.code(400).send({ error: "invalid_scoring_rules" });
    }

    const db = createDatabase();
    const [item] = await db.insert(schema.historicalForms).values({
      archiveCode,
      year,
      cycle: optionalString(request.body.cycle),
      province: optionalString(request.body.province),
      round: optionalString(request.body.round),
      formCode: optionalString(request.body.formCode),
      language,
      title,
      sourceReference: optionalString(request.body.sourceReference),
      sourceStatus,
      sourceMetadata: objectValue(request.body.sourceMetadata),
      verificationStatus: "draft",
      originalOrderStatus,
      questionCount: 0,
      durationSeconds,
      scoringRules,
      createdBy: admin.user.userId,
      updatedBy: admin.user.userId
    }).returning();

    return reply.code(201).send({ item });
  });

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>("/historical-forms/:id", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const db = createDatabase();

    const forms = await db.select().from(schema.historicalForms)
      .where(eq(schema.historicalForms.id, request.params.id)).limit(1);
    const current = forms[0];
    if (!current) return reply.code(404).send({ error: "historical_form_not_found" });

    const values: Record<string, unknown> = { updatedAt: new Date(), updatedBy: admin.user.userId };

    if ("archiveCode" in request.body) values.archiveCode = stringValue(request.body.archiveCode).toLowerCase();
    if ("year" in request.body) {
      const year = Number(request.body.year);
      if (!Number.isInteger(year) || year <= 1300 || year >= 1600) return reply.code(400).send({ error: "invalid_year" });
      values.year = year;
    }
    if ("cycle" in request.body) values.cycle = optionalString(request.body.cycle);
    if ("province" in request.body) values.province = optionalString(request.body.province);
    if ("round" in request.body) values.round = optionalString(request.body.round);
    if ("formCode" in request.body) values.formCode = optionalString(request.body.formCode);
    if ("language" in request.body) {
      const language = stringValue(request.body.language);
      if (!LANGUAGES.has(language)) return reply.code(400).send({ error: "invalid_language" });
      values.language = language;
    }
    if ("title" in request.body) {
      const title = stringValue(request.body.title);
      if (!title) return reply.code(400).send({ error: "invalid_title" });
      values.title = title;
    }
    if ("sourceReference" in request.body) values.sourceReference = optionalString(request.body.sourceReference);
    if ("sourceStatus" in request.body) {
      const sourceStatus = stringValue(request.body.sourceStatus);
      if (!SOURCE_STATUSES.has(sourceStatus)) return reply.code(400).send({ error: "invalid_source_status" });
      values.sourceStatus = sourceStatus;
    }
    if ("sourceMetadata" in request.body) values.sourceMetadata = objectValue(request.body.sourceMetadata);
    if ("originalOrderStatus" in request.body) {
      const originalOrderStatus = stringValue(request.body.originalOrderStatus);
      if (!ORDER_STATUSES.has(originalOrderStatus)) return reply.code(400).send({ error: "invalid_order_status" });
      values.originalOrderStatus = originalOrderStatus;
    }
    if ("durationSeconds" in request.body) {
      const durationSeconds = optionalPositiveInt(request.body.durationSeconds);
      if (request.body.durationSeconds != null && request.body.durationSeconds !== "" && durationSeconds == null) {
        return reply.code(400).send({ error: "invalid_duration" });
      }
      values.durationSeconds = durationSeconds;
    }
    if ("scoringRules" in request.body) {
      const scoringRules = request.body.scoringRules == null ? null : parseScoringRules(request.body.scoringRules);
      if (request.body.scoringRules != null && !scoringRules) return reply.code(400).send({ error: "invalid_scoring_rules" });
      values.scoringRules = scoringRules;
    }

    if ("verificationStatus" in request.body) {
      const status = stringValue(request.body.verificationStatus);
      if (!VERIFICATION_STATUSES.has(status)) return reply.code(400).send({ error: "invalid_verification_status" });

      if (status === "published") {
        const relations = await db.select({ order: schema.historicalFormQuestions.order })
          .from(schema.historicalFormQuestions)
          .where(eq(schema.historicalFormQuestions.historicalFormId, current.id))
          .orderBy(asc(schema.historicalFormQuestions.order));

        if (!relations.length) return reply.code(409).send({ error: "historical_form_has_no_questions" });
        const contiguous = relations.every((item, index) => item.order === index + 1);
        if (!contiguous) return reply.code(409).send({ error: "historical_form_order_not_contiguous" });
        values.questionCount = relations.length;
      }
      values.verificationStatus = status;
    }

    const [item] = await db.update(schema.historicalForms)
      .set(values as typeof schema.historicalForms.$inferInsert)
      .where(eq(schema.historicalForms.id, current.id))
      .returning();

    return { item };
  });

  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>("/historical-forms/:id/questions", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const db = createDatabase();

    const forms = await db.select().from(schema.historicalForms)
      .where(eq(schema.historicalForms.id, request.params.id)).limit(1);
    const form = forms[0];
    if (!form) return reply.code(404).send({ error: "historical_form_not_found" });
    if (form.verificationStatus === "published") {
      return reply.code(409).send({ error: "published_historical_form_locked" });
    }

    const rawItems = Array.isArray(request.body.questions) ? request.body.questions : null;
    if (!rawItems || !rawItems.length || rawItems.length > 160) {
      return reply.code(400).send({ error: "invalid_historical_questions" });
    }

    const items = rawItems.map((raw, index) => {
      const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
      return {
        questionId: stringValue(item.questionId),
        order: Number(item.order ?? index + 1),
        sourceMetadata: objectValue(item.sourceMetadata),
        historicalScoringMetadata: objectValue(item.historicalScoringMetadata)
      };
    });

    if (items.some((item) => !item.questionId || !Number.isInteger(item.order) || item.order < 1 || item.order > 160)) {
      return reply.code(400).send({ error: "invalid_historical_questions" });
    }

    const orders = new Set(items.map((item) => item.order));
    if (orders.size !== items.length || !items.slice().sort((a,b) => a.order-b.order).every((item,index) => item.order === index + 1)) {
      return reply.code(400).send({ error: "historical_order_must_be_contiguous" });
    }

    const uniqueQuestionIds = [...new Set(items.map((item) => item.questionId))];
    const existingQuestions = await db.select({ id: schema.questions.id })
      .from(schema.questions)
      .where(inArray(schema.questions.id, uniqueQuestionIds));
    if (existingQuestions.length !== uniqueQuestionIds.length) {
      return reply.code(400).send({ error: "historical_question_not_found" });
    }

    await db.delete(schema.historicalFormQuestions)
      .where(eq(schema.historicalFormQuestions.historicalFormId, form.id));

    await db.insert(schema.historicalFormQuestions).values(items.map((item) => ({
      historicalFormId: form.id,
      questionId: item.questionId,
      order: item.order,
      sourceMetadata: item.sourceMetadata,
      historicalScoringMetadata: item.historicalScoringMetadata
    })));

    await db.update(schema.historicalForms).set({
      questionCount: items.length,
      updatedAt: new Date(),
      updatedBy: admin.user.userId
    }).where(eq(schema.historicalForms.id, form.id));

    return { saved: true, questionCount: items.length };
  });

  app.post<{ Params: { id: string }; Body: Record<string, unknown> }>("/historical-forms/:id/import", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const payload = objectValue(request.body);
    const questions = Array.isArray(payload.questions) ? payload.questions : [];
    if (!questions.length) return reply.code(400).send({ error: "import_questions_required" });

    request.body = { questions };
    const db = createDatabase();
    const forms = await db.select().from(schema.historicalForms)
      .where(eq(schema.historicalForms.id, request.params.id)).limit(1);
    const form = forms[0];
    if (!form) return reply.code(404).send({ error: "historical_form_not_found" });
    if (form.verificationStatus === "published") return reply.code(409).send({ error: "published_historical_form_locked" });

    const normalized = questions.map((raw, index) => {
      const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
      return {
        questionId: stringValue(item.questionId),
        order: Number(item.order ?? index + 1),
        sourceMetadata: objectValue(item.sourceMetadata),
        historicalScoringMetadata: objectValue(item.historicalScoringMetadata)
      };
    });
    if (normalized.some((item) => !item.questionId || !Number.isInteger(item.order))) {
      return reply.code(400).send({ error: "invalid_import_payload" });
    }
    const sorted = normalized.slice().sort((a,b) => a.order-b.order);
    if (!sorted.every((item,index) => item.order === index + 1)) {
      return reply.code(400).send({ error: "historical_order_must_be_contiguous" });
    }

    const uniqueIds = [...new Set(normalized.map((item) => item.questionId))];
    const existing = await db.select({ id: schema.questions.id }).from(schema.questions)
      .where(inArray(schema.questions.id, uniqueIds));
    if (existing.length !== uniqueIds.length) return reply.code(400).send({ error: "historical_question_not_found" });

    await db.transaction(async (tx) => {
      await tx.delete(schema.historicalFormQuestions).where(eq(schema.historicalFormQuestions.historicalFormId, form.id));
      await tx.insert(schema.historicalFormQuestions).values(normalized.map((item) => ({
        historicalFormId: form.id,
        questionId: item.questionId,
        order: item.order,
        sourceMetadata: item.sourceMetadata,
        historicalScoringMetadata: item.historicalScoringMetadata
      })));
      await tx.update(schema.historicalForms).set({
        questionCount: normalized.length,
        sourceMetadata: { ...form.sourceMetadata, importMetadata: objectValue(payload.importMetadata) },
        updatedAt: new Date(),
        updatedBy: admin.user.userId
      }).where(eq(schema.historicalForms.id, form.id));
    });

    return { imported: normalized.length };
  });
};
