import type { FastifyPluginAsync } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";

export const curriculumRoutes: FastifyPluginAsync = async (app) => {
  app.get("/grades", async () => {
    const db = createDatabase();
    return {
      items: await db.select().from(schema.grades)
        .where(eq(schema.grades.active, true))
        .orderBy(asc(schema.grades.sortOrder), asc(schema.grades.number))
    };
  });

  app.get<{ Querystring: { gradeId?: string } }>("/subjects", async (request) => {
    const db = createDatabase();
    const gradeId = request.query.gradeId;

    if (!gradeId) {
      return {
        items: await db.select().from(schema.subjects)
          .where(eq(schema.subjects.active, true))
          .orderBy(asc(schema.subjects.sortOrder), asc(schema.subjects.nameFa))
      };
    }

    return {
      items: await db.selectDistinct({
        id: schema.subjects.id,
        code: schema.subjects.code,
        nameFa: schema.subjects.nameFa,
        namePs: schema.subjects.namePs,
        active: schema.subjects.active,
        sortOrder: schema.subjects.sortOrder
      }).from(schema.subjects)
        .innerJoin(
          schema.books,
          and(
            eq(schema.books.subjectId, schema.subjects.id),
            eq(schema.books.gradeId, gradeId),
            eq(schema.books.active, true)
          )
        )
        .where(eq(schema.subjects.active, true))
        .orderBy(asc(schema.subjects.sortOrder), asc(schema.subjects.nameFa))
    };
  });

  app.get<{ Params: { id: string } }>("/subjects/:id", async (request, reply) => {
    const db = createDatabase();
    const rows = await db.select().from(schema.subjects)
      .where(and(eq(schema.subjects.id, request.params.id), eq(schema.subjects.active, true)))
      .limit(1);

    if (!rows[0]) return reply.code(404).send({ error: "subject_not_found" });
    return { subject: rows[0] };
  });

  app.get<{ Querystring: { subjectId?: string; gradeId?: string } }>("/books", async (request) => {
    const db = createDatabase();
    const conditions = [eq(schema.books.active, true)];
    if (request.query.subjectId) conditions.push(eq(schema.books.subjectId, request.query.subjectId));
    if (request.query.gradeId) conditions.push(eq(schema.books.gradeId, request.query.gradeId));

    return {
      items: await db.select({
        id: schema.books.id,
        subjectId: schema.books.subjectId,
        gradeId: schema.books.gradeId,
        code: schema.books.code,
        titleFa: schema.books.titleFa,
        titlePs: schema.books.titlePs,
        editionYear: schema.books.editionYear,
        sourceMetadata: schema.books.sourceMetadata,
        sortOrder: schema.books.sortOrder
      }).from(schema.books)
        .where(and(...conditions))
        .orderBy(asc(schema.books.sortOrder), asc(schema.books.titleFa))
    };
  });

  app.get<{ Querystring: { bookId?: string } }>("/chapters", async (request) => {
    const db = createDatabase();
    const conditions = [eq(schema.chapters.active, true)];
    if (request.query.bookId) conditions.push(eq(schema.chapters.bookId, request.query.bookId));

    return {
      items: await db.select().from(schema.chapters)
        .where(and(...conditions))
        .orderBy(asc(schema.chapters.sortOrder), asc(schema.chapters.number))
    };
  });

  app.get<{ Querystring: { chapterId?: string } }>("/topics", async (request) => {
    const db = createDatabase();
    const conditions = [eq(schema.topics.active, true)];
    if (request.query.chapterId) conditions.push(eq(schema.topics.chapterId, request.query.chapterId));

    return {
      items: await db.select().from(schema.topics)
        .where(and(...conditions))
        .orderBy(asc(schema.topics.sortOrder), asc(schema.topics.titleFa))
    };
  });
};
