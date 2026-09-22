import type { FastifyPluginAsync } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";

export const questionRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { topicId?: string; language?: string } }>("/questions", async (request) => {
    const db = createDatabase();
    const conditions = [eq(schema.questions.verificationStatus, "published")];
    if (request.query.topicId) conditions.push(eq(schema.questions.topicId, request.query.topicId));
    if (request.query.language) conditions.push(eq(schema.questions.language, request.query.language));

    const rows = await db.select({
      id: schema.questions.id,
      topicId: schema.questions.topicId,
      language: schema.questions.language,
      questionType: schema.questions.questionType,
      content: schema.questions.content,
      choices: schema.questions.choices,
      difficulty: schema.questions.difficulty,
      marks: schema.questions.marks,
      sourceType: schema.questions.sourceType,
      version: schema.questions.version
    }).from(schema.questions)
      .where(and(...conditions))
      .orderBy(asc(schema.questions.createdAt));

    return { items: rows };
  });

  app.get<{ Params: { id: string } }>("/questions/:id", async (request, reply) => {
    const db = createDatabase();

    const rows = await db.select({
      id: schema.questions.id,
      language: schema.questions.language,
      questionType: schema.questions.questionType,
      content: schema.questions.content,
      choices: schema.questions.choices,
      difficulty: schema.questions.difficulty,
      marks: schema.questions.marks,
      sourceType: schema.questions.sourceType,
      version: schema.questions.version,
      topic: {
        id: schema.topics.id,
        titleFa: schema.topics.titleFa,
        titlePs: schema.topics.titlePs
      },
      chapter: {
        id: schema.chapters.id,
        number: schema.chapters.number,
        titleFa: schema.chapters.titleFa,
        titlePs: schema.chapters.titlePs
      },
      book: {
        id: schema.books.id,
        titleFa: schema.books.titleFa,
        titlePs: schema.books.titlePs
      },
      grade: {
        id: schema.grades.id,
        number: schema.grades.number,
        nameFa: schema.grades.nameFa,
        namePs: schema.grades.namePs
      },
      subject: {
        id: schema.subjects.id,
        code: schema.subjects.code,
        nameFa: schema.subjects.nameFa,
        namePs: schema.subjects.namePs
      }
    }).from(schema.questions)
      .innerJoin(schema.topics, eq(schema.questions.topicId, schema.topics.id))
      .innerJoin(schema.chapters, eq(schema.topics.chapterId, schema.chapters.id))
      .innerJoin(schema.books, eq(schema.chapters.bookId, schema.books.id))
      .innerJoin(schema.grades, eq(schema.books.gradeId, schema.grades.id))
      .innerJoin(schema.subjects, eq(schema.books.subjectId, schema.subjects.id))
      .where(and(
        eq(schema.questions.id, request.params.id),
        eq(schema.questions.verificationStatus, "published")
      ))
      .limit(1);

    if (!rows[0]) return reply.code(404).send({ error: "question_not_found" });
    return { question: rows[0] };
  });
};
