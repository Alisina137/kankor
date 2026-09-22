import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { asc, eq } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { requireAdmin } from "../../common/admin-auth.js";

type BodyRequest = FastifyRequest<{ Body: Record<string, unknown> }>;

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function optionalString(value: unknown) {
  const result = stringValue(value);
  return result || null;
}
function intValue(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}
function boolValue(value: unknown, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

export const adminCurriculumRoutes: FastifyPluginAsync = async (app) => {
  app.get("/curriculum", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const db = createDatabase();

    const [grades, subjects, books, chapters, topics] = await Promise.all([
      db.select().from(schema.grades).orderBy(asc(schema.grades.sortOrder)),
      db.select().from(schema.subjects).orderBy(asc(schema.subjects.sortOrder)),
      db.select().from(schema.books).orderBy(asc(schema.books.sortOrder)),
      db.select().from(schema.chapters).orderBy(asc(schema.chapters.sortOrder)),
      db.select().from(schema.topics).orderBy(asc(schema.topics.sortOrder))
    ]);

    return { grades, subjects, books, chapters, topics };
  });

  app.post("/grades", async (request: BodyRequest, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const number = intValue(request.body.number, -1);
    const nameFa = stringValue(request.body.nameFa);
    if (number < 1 || !nameFa) return reply.code(400).send({ error: "invalid_grade" });

    const db = createDatabase();
    const [item] = await db.insert(schema.grades).values({
      number,
      nameFa,
      namePs: optionalString(request.body.namePs),
      sortOrder: intValue(request.body.sortOrder, number),
      active: boolValue(request.body.active)
    }).returning();
    return reply.code(201).send({ item });
  });

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>("/grades/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const db = createDatabase();
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if ("nameFa" in request.body) values.nameFa = stringValue(request.body.nameFa);
    if ("namePs" in request.body) values.namePs = optionalString(request.body.namePs);
    if ("sortOrder" in request.body) values.sortOrder = intValue(request.body.sortOrder);
    if ("active" in request.body) values.active = boolValue(request.body.active);
    const [item] = await db.update(schema.grades).set(values as any).where(eq(schema.grades.id, request.params.id)).returning();
    if (!item) return reply.code(404).send({ error: "grade_not_found" });
    return { item };
  });

  app.post("/subjects", async (request: BodyRequest, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const code = stringValue(request.body.code).toLowerCase();
    const nameFa = stringValue(request.body.nameFa);
    if (!code || !nameFa) return reply.code(400).send({ error: "invalid_subject" });
    const db = createDatabase();
    const [item] = await db.insert(schema.subjects).values({
      code, nameFa,
      namePs: optionalString(request.body.namePs),
      sortOrder: intValue(request.body.sortOrder),
      active: boolValue(request.body.active)
    }).returning();
    return reply.code(201).send({ item });
  });

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>("/subjects/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const db = createDatabase();
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if ("code" in request.body) values.code = stringValue(request.body.code).toLowerCase();
    if ("nameFa" in request.body) values.nameFa = stringValue(request.body.nameFa);
    if ("namePs" in request.body) values.namePs = optionalString(request.body.namePs);
    if ("sortOrder" in request.body) values.sortOrder = intValue(request.body.sortOrder);
    if ("active" in request.body) values.active = boolValue(request.body.active);
    const [item] = await db.update(schema.subjects).set(values as any).where(eq(schema.subjects.id, request.params.id)).returning();
    if (!item) return reply.code(404).send({ error: "subject_not_found" });
    return { item };
  });

  app.post("/books", async (request: BodyRequest, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const subjectId = stringValue(request.body.subjectId);
    const gradeId = stringValue(request.body.gradeId);
    const code = stringValue(request.body.code).toLowerCase();
    const titleFa = stringValue(request.body.titleFa);
    if (!subjectId || !gradeId || !code || !titleFa) return reply.code(400).send({ error: "invalid_book" });
    const db = createDatabase();
    const [item] = await db.insert(schema.books).values({
      subjectId, gradeId, code, titleFa,
      titlePs: optionalString(request.body.titlePs),
      editionYear: request.body.editionYear == null ? null : intValue(request.body.editionYear),
      sortOrder: intValue(request.body.sortOrder),
      active: boolValue(request.body.active)
    }).returning();
    return reply.code(201).send({ item });
  });

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>("/books/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const db = createDatabase();
    const values: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of ["subjectId", "gradeId", "code", "titleFa"] as const) {
      if (key in request.body) values[key] = stringValue(request.body[key]);
    }
    if ("titlePs" in request.body) values.titlePs = optionalString(request.body.titlePs);
    if ("editionYear" in request.body) values.editionYear = request.body.editionYear == null ? null : intValue(request.body.editionYear);
    if ("sortOrder" in request.body) values.sortOrder = intValue(request.body.sortOrder);
    if ("active" in request.body) values.active = boolValue(request.body.active);
    const [item] = await db.update(schema.books).set(values as any).where(eq(schema.books.id, request.params.id)).returning();
    if (!item) return reply.code(404).send({ error: "book_not_found" });
    return { item };
  });

  app.post("/chapters", async (request: BodyRequest, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const bookId = stringValue(request.body.bookId);
    const titleFa = stringValue(request.body.titleFa);
    const number = intValue(request.body.number, -1);
    if (!bookId || !titleFa || number < 1) return reply.code(400).send({ error: "invalid_chapter" });
    const db = createDatabase();
    const [item] = await db.insert(schema.chapters).values({
      bookId, number, titleFa,
      titlePs: optionalString(request.body.titlePs),
      sortOrder: intValue(request.body.sortOrder, number),
      active: boolValue(request.body.active)
    }).returning();
    return reply.code(201).send({ item });
  });

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>("/chapters/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const db = createDatabase();
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if ("bookId" in request.body) values.bookId = stringValue(request.body.bookId);
    if ("number" in request.body) values.number = intValue(request.body.number);
    if ("titleFa" in request.body) values.titleFa = stringValue(request.body.titleFa);
    if ("titlePs" in request.body) values.titlePs = optionalString(request.body.titlePs);
    if ("sortOrder" in request.body) values.sortOrder = intValue(request.body.sortOrder);
    if ("active" in request.body) values.active = boolValue(request.body.active);
    const [item] = await db.update(schema.chapters).set(values as any).where(eq(schema.chapters.id, request.params.id)).returning();
    if (!item) return reply.code(404).send({ error: "chapter_not_found" });
    return { item };
  });

  app.post("/topics", async (request: BodyRequest, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const chapterId = stringValue(request.body.chapterId);
    const titleFa = stringValue(request.body.titleFa);
    if (!chapterId || !titleFa) return reply.code(400).send({ error: "invalid_topic" });
    const db = createDatabase();
    const [item] = await db.insert(schema.topics).values({
      chapterId, titleFa,
      code: optionalString(request.body.code),
      titlePs: optionalString(request.body.titlePs),
      sortOrder: intValue(request.body.sortOrder),
      active: boolValue(request.body.active)
    }).returning();
    return reply.code(201).send({ item });
  });

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>("/topics/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const db = createDatabase();
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if ("chapterId" in request.body) values.chapterId = stringValue(request.body.chapterId);
    if ("code" in request.body) values.code = optionalString(request.body.code);
    if ("titleFa" in request.body) values.titleFa = stringValue(request.body.titleFa);
    if ("titlePs" in request.body) values.titlePs = optionalString(request.body.titlePs);
    if ("sortOrder" in request.body) values.sortOrder = intValue(request.body.sortOrder);
    if ("active" in request.body) values.active = boolValue(request.body.active);
    const [item] = await db.update(schema.topics).set(values as any).where(eq(schema.topics.id, request.params.id)).returning();
    if (!item) return reply.code(404).send({ error: "topic_not_found" });
    return { item };
  });
};
