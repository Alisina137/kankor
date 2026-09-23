import { and, desc, eq } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";

export const QUESTION_STATES = ["draft","review","approved","published","deprecated"] as const;

export function questionSnapshot(question: typeof schema.questions.$inferSelect) {
  return {
    topicId: question.topicId,
    language: question.language,
    questionType: question.questionType,
    content: question.content,
    choices: question.choices,
    correctChoice: question.correctChoice,
    shortExplanation: question.shortExplanation,
    detailedExplanation: question.detailedExplanation,
    workedSolution: question.workedSolution,
    difficulty: question.difficulty,
    marks: question.marks,
    sourceType: question.sourceType,
    sourceMetadata: question.sourceMetadata,
    verificationStatus: question.verificationStatus,
    version: question.version,
    supersedesQuestionId: question.supersedesQuestionId
  };
}

export async function writeAudit(input: {
  actorUserId: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}) {
  const db = createDatabase();
  await db.insert(schema.adminAuditLogs).values({
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    beforeSnapshot: input.before ?? null,
    afterSnapshot: input.after ?? null,
    metadata: input.metadata ?? {}
  });
}

export async function saveRevision(
  question: typeof schema.questions.$inferSelect,
  changeReason: string | null,
  changedBy: string | null
) {
  const db = createDatabase();
  await db.insert(schema.questionRevisions).values({
    questionId: question.id,
    version: question.version,
    snapshot: questionSnapshot(question),
    changeReason,
    changedBy
  }).onConflictDoNothing();
}

export function validLifecycleTransition(current: string, next: string) {
  if (current === next) return true;
  const allowed: Record<string, string[]> = {
    draft: ["review"],
    review: ["draft", "approved"],
    approved: ["review", "published"],
    published: ["deprecated"],
    deprecated: []
  };
  return allowed[current]?.includes(next) ?? false;
}

export function publishCriteria(question: typeof schema.questions.$inferSelect) {
  const choices = Array.isArray(question.choices) ? question.choices : [];
  const keys = new Set(choices.map((choice) => choice.key));
  const answerExists = choices.some((choice) => choice.key === question.correctChoice);
  const sourceMetadata = question.sourceMetadata && typeof question.sourceMetadata === "object"
    ? question.sourceMetadata as Record<string, unknown>
    : {};

  const renderingRequired = sourceMetadata.hasFormula === true || sourceMetadata.hasImage === true;
  const workedSolutionRequired = sourceMetadata.requiresWorkedSolution === true;
  const detailedExplanationRequired = sourceMetadata.requiresDetailedExplanation === true;

  const checks = {
    hasContent: Boolean(question.content.trim()),
    hasFourChoices: choices.length === 4 && keys.size === 4,
    correctChoiceExists: answerExists,
    hasCurriculumMapping: Boolean(question.topicId),
    hasSourceType: Boolean(question.sourceType),
    sourceLabeled: question.sourceType !== "official" || Object.keys(sourceMetadata).length > 0,
    shortExplanationRecommended: Boolean(question.shortExplanation?.trim()),
    detailedExplanationSatisfied: !detailedExplanationRequired || Boolean(question.detailedExplanation?.trim()),
    renderingValidated: !renderingRequired || sourceMetadata.renderingValidated === true,
    workedSolutionSatisfied: !workedSolutionRequired || Boolean(question.workedSolution?.trim())
  };

  const requiredChecks = [
    checks.hasContent,
    checks.hasFourChoices,
    checks.correctChoiceExists,
    checks.hasCurriculumMapping,
    checks.hasSourceType,
    checks.sourceLabeled,
    checks.detailedExplanationSatisfied,
    checks.renderingValidated,
    checks.workedSolutionSatisfied
  ];

  return {
    checks,
    passed: requiredChecks.every(Boolean)
  };
}

export async function latestReview(entityType: string, entityId: string) {
  const db = createDatabase();
  const rows = await db.select().from(schema.contentReviews)
    .where(and(
      eq(schema.contentReviews.entityType, entityType),
      eq(schema.contentReviews.entityId, entityId)
    ))
    .orderBy(desc(schema.contentReviews.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
