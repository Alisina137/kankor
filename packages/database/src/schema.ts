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
  sourceMetadata: jsonb("source_metadata").$type<Record<string, unknown>>().notNull().default({}),
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
  supersedesQuestionId: uuid("supersedes_question_id"),
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


export const historicalForms = pgTable("historical_forms", {
  id: uuid("id").defaultRandom().primaryKey(),
  archiveCode: varchar("archive_code", { length: 120 }).notNull().unique(),
  year: integer("year").notNull(),
  cycle: varchar("cycle", { length: 80 }),
  province: varchar("province", { length: 120 }),
  round: varchar("round", { length: 80 }),
  formCode: varchar("form_code", { length: 120 }),
  language: varchar("language", { length: 8 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  accessTier: varchar("access_tier", { length: 16 }).notNull().default("free"),
  sourceReference: text("source_reference"),
  sourceStatus: varchar("source_status", { length: 32 }).notNull().default("unverified"),
  sourceMetadata: jsonb("source_metadata").$type<Record<string, unknown>>().notNull().default({}),
  verificationStatus: varchar("verification_status", { length: 24 }).notNull().default("draft"),
  originalOrderStatus: varchar("original_order_status", { length: 24 }).notNull().default("uncertain"),
  questionCount: integer("question_count").notNull().default(0),
  durationSeconds: integer("duration_seconds"),
  scoringRules: jsonb("scoring_rules").$type<Record<string, unknown>>(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  yearIdx: index("historical_forms_year_idx").on(table.year),
  provinceIdx: index("historical_forms_province_idx").on(table.province),
  statusIdx: index("historical_forms_status_idx").on(table.verificationStatus)
}));

export const historicalFormQuestions = pgTable("historical_form_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  historicalFormId: uuid("historical_form_id").notNull().references(() => historicalForms.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "restrict" }),
  order: integer("question_order").notNull(),
  historicalScoringMetadata: jsonb("historical_scoring_metadata").$type<Record<string, unknown>>().notNull().default({}),
  sourceMetadata: jsonb("source_metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  formOrderUnique: uniqueIndex("historical_form_questions_order_unique").on(table.historicalFormId, table.order),
  formIdx: index("historical_form_questions_form_idx").on(table.historicalFormId),
  questionIdx: index("historical_form_questions_question_idx").on(table.questionId)
}));

export const examBlueprints = pgTable("exam_blueprints", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  mode: varchar("mode", { length: 32 }).notNull().default("full_kankor"),
  effectiveYear: integer("effective_year"),
  questionCount: integer("question_count").notNull(),
  durationSeconds: integer("duration_seconds"),
  criteria: jsonb("criteria").$type<Record<string, unknown>>().notNull().default({}),
  scoringRules: jsonb("scoring_rules").$type<Record<string, unknown>>(),
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
  historicalFormId: uuid("historical_form_id").references(() => historicalForms.id, { onDelete: "set null" }),
  questionCount: integer("question_count").notNull(),
  durationSeconds: integer("duration_seconds"),
  criteriaSnapshot: jsonb("criteria_snapshot").$type<Record<string, unknown>>().notNull().default({}),
  scoringSnapshot: jsonb("scoring_snapshot").$type<Record<string, unknown>>(),
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
  explanationSnapshot: jsonb("explanation_snapshot").$type<{
    shortExplanation: string | null;
    detailedExplanation: string | null;
    workedSolution: string | null;
  }>().notNull().default({ shortExplanation: null, detailedExplanation: null, workedSolution: null }),
  curriculumSnapshot: jsonb("curriculum_snapshot").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  examOrderUnique: uniqueIndex("exam_questions_exam_order_unique").on(table.examId, table.order),
  examQuestionIdx: index("exam_questions_exam_question_idx").on(table.examId, table.questionId),
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
  correct: boolean("correct"),
  awardedScore: numeric("awarded_score", { precision: 12, scale: 4 }),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  attemptQuestionUnique: uniqueIndex("attempt_answers_attempt_question_unique").on(table.attemptId, table.examQuestionId),
  attemptIdx: index("attempt_answers_attempt_idx").on(table.attemptId)
}));


