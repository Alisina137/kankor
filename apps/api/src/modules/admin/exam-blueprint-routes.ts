import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { desc, eq } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { requireAdmin } from "../../common/admin-auth.js";
import { parseScoringRules } from "../exams/service.js";

type BodyRequest = FastifyRequest<{ Body: Record<string, unknown> }>;

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function optionalPositiveInt(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
function criteriaValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export const adminExamBlueprintRoutes: FastifyPluginAsync = async (app) => {
  app.get("/exam-blueprints", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const db = createDatabase();
    return {
      items: await db.select().from(schema.examBlueprints)
        .orderBy(desc(schema.examBlueprints.effectiveYear), desc(schema.examBlueprints.updatedAt))
    };
  });

  app.post("/exam-blueprints", async (request: BodyRequest, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const code = stringValue(request.body.code).toLowerCase();
    const name = stringValue(request.body.name);
    const questionCount = Number(request.body.questionCount);
    const durationSeconds = optionalPositiveInt(request.body.durationSeconds);
    const effectiveYear = optionalPositiveInt(request.body.effectiveYear);
    const active = Boolean(request.body.active);
    const scoringRules = parseScoringRules(request.body.scoringRules);

    if (!code || !name || !Number.isInteger(questionCount) || questionCount < 1 || questionCount > 160) {
      return reply.code(400).send({ error: "invalid_exam_blueprint" });
    }
    if (request.body.durationSeconds != null && durationSeconds == null) {
      return reply.code(400).send({ error: "invalid_duration" });
    }
    if (!scoringRules) return reply.code(400).send({ error: "invalid_scoring_rules" });

    const db = createDatabase();
    if (active) {
      await db.update(schema.examBlueprints)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(schema.examBlueprints.mode, "full_kankor"));
    }

    const [item] = await db.insert(schema.examBlueprints).values({
      code,
      name,
      mode: "full_kankor",
      effectiveYear,
      questionCount,
      durationSeconds,
      criteria: criteriaValue(request.body.criteria),
      scoringRules,
      active,
      createdBy: admin.user.userId,
      updatedBy: admin.user.userId
    }).returning();

    return reply.code(201).send({ item });
  });

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>("/exam-blueprints/:id", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const db = createDatabase();
    const rows = await db.select().from(schema.examBlueprints)
      .where(eq(schema.examBlueprints.id, request.params.id))
      .limit(1);
    if (!rows[0]) return reply.code(404).send({ error: "exam_blueprint_not_found" });

    const values: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: admin.user.userId
    };

    if ("code" in request.body) values.code = stringValue(request.body.code).toLowerCase();
    if ("name" in request.body) values.name = stringValue(request.body.name);
    if ("effectiveYear" in request.body) values.effectiveYear = optionalPositiveInt(request.body.effectiveYear);
    if ("questionCount" in request.body) {
      const count = Number(request.body.questionCount);
      if (!Number.isInteger(count) || count < 1 || count > 160) {
        return reply.code(400).send({ error: "invalid_question_count" });
      }
      values.questionCount = count;
    }
    if ("durationSeconds" in request.body) {
      const duration = optionalPositiveInt(request.body.durationSeconds);
      if (request.body.durationSeconds != null && request.body.durationSeconds !== "" && duration == null) {
        return reply.code(400).send({ error: "invalid_duration" });
      }
      values.durationSeconds = duration;
    }
    if ("criteria" in request.body) values.criteria = criteriaValue(request.body.criteria);
    if ("scoringRules" in request.body) {
      const scoringRules = parseScoringRules(request.body.scoringRules);
      if (!scoringRules) return reply.code(400).send({ error: "invalid_scoring_rules" });
      values.scoringRules = scoringRules;
    }

    if ("active" in request.body) {
      const active = Boolean(request.body.active);
      values.active = active;
      if (active) {
        const effectiveScoring = "scoringRules" in request.body
          ? parseScoringRules(request.body.scoringRules)
          : parseScoringRules(rows[0].scoringRules);
        if (!effectiveScoring) return reply.code(400).send({ error: "scoring_rules_required" });
        await db.update(schema.examBlueprints)
          .set({ active: false, updatedAt: new Date() })
          .where(eq(schema.examBlueprints.mode, "full_kankor"));
      }
    }

    const [item] = await db.update(schema.examBlueprints)
      .set(values as typeof schema.examBlueprints.$inferInsert)
      .where(eq(schema.examBlueprints.id, request.params.id))
      .returning();

    return { item };
  });
};
