import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { desc, eq } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { requireAdmin } from "../../common/admin-auth.js";

type BodyRequest = FastifyRequest<{ Body: Record<string, unknown> }>;
const CHOICES = new Set(["A", "B", "C", "D"]);
const STATUSES = new Set(["draft", "review", "approved", "published", "deprecated"]);
const DIFFICULTIES = new Set(["easy", "medium", "hard", "expert"]);
const LANGUAGES = new Set(["fa", "ps", "en"]);

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function optionalString(value: unknown) {
  const result = stringValue(value);
  return result || null;
}
function validChoices(value: unknown): value is Array<{ key: "A" | "B" | "C" | "D"; text: string }> {
  return Array.isArray(value)
    && value.length === 4
    && value.every((choice) =>
      choice
      && typeof choice === "object"
      && CHOICES.has(String((choice as Record<string, unknown>).key))
      && Boolean(stringValue((choice as Record<string, unknown>).text))
    )
    && new Set(value.map((choice) => choice.key)).size === 4;
}

async function tracedQuestion(id: string) {
  const db = createDatabase();
  const rows = await db.select({
    id: schema.questions.id,
    topicId: schema.questions.topicId,
    language: schema.questions.language,
    questionType: schema.questions.questionType,
    content: schema.questions.content,
    choices: schema.questions.choices,
    correctChoice: schema.questions.correctChoice,
    shortExplanation: schema.questions.shortExplanation,
    detailedExplanation: schema.questions.detailedExplanation,
    workedSolution: schema.questions.workedSolution,
    difficulty: schema.questions.difficulty,
    marks: schema.questions.marks,
    sourceType: schema.questions.sourceType,
    sourceMetadata: schema.questions.sourceMetadata,
    verificationStatus: schema.questions.verificationStatus,
    version: schema.questions.version,
    topic: { id: schema.topics.id, titleFa: schema.topics.titleFa, titlePs: schema.topics.titlePs },
    chapter: { id: schema.chapters.id, number: schema.chapters.number, titleFa: schema.chapters.titleFa, titlePs: schema.chapters.titlePs },
    book: { id: schema.books.id, code: schema.books.code, titleFa: schema.books.titleFa, titlePs: schema.books.titlePs },
    grade: { id: schema.grades.id, number: schema.grades.number, nameFa: schema.grades.nameFa, namePs: schema.grades.namePs },
    subject: { id: schema.subjects.id, code: schema.subjects.code, nameFa: schema.subjects.nameFa, namePs: schema.subjects.namePs }
  }).from(schema.questions)
    .innerJoin(schema.topics, eq(schema.questions.topicId, schema.topics.id))
    .innerJoin(schema.chapters, eq(schema.topics.chapterId, schema.chapters.id))
    .innerJoin(schema.books, eq(schema.chapters.bookId, schema.books.id))
    .innerJoin(schema.grades, eq(schema.books.gradeId, schema.grades.id))
    .innerJoin(schema.subjects, eq(schema.books.subjectId, schema.subjects.id))
    .where(eq(schema.questions.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export const adminQuestionRoutes: FastifyPluginAsync = async (app) => {
  app.get("/questions", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const db = createDatabase();
    const items = await db.select({
      id: schema.questions.id,
      content: schema.questions.content,
      language: schema.questions.language,
      difficulty: schema.questions.difficulty,
      verificationStatus: schema.questions.verificationStatus,
      version: schema.questions.version,
      updatedAt: schema.questions.updatedAt
    }).from(schema.questions).orderBy(desc(schema.questions.updatedAt));
    return { items };
  });

  app.get<{ Params: { id: string } }>("/questions/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const question = await tracedQuestion(request.params.id);
    if (!question) return reply.code(404).send({ error: "question_not_found" });

    const db = createDatabase();
    const translations = await db.select().from(schema.questionTranslations)
      .where(eq(schema.questionTranslations.questionId, request.params.id));

    return { question, translations };
  });

  app.post("/questions", async (request: BodyRequest, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const topicId = stringValue(request.body.topicId);
    const language = stringValue(request.body.language) || "fa";
    const content = stringValue(request.body.content);
    const choices = request.body.choices;
    const correctChoice = stringValue(request.body.correctChoice).toUpperCase();
    const difficulty = stringValue(request.body.difficulty) || "medium";

    if (
      !topicId || !content || !validChoices(choices) || !CHOICES.has(correctChoice)
      || !LANGUAGES.has(language) || !DIFFICULTIES.has(difficulty)
    ) {
      return reply.code(400).send({ error: "invalid_question" });
    }

    const db = createDatabase();
    const topic = await db.select({ id: schema.topics.id }).from(schema.topics)
      .where(eq(schema.topics.id, topicId)).limit(1);
    if (!topic[0]) return reply.code(400).send({ error: "invalid_topic" });

    const [inserted] = await db.insert(schema.questions).values({
      topicId,
      language,
      questionType: "single_choice",
      content,
      choices,
      correctChoice,
      shortExplanation: optionalString(request.body.shortExplanation),
      detailedExplanation: optionalString(request.body.detailedExplanation),
      workedSolution: optionalString(request.body.workedSolution),
      difficulty,
      marks: String(Number(request.body.marks ?? 1)),
      sourceType: stringValue(request.body.sourceType) || "editorial",
      sourceMetadata: request.body.sourceMetadata && typeof request.body.sourceMetadata === "object"
        ? request.body.sourceMetadata as Record<string, unknown>
        : {},
      verificationStatus: "draft",
      createdBy: admin.user.userId,
      updatedBy: admin.user.userId
    }).returning({ id: schema.questions.id });

    return reply.code(201).send({ question: await tracedQuestion(inserted.id) });
  });

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>("/questions/:id", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const db = createDatabase();
    const current = await db.select().from(schema.questions)
      .where(eq(schema.questions.id, request.params.id)).limit(1);
    if (!current[0]) return reply.code(404).send({ error: "question_not_found" });

    const values: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: admin.user.userId,
      version: current[0].version + 1
    };

    if ("topicId" in request.body) values.topicId = stringValue(request.body.topicId);
    if ("language" in request.body) {
      const language = stringValue(request.body.language);
      if (!LANGUAGES.has(language)) return reply.code(400).send({ error: "invalid_language" });
      values.language = language;
    }
    if ("content" in request.body) {
      const content = stringValue(request.body.content);
      if (!content) return reply.code(400).send({ error: "invalid_content" });
      values.content = content;
    }
    if ("choices" in request.body) {
      if (!validChoices(request.body.choices)) return reply.code(400).send({ error: "invalid_choices" });
      values.choices = request.body.choices;
    }
    if ("correctChoice" in request.body) {
      const answer = stringValue(request.body.correctChoice).toUpperCase();
      if (!CHOICES.has(answer)) return reply.code(400).send({ error: "invalid_correct_choice" });
      values.correctChoice = answer;
    }
    if ("difficulty" in request.body) {
      const difficulty = stringValue(request.body.difficulty);
      if (!DIFFICULTIES.has(difficulty)) return reply.code(400).send({ error: "invalid_difficulty" });
      values.difficulty = difficulty;
    }
    if ("verificationStatus" in request.body) {
      const status = stringValue(request.body.verificationStatus);
      if (!STATUSES.has(status)) return reply.code(400).send({ error: "invalid_verification_status" });
      values.verificationStatus = status;
    }
    if ("shortExplanation" in request.body) values.shortExplanation = optionalString(request.body.shortExplanation);
    if ("detailedExplanation" in request.body) values.detailedExplanation = optionalString(request.body.detailedExplanation);
    if ("workedSolution" in request.body) values.workedSolution = optionalString(request.body.workedSolution);
    if ("marks" in request.body) values.marks = String(Number(request.body.marks));
    if ("sourceType" in request.body) values.sourceType = stringValue(request.body.sourceType);
    if ("sourceMetadata" in request.body && request.body.sourceMetadata && typeof request.body.sourceMetadata === "object") {
      values.sourceMetadata = request.body.sourceMetadata;
    }

    await db.update(schema.questions).set(values)
      .where(eq(schema.questions.id, request.params.id));

    return { question: await tracedQuestion(request.params.id) };
  });

  app.put<{ Params: { id: string; language: string }; Body: Record<string, unknown> }>("/questions/:id/translations/:language", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const language = request.params.language;
    if (!LANGUAGES.has(language)) return reply.code(400).send({ error: "invalid_language" });

    const content = stringValue(request.body.content);
    const choices = request.body.choices;
    if (!content || !validChoices(choices)) return reply.code(400).send({ error: "invalid_translation" });

    const db = createDatabase();
    const rows = await db.select({ id: schema.questions.id }).from(schema.questions)
      .where(eq(schema.questions.id, request.params.id)).limit(1);
    if (!rows[0]) return reply.code(404).send({ error: "question_not_found" });

    const existing = await db.select({ id: schema.questionTranslations.id }).from(schema.questionTranslations)
      .where(eq(schema.questionTranslations.questionId, request.params.id));

    const sameLanguage = await db.select({ id: schema.questionTranslations.id }).from(schema.questionTranslations)
      .where(eq(schema.questionTranslations.questionId, request.params.id));

    const matching = existing.find(() => true);
    const values = {
      questionId: request.params.id,
      language,
      content,
      choices,
      shortExplanation: optionalString(request.body.shortExplanation),
      detailedExplanation: optionalString(request.body.detailedExplanation),
      workedSolution: optionalString(request.body.workedSolution),
      updatedAt: new Date()
    };

    if (matching && sameLanguage.length) {
      const found = await db.select({ id: schema.questionTranslations.id }).from(schema.questionTranslations)
        .where(eq(schema.questionTranslations.questionId, request.params.id));
      const candidate = found[0];
      if (candidate) {
        await db.update(schema.questionTranslations).set(values)
          .where(eq(schema.questionTranslations.id, candidate.id));
      }
    } else {
      await db.insert(schema.questionTranslations).values(values);
    }

    return { saved: true };
  });
};