export const attemptResults = pgTable("attempt_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  attemptId: uuid("attempt_id").notNull().references(() => examAttempts.id, { onDelete: "cascade" }).unique(),
  score: numeric("score", { precision: 12, scale: 4 }).notNull(),
  maxScore: numeric("max_score", { precision: 12, scale: 4 }).notNull(),
  percentage: numeric("percentage", { precision: 8, scale: 4 }).notNull(),
  correctCount: integer("correct_count").notNull(),
  incorrectCount: integer("incorrect_count").notNull(),
  unansweredCount: integer("unanswered_count").notNull(),
  totalTimeSeconds: integer("total_time_seconds").notNull(),
  scoringSnapshot: jsonb("scoring_snapshot").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  attemptIdx: uniqueIndex("attempt_results_attempt_unique").on(table.attemptId)
}));

export const attemptAnalyses = pgTable("attempt_analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
  attemptId: uuid("attempt_id").notNull().references(() => examAttempts.id, { onDelete: "cascade" }).unique(),
  overall: jsonb("overall").$type<Record<string, unknown>>().notNull(),
  bySubject: jsonb("by_subject").$type<Array<Record<string, unknown>>>().notNull().default([]),
  byGrade: jsonb("by_grade").$type<Array<Record<string, unknown>>>().notNull().default([]),
  byBook: jsonb("by_book").$type<Array<Record<string, unknown>>>().notNull().default([]),
  byChapter: jsonb("by_chapter").$type<Array<Record<string, unknown>>>().notNull().default([]),
  byTopic: jsonb("by_topic").$type<Array<Record<string, unknown>>>().notNull().default([]),
  byDifficulty: jsonb("by_difficulty").$type<Array<Record<string, unknown>>>().notNull().default([]),
  timing: jsonb("timing").$type<Record<string, unknown>>().notNull().default({}),
  strongestAreas: jsonb("strongest_areas").$type<Array<Record<string, unknown>>>().notNull().default([]),
  weakestAreas: jsonb("weakest_areas").$type<Array<Record<string, unknown>>>().notNull().default([]),
  recommendation: jsonb("recommendation").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  attemptIdx: uniqueIndex("attempt_analyses_attempt_unique").on(table.attemptId)
}));


export const mistakeItems = pgTable("mistake_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "restrict" }),
  firstMissedAt: timestamp("first_missed_at", { withTimezone: true }).notNull(),
  lastAttemptedAt: timestamp("last_attempted_at", { withTimezone: true }).notNull(),
  timesMissed: integer("times_missed").notNull().default(1),
  eventuallyMastered: boolean("eventually_mastered").notNull().default(false),
  masteredAt: timestamp("mastered_at", { withTimezone: true }),
  latestAttemptId: uuid("latest_attempt_id").references(() => examAttempts.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userQuestionUnique: uniqueIndex("mistake_items_user_question_unique").on(table.userId, table.questionId),
  userIdx: index("mistake_items_user_idx").on(table.userId),
  topicIdx: index("mistake_items_topic_idx").on(table.topicId),
  masteredIdx: index("mistake_items_mastered_idx").on(table.userId, table.eventuallyMastered)
}));

export const topicMastery = pgTable("topic_mastery", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  attemptsCount: integer("attempts_count").notNull().default(0),
  questionsAnswered: integer("questions_answered").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  incorrectCount: integer("incorrect_count").notNull().default(0),
  unansweredCount: integer("unanswered_count").notNull().default(0),
  accuracyPercentage: numeric("accuracy_percentage", { precision: 8, scale: 4 }).notNull().default("0"),
  averageTimeSeconds: numeric("average_time_seconds", { precision: 10, scale: 2 }).notNull().default("0"),
  firstAttemptedAt: timestamp("first_attempted_at", { withTimezone: true }),
  lastAttemptedAt: timestamp("last_attempted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userTopicUnique: uniqueIndex("topic_mastery_user_topic_unique").on(table.userId, table.topicId),
  userIdx: index("topic_mastery_user_idx").on(table.userId),
  topicIdx: index("topic_mastery_topic_idx").on(table.topicId)
}));



