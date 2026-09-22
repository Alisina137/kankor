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


export const examBlueprints = pgTable("exam_blueprints", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  mode: varchar("mode", { length: 32 }).notNull().default("full_kankor"),
  effectiveYear: integer("effective_year"),
  questionCount: integer("question_count").notNull(),
  durationSeconds: integer("duration_seconds"),
  criteria: jsonb("criteria").$type<{
    subjectIds?: string[];
    gradeIds?: string[];
    bookIds?: string[];
    chapterIds?: string[];
    topicIds?: string[];
    difficulties?: string[];
    language?: string;
  }>().notNull().default({}),
  active: boolean("active").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  activeIdx: index("exam_blueprints_active_idx").on(table.active),
  yearIdx: index("exam_blueprints_year_idx").on(table.effectiveYear)
}));

export const exams = pgTable("exams", {
  id: uuid("id").defaultRandom().primaryKey(),
  mode: varchar("mode", { length: 32 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  language: varchar("language", { length: 8 }).notNull().default("fa"),
  blueprintId: uuid("blueprint_id").references(() => examBlueprints.id, { onDelete: "set null" }),
  questionCount: integer("question_count").notNull(),
  durationSeconds: integer("duration_seconds"),
  criteriaSnapshot: jsonb("criteria_snapshot").$type<Record<string, unknown>>().notNull().default({}),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  modeIdx: index("exams_mode_idx").on(table.mode),
  createdByIdx: index("exams_created_by_idx").on(table.createdByUserId)
}));

export const examQuestions = pgTable("exam_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "restrict" }),
  order: integer("question_order").notNull(),
  questionVersion: integer("question_version").notNull(),
  contentSnapshot: text("content_snapshot").notNull(),
  choicesSnapshot: jsonb("choices_snapshot").$type<Array<{ key: "A" | "B" | "C" | "D"; text: string }>>().notNull(),
  correctChoiceSnapshot: varchar("correct_choice_snapshot", { length: 1 }).notNull(),
  marksSnapshot: numeric("marks_snapshot", { precision: 8, scale: 2 }).notNull(),
  curriculumSnapshot: jsonb("curriculum_snapshot").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  examOrderUnique: uniqueIndex("exam_questions_exam_order_unique").on(table.examId, table.order),
  examQuestionUnique: uniqueIndex("exam_questions_exam_question_unique").on(table.examId, table.questionId),
  examIdx: index("exam_questions_exam_idx").on(table.examId)
}));

export const examAttempts = pgTable("exam_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  examId: uuid("exam_id").notNull().references(() => exams.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 24 }).notNull().default("created"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  configurationSnapshot: jsonb("configuration_snapshot").$type<Record<string, unknown>>().notNull().default({}),
  submissionKey: varchar("submission_key", { length: 96 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userIdx: index("exam_attempts_user_idx").on(table.userId),
  examIdx: index("exam_attempts_exam_idx").on(table.examId),
  statusIdx: index("exam_attempts_status_idx").on(table.status),
  submissionUnique: uniqueIndex("exam_attempts_submission_key_unique").on(table.userId, table.submissionKey)
}));

export const attemptAnswers = pgTable("attempt_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  attemptId: uuid("attempt_id").notNull().references(() => examAttempts.id, { onDelete: "cascade" }),
  examQuestionId: uuid("exam_question_id").notNull().references(() => examQuestions.id, { onDelete: "cascade" }),
  selectedChoice: varchar("selected_choice", { length: 1 }),
  flagged: boolean("flagged").notNull().default(false),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  clientRevision: integer("client_revision").notNull().default(0),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  attemptQuestionUnique: uniqueIndex("attempt_answers_attempt_question_unique").on(table.attemptId, table.examQuestionId),
  attemptIdx: index("attempt_answers_attempt_idx").on(table.attemptId)
}));
