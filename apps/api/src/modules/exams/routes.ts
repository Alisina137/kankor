import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { requireUser } from "../../common/user-auth.js";
import { createGeneratedExam, parseScoringRules, PRACTICE_SCORING_RULES, type ExamCriteria, type ScoringRules } from "./service.js";

type BodyRequest = FastifyRequest<{ Body: Record<string, unknown> }>;

const MODES = new Set(["full_kankor", "subject", "book", "chapter", "topic", "custom"]);
const LANGUAGES = new Set(["fa", "ps", "en"]);
const DIFFICULTIES = new Set(["easy", "medium", "hard", "expert"]);

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}
function optionalPositiveInt(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
function criteriaFromBody(body: Record<string, unknown>): ExamCriteria {
  return {
    subjectIds: strings(body.subjectIds),
    gradeIds: strings(body.gradeIds),
    bookIds: strings(body.bookIds),
    chapterIds: strings(body.chapterIds),
    topicIds: strings(body.topicIds),
    difficulties: strings(body.difficulties).filter((item) => DIFFICULTIES.has(item)),
    language: typeof body.language === "string" && LANGUAGES.has(body.language) ? body.language : undefined
  };
}

export const examRoutes: FastifyPluginAsync = async (app) => {
  app.get("/exams/active-blueprint", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const db = createDatabase();
    const rows = await db.select({
      id: schema.examBlueprints.id,
      code: schema.examBlueprints.code,
      name: schema.examBlueprints.name,
      effectiveYear: schema.examBlueprints.effectiveYear,
      questionCount: schema.examBlueprints.questionCount,
      durationSeconds: schema.examBlueprints.durationSeconds,
      scoringConfigured: schema.examBlueprints.scoringRules
    })
      .from(schema.examBlueprints)
      .where(and(
        eq(schema.examBlueprints.active, true),
        eq(schema.examBlueprints.mode, "full_kankor")
      ))
      .orderBy(desc(schema.examBlueprints.effectiveYear), desc(schema.examBlueprints.updatedAt))
      .limit(1);

    return { blueprint: rows[0] ? { ...rows[0], scoringConfigured: Boolean(rows[0].scoringConfigured) } : null };
  });

  app.post("/exams/generate", async (request: BodyRequest, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const requestedMode = typeof request.body.mode === "string" ? request.body.mode : "custom";
    if (!MODES.has(requestedMode)) return reply.code(400).send({ error: "invalid_exam_mode" });

    const language = typeof request.body.language === "string" && LANGUAGES.has(request.body.language)
      ? request.body.language
      : auth.user.preferredLanguage;

    let questionCount: number;
    let durationSeconds: number | null;
    let criteria: ExamCriteria;
    let blueprintId: string | null = null;
    let scoringRules: ScoringRules;
    let title = typeof request.body.title === "string" && request.body.title.trim()
      ? request.body.title.trim()
      : "KankorPrep Exam";

    if (requestedMode === "full_kankor") {
      const db = createDatabase();
      const rows = await db.select().from(schema.examBlueprints)
        .where(and(
          eq(schema.examBlueprints.active, true),
          eq(schema.examBlueprints.mode, "full_kankor")
        ))
        .orderBy(desc(schema.examBlueprints.effectiveYear), desc(schema.examBlueprints.updatedAt))
        .limit(1);

      const blueprint = rows[0];
      if (!blueprint) return reply.code(409).send({ error: "active_blueprint_required" });

      questionCount = blueprint.questionCount;
      durationSeconds = blueprint.durationSeconds;
      criteria = { ...(blueprint.criteria as ExamCriteria), language };
      const parsedScoring = parseScoringRules(blueprint.scoringRules);
      if (!parsedScoring) return reply.code(409).send({ error: "scoring_rules_required" });
      scoringRules = parsedScoring;
      blueprintId = blueprint.id;
      title = blueprint.name;
    } else {
      const count = Number(request.body.questionCount ?? 20);
      if (!Number.isInteger(count) || count < 1 || count > 160) {
        return reply.code(400).send({ error: "invalid_question_count" });
      }
      questionCount = count;

      const rawDuration = request.body.durationSeconds;
      durationSeconds = rawDuration == null ? null : optionalPositiveInt(rawDuration);
      if (rawDuration != null && durationSeconds == null) {
        return reply.code(400).send({ error: "invalid_duration" });
      }

      criteria = { ...criteriaFromBody(request.body), language };
      scoringRules = PRACTICE_SCORING_RULES;

      if (requestedMode === "subject" && !criteria.subjectIds?.length) return reply.code(400).send({ error: "subject_required" });
      if (requestedMode === "book" && !criteria.bookIds?.length) return reply.code(400).send({ error: "book_required" });
      if (requestedMode === "chapter" && !criteria.chapterIds?.length) return reply.code(400).send({ error: "chapter_required" });
      if (requestedMode === "topic" && !criteria.topicIds?.length) return reply.code(400).send({ error: "topic_required" });
    }

    const generated = await createGeneratedExam({
      mode: requestedMode,
      title,
      language,
      questionCount,
      durationSeconds,
      blueprintId,
      criteria,
      scoringRules,
      userId: auth.user.userId
    });

    if (!generated.ok) {
      return reply.code(409).send({
        error: generated.error,
        requested: generated.requested,
        available: generated.available
      });
    }

    return reply.code(201).send({
      exam: {
        id: generated.examId,
        title,
        mode: requestedMode,
        questionCount: generated.questionCount,
        durationSeconds
      }
    });
  });
};