export const billingPlans = pgTable("billing_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 96 }).notNull().unique(),
  nameFa: varchar("name_fa", { length: 180 }).notNull(),
  namePs: varchar("name_ps", { length: 180 }),
  nameEn: varchar("name_en", { length: 180 }),
  billingPeriod: varchar("billing_period", { length: 32 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  priceAfn: integer("price_afn").notNull(),
  entitlements: jsonb("entitlements").$type<Record<string, unknown>>().notNull().default({}),
  active: boolean("active").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  activeIdx: index("billing_plans_active_idx").on(table.active)
}));

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => billingPlans.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  provider: varchar("provider", { length: 32 }).notNull(),
  providerSubscriptionId: varchar("provider_subscription_id", { length: 160 }),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  entitlementSnapshot: jsonb("entitlement_snapshot").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userIdx: index("subscriptions_user_idx").on(table.userId),
  statusIdx: index("subscriptions_status_idx").on(table.status)
}));

export const paymentTransactions = pgTable("payment_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => billingPlans.id, { onDelete: "restrict" }),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  provider: varchar("provider", { length: 32 }).notNull(),
  providerPaymentId: varchar("provider_payment_id", { length: 180 }).notNull().unique(),
  idempotencyKey: varchar("idempotency_key", { length: 160 }),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  amountAfn: integer("amount_afn").notNull(),
  providerPayload: jsonb("provider_payload").$type<Record<string, unknown>>().notNull().default({}),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userIdx: index("payment_transactions_user_idx").on(table.userId),
  userIdempotencyUnique: uniqueIndex("payment_transactions_user_idempotency_unique").on(table.userId, table.idempotencyKey),
  statusIdx: index("payment_transactions_status_idx").on(table.status)
}));

export const entitlementUsage = pgTable("entitlement_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  usageDate: varchar("usage_date", { length: 10 }).notNull(),
  key: varchar("key", { length: 96 }).notNull(),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userDateKeyUnique: uniqueIndex("entitlement_usage_user_date_key_unique").on(table.userId, table.usageDate, table.key),
  userIdx: index("entitlement_usage_user_idx").on(table.userId)
}));


export const questionRevisions = pgTable("question_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  changeReason: text("change_reason"),
  changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  questionVersionUnique: uniqueIndex("question_revisions_question_version_unique").on(table.questionId, table.version),
  questionIdx: index("question_revisions_question_idx").on(table.questionId)
}));

export const contentReviews = pgTable("content_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: varchar("entity_type", { length: 32 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  decision: varchar("decision", { length: 24 }).notNull(),
  notes: text("notes"),
  criteria: jsonb("criteria").$type<Record<string, unknown>>().notNull().default({}),
  reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  entityIdx: index("content_reviews_entity_idx").on(table.entityType, table.entityId),
  reviewerIdx: index("content_reviews_reviewer_idx").on(table.reviewerId)
}));

export const contentReports = pgTable("content_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id").references(() => questions.id, { onDelete: "set null" }),
  reportType: varchar("report_type", { length: 40 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("open"),
  description: text("description").notNull(),
  source: varchar("source", { length: 32 }).notNull().default("admin_review"),
  reportedBy: uuid("reported_by").references(() => users.id, { onDelete: "set null" }),
  resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
}, (table) => ({
  statusIdx: index("content_reports_status_idx").on(table.status),
  questionIdx: index("content_reports_question_idx").on(table.questionId)
}));

export const contentImportBatches = pgTable("content_import_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  importType: varchar("import_type", { length: 40 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("validated"),
  totalRows: integer("total_rows").notNull().default(0),
  acceptedRows: integer("accepted_rows").notNull().default(0),
  rejectedRows: integer("rejected_rows").notNull().default(0),
  validationReport: jsonb("validation_report").$type<Record<string, unknown>>().notNull().default({}),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  appliedAt: timestamp("applied_at", { withTimezone: true })
}, (table) => ({
  statusIdx: index("content_import_batches_status_idx").on(table.status),
  createdByIdx: index("content_import_batches_created_by_idx").on(table.createdBy)
}));

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 96 }).notNull(),
  entityType: varchar("entity_type", { length: 48 }),
  entityId: varchar("entity_id", { length: 128 }),
  beforeSnapshot: jsonb("before_snapshot").$type<Record<string, unknown>>(),
  afterSnapshot: jsonb("after_snapshot").$type<Record<string, unknown>>(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  actorIdx: index("admin_audit_logs_actor_idx").on(table.actorUserId),
  entityIdx: index("admin_audit_logs_entity_idx").on(table.entityType, table.entityId),
  createdAtIdx: index("admin_audit_logs_created_at_idx").on(table.createdAt)
}));
