ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "role" varchar(32) NOT NULL DEFAULT 'student';

CREATE TABLE IF NOT EXISTS "grades" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "number" integer NOT NULL UNIQUE,
  "name_fa" varchar(120) NOT NULL,
  "name_ps" varchar(120),
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "subjects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(64) NOT NULL UNIQUE,
  "name_fa" varchar(160) NOT NULL,
  "name_ps" varchar(160),
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "books" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE RESTRICT,
  "grade_id" uuid NOT NULL REFERENCES "grades"("id") ON DELETE RESTRICT,
  "code" varchar(96) NOT NULL UNIQUE,
  "title_fa" varchar(220) NOT NULL,
  "title_ps" varchar(220),
  "edition_year" integer,
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "books_subject_grade_idx" ON "books" ("subject_id", "grade_id");

CREATE TABLE IF NOT EXISTS "chapters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "book_id" uuid NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
  "number" integer NOT NULL,
  "title_fa" varchar(220) NOT NULL,
  "title_ps" varchar(220),
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "chapters_book_number_unique" ON "chapters" ("book_id", "number");
CREATE INDEX IF NOT EXISTS "chapters_book_idx" ON "chapters" ("book_id");

CREATE TABLE IF NOT EXISTS "topics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chapter_id" uuid NOT NULL REFERENCES "chapters"("id") ON DELETE CASCADE,
  "code" varchar(120),
  "title_fa" varchar(220) NOT NULL,
  "title_ps" varchar(220),
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "topics_chapter_idx" ON "topics" ("chapter_id");

CREATE TABLE IF NOT EXISTS "questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "topic_id" uuid NOT NULL REFERENCES "topics"("id") ON DELETE RESTRICT,
  "language" varchar(8) NOT NULL DEFAULT 'fa',
  "question_type" varchar(32) NOT NULL DEFAULT 'single_choice',
  "content" text NOT NULL,
  "choices" jsonb NOT NULL,
  "correct_choice" varchar(1) NOT NULL,
  "short_explanation" text,
  "detailed_explanation" text,
  "worked_solution" text,
  "difficulty" varchar(24) NOT NULL DEFAULT 'medium',
  "marks" numeric(8,2) NOT NULL DEFAULT 1,
  "source_type" varchar(32) NOT NULL DEFAULT 'editorial',
  "source_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "verification_status" varchar(24) NOT NULL DEFAULT 'draft',
  "version" integer NOT NULL DEFAULT 1,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "questions_correct_choice_check" CHECK ("correct_choice" IN ('A','B','C','D')),
  CONSTRAINT "questions_status_check" CHECK ("verification_status" IN ('draft','review','approved','published','deprecated'))
);
CREATE INDEX IF NOT EXISTS "questions_topic_idx" ON "questions" ("topic_id");
CREATE INDEX IF NOT EXISTS "questions_status_idx" ON "questions" ("verification_status");
CREATE INDEX IF NOT EXISTS "questions_language_idx" ON "questions" ("language");

CREATE TABLE IF NOT EXISTS "question_translations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question_id" uuid NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
  "language" varchar(8) NOT NULL,
  "content" text NOT NULL,
  "choices" jsonb NOT NULL,
  "short_explanation" text,
  "detailed_explanation" text,
  "worked_solution" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "question_translations_question_language_unique"
  ON "question_translations" ("question_id", "language");

INSERT INTO "grades" ("number", "name_fa", "name_ps", "sort_order")
VALUES
  (10, 'صنف دهم', 'لسم ټولګی', 10),
  (11, 'صنف یازدهم', 'یوولسم ټولګی', 11),
  (12, 'صنف دوازدهم', 'دولسم ټولګی', 12)
ON CONFLICT ("number") DO NOTHING;
