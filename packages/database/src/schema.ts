import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const appConfiguration = pgTable("app_configuration", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 120 }).notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 32 }).notNull().default("student"),
  preferredLanguage: varchar("preferred_language", { length: 8 }).notNull().default("fa"),
  targetExamYear: integer("target_exam_year"),
  preparationLevel: varchar("preparation_level", { length: 24 }),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userIdx: index("sessions_user_idx").on(table.userId),
  expiryIdx: index("sessions_expiry_idx").on(table.expiresAt)
}));

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userIdx: index("password_reset_user_idx").on(table.userId),
  expiryIdx: index("password_reset_expiry_idx").on(table.expiresAt)
}));

export const grades = pgTable("grades", {
  id: uuid("id").defaultRandom().primaryKey(),
  number: integer("number").notNull().unique(),
  nameFa: varchar("name_fa", { length: 120 }).notNull(),
  namePs: varchar("name_ps", { length: 120 }),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  nameFa: varchar("name_fa", { length: 160 }).notNull(),
  namePs: varchar("name_ps", { length: 160 }),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const books = pgTable("books", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
  gradeId: uuid("grade_id").notNull().references(() => grades.id, { onDelete: "restrict" }),
  code: varchar("code", { length: 96 }).notNull().unique(),
  titleFa: varchar("title_fa", { length: 220 }).notNull(),
  titlePs: varchar("title_ps", { length: 220 }),
  editionYear: integer("edition_year"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  subjectGradeIdx: index("books_subject_grade_idx").on(table.subjectId, table.gradeId)
}));

export const chapters = pgTable("chapters", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  titleFa: varchar("title_fa", { length: 220 }).notNull(),
  titlePs: varchar("title_ps", { length: 220 }),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  bookNumberUnique: uniqueIndex("chapters_book_number_unique").on(table.bookId, table.number),
  bookIdx: index("chapters_book_idx").on(table.bookId)
}));

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 120 }),
  titleFa: varchar("title_fa", { length: 220 }).notNull(),
  titlePs: varchar("title_ps", { length: 220 }),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  chapterIdx: index("topics_chapter_idx").on(table.chapterId)
}));

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "restrict" }),
  language: varchar("language", { length: 8 }).notNull().default("fa"),
  questionType: varchar("question_type", { length: 32 }).notNull().default("single_choice"),
  content: text("content").notNull(),
  choices: jsonb("choices").$type<Array<{ key: "A" | "B" | "C" | "D"; text: string }>>().notNull(),
  correctChoice: varchar("correct_choice", { length: 1 }).notNull(),
  shortExplanation: text("short_explanation"),
  detailedExplanation: text("detailed_explanation"),
  workedSolution: text("worked_solution"),
  difficulty: varchar("difficulty", { length: 24 }).notNull().default("medium"),
  marks: numeric("marks", { precision: 8, scale: 2 }).notNull().default("1"),
  sourceType: varchar("source_type", { length: 32 }).notNull().default("editorial"),
  sourceMetadata: jsonb("source_metadata").$type<Record<string, unknown>>().notNull().default({}),
  verificationStatus: varchar("verification_status", { length: 24 }).notNull().default("draft"),
  version: integer("version").notNull().default(1),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  topicIdx: index("questions_topic_idx").on(table.topicId),
  statusIdx: index("questions_status_idx").on(table.verificationStatus),
  languageIdx: index("questions_language_idx").on(table.language)
}));

export const questionTranslations = pgTable("question_translations", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  language: varchar("language", { length: 8 }).notNull(),
  content: text("content").notNull(),
  choices: jsonb("choices").$type<Array<{ key: "A" | "B" | "C" | "D"; text: string }>>().notNull(),
  shortExplanation: text("short_explanation"),
  detailedExplanation: text("detailed_explanation"),
  workedSolution: text("worked_solution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  questionLanguageUnique: uniqueIndex("question_translations_question_language_unique").on(table.questionId, table.language)
}));
