CREATE TABLE IF NOT EXISTS "exam_blueprints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(96) NOT NULL UNIQUE,
  "name" varchar(180) NOT NULL,
  "mode" varchar(32) NOT NULL DEFAULT 'full_kankor',
  "effective_year" integer,
  "question_count" integer NOT NULL,
  "duration_seconds" integer,
  "criteria" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "active" boolean NOT NULL DEFAULT false,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "exam_blueprints_question_count_check" CHECK ("question_count" > 0 AND "question_count" <= 160),
  CONSTRAINT "exam_blueprints_duration_check" CHECK ("duration_seconds" IS NULL OR "duration_seconds" > 0)
);
CREATE INDEX IF NOT EXISTS "exam_blueprints_active_idx" ON "exam_blueprints" ("active");
CREATE INDEX IF NOT EXISTS "exam_blueprints_year_idx" ON "exam_blueprints" ("effective_year");

CREATE TABLE IF NOT EXISTS "exams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "mode" varchar(32) NOT NULL,
  "title" varchar(220) NOT NULL,
  "language" varchar(8) NOT NULL DEFAULT 'fa',
  "blueprint_id" uuid REFERENCES "exam_blueprints"("id") ON DELETE SET NULL,
  "question_count" integer NOT NULL,
  "duration_seconds" integer,
  "criteria_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "exams_question_count_check" CHECK ("question_count" > 0 AND "question_count" <= 160),
  CONSTRAINT "exams_duration_check" CHECK ("duration_seconds" IS NULL OR "duration_seconds" > 0)
);
CREATE INDEX IF NOT EXISTS "exams_mode_idx" ON "exams" ("mode");
CREATE INDEX IF NOT EXISTS "exams_created_by_idx" ON "exams" ("created_by_user_id");

CREATE TABLE IF NOT EXISTS "exam_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "exam_id" uuid NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
  "question_id" uuid NOT NULL REFERENCES "questions"("id") ON DELETE RESTRICT,
  "question_order" integer NOT NULL,
  "question_version" integer NOT NULL,
  "content_snapshot" text NOT NULL,
  "choices_snapshot" jsonb NOT NULL,
  "correct_choice_snapshot" varchar(1) NOT NULL,
  "marks_snapshot" numeric(8,2) NOT NULL,
  "curriculum_snapshot" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "exam_questions_correct_choice_check" CHECK ("correct_choice_snapshot" IN ('A','B','C','D'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "exam_questions_exam_order_unique" ON "exam_questions" ("exam_id", "question_order");
CREATE UNIQUE INDEX IF NOT EXISTS "exam_questions_exam_question_unique" ON "exam_questions" ("exam_id", "question_id");
CREATE INDEX IF NOT EXISTS "exam_questions_exam_idx" ON "exam_questions" ("exam_id");

CREATE TABLE IF NOT EXISTS "exam_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "exam_id" uuid NOT NULL REFERENCES "exams"("id") ON DELETE RESTRICT,
  "status" varchar(24) NOT NULL DEFAULT 'created',
  "started_at" timestamptz,
  "submitted_at" timestamptz,
  "expires_at" timestamptz,
  "configuration_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "submission_key" varchar(96),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "exam_attempts_status_check" CHECK ("status" IN ('created','in_progress','submitted','scored','analyzed'))
);
CREATE INDEX IF NOT EXISTS "exam_attempts_user_idx" ON "exam_attempts" ("user_id");
CREATE INDEX IF NOT EXISTS "exam_attempts_exam_idx" ON "exam_attempts" ("exam_id");
CREATE INDEX IF NOT EXISTS "exam_attempts_status_idx" ON "exam_attempts" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "exam_attempts_submission_key_unique" ON "exam_attempts" ("user_id", "submission_key")
  WHERE "submission_key" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "attempt_answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attempt_id" uuid NOT NULL REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
  "exam_question_id" uuid NOT NULL REFERENCES "exam_questions"("id") ON DELETE CASCADE,
  "selected_choice" varchar(1),
  "flagged" boolean NOT NULL DEFAULT false,
  "time_spent_seconds" integer NOT NULL DEFAULT 0,
  "client_revision" integer NOT NULL DEFAULT 0,
  "saved_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "attempt_answers_selected_choice_check" CHECK ("selected_choice" IS NULL OR "selected_choice" IN ('A','B','C','D')),
  CONSTRAINT "attempt_answers_time_check" CHECK ("time_spent_seconds" >= 0),
  CONSTRAINT "attempt_answers_revision_check" CHECK ("client_revision" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "attempt_answers_attempt_question_unique" ON "attempt_answers" ("attempt_id", "exam_question_id");
CREATE INDEX IF NOT EXISTS "attempt_answers_attempt_idx" ON "attempt_answers" ("attempt_id");
