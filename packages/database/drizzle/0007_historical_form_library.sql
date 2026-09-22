CREATE TABLE IF NOT EXISTS "historical_forms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "archive_code" varchar(120) NOT NULL UNIQUE,
  "year" integer NOT NULL,
  "cycle" varchar(80),
  "province" varchar(120),
  "round" varchar(80),
  "form_code" varchar(120),
  "language" varchar(8) NOT NULL,
  "title" varchar(240) NOT NULL,
  "source_reference" text,
  "source_status" varchar(32) NOT NULL DEFAULT 'unverified',
  "source_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "verification_status" varchar(24) NOT NULL DEFAULT 'draft',
  "original_order_status" varchar(24) NOT NULL DEFAULT 'uncertain',
  "question_count" integer NOT NULL DEFAULT 0,
  "duration_seconds" integer,
  "scoring_rules" jsonb,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "historical_forms_year_check" CHECK ("year" > 1300 AND "year" < 1600),
  CONSTRAINT "historical_forms_language_check" CHECK ("language" IN ('fa','ps','en')),
  CONSTRAINT "historical_forms_source_status_check" CHECK ("source_status" IN ('official','verified_secondary','unverified')),
  CONSTRAINT "historical_forms_verification_check" CHECK ("verification_status" IN ('draft','review','approved','published','deprecated')),
  CONSTRAINT "historical_forms_order_status_check" CHECK ("original_order_status" IN ('confirmed','uncertain')),
  CONSTRAINT "historical_forms_question_count_check" CHECK ("question_count" >= 0 AND "question_count" <= 160),
  CONSTRAINT "historical_forms_duration_check" CHECK ("duration_seconds" IS NULL OR "duration_seconds" > 0)
);

CREATE INDEX IF NOT EXISTS "historical_forms_year_idx" ON "historical_forms" ("year");
CREATE INDEX IF NOT EXISTS "historical_forms_province_idx" ON "historical_forms" ("province");
CREATE INDEX IF NOT EXISTS "historical_forms_status_idx" ON "historical_forms" ("verification_status");

CREATE TABLE IF NOT EXISTS "historical_form_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "historical_form_id" uuid NOT NULL REFERENCES "historical_forms"("id") ON DELETE CASCADE,
  "question_id" uuid NOT NULL REFERENCES "questions"("id") ON DELETE RESTRICT,
  "question_order" integer NOT NULL,
  "historical_scoring_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "source_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "historical_form_questions_order_check" CHECK ("question_order" > 0 AND "question_order" <= 160)
);

CREATE UNIQUE INDEX IF NOT EXISTS "historical_form_questions_order_unique"
  ON "historical_form_questions" ("historical_form_id", "question_order");
CREATE INDEX IF NOT EXISTS "historical_form_questions_form_idx"
  ON "historical_form_questions" ("historical_form_id");
CREATE INDEX IF NOT EXISTS "historical_form_questions_question_idx"
  ON "historical_form_questions" ("question_id");

ALTER TABLE "exams"
  ADD COLUMN IF NOT EXISTS "historical_form_id" uuid REFERENCES "historical_forms"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "exams_historical_form_idx" ON "exams" ("historical_form_id");

DROP INDEX IF EXISTS "exam_questions_exam_question_unique";
CREATE INDEX IF NOT EXISTS "exam_questions_exam_question_idx" ON "exam_questions" ("exam_id", "question_id");
