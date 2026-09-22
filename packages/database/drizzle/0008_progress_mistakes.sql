CREATE TABLE IF NOT EXISTS "mistake_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "question_id" uuid NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
  "topic_id" uuid NOT NULL REFERENCES "topics"("id") ON DELETE RESTRICT,
  "first_missed_at" timestamptz NOT NULL,
  "last_attempted_at" timestamptz NOT NULL,
  "times_missed" integer NOT NULL DEFAULT 1,
  "eventually_mastered" boolean NOT NULL DEFAULT false,
  "mastered_at" timestamptz,
  "latest_attempt_id" uuid REFERENCES "exam_attempts"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "mistake_items_times_missed_check" CHECK ("times_missed" >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS "mistake_items_user_question_unique"
  ON "mistake_items" ("user_id", "question_id");
CREATE INDEX IF NOT EXISTS "mistake_items_user_idx" ON "mistake_items" ("user_id");
CREATE INDEX IF NOT EXISTS "mistake_items_topic_idx" ON "mistake_items" ("topic_id");
CREATE INDEX IF NOT EXISTS "mistake_items_mastered_idx"
  ON "mistake_items" ("user_id", "eventually_mastered");

CREATE TABLE IF NOT EXISTS "topic_mastery" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "topic_id" uuid NOT NULL REFERENCES "topics"("id") ON DELETE CASCADE,
  "attempts_count" integer NOT NULL DEFAULT 0,
  "questions_answered" integer NOT NULL DEFAULT 0,
  "correct_count" integer NOT NULL DEFAULT 0,
  "incorrect_count" integer NOT NULL DEFAULT 0,
  "unanswered_count" integer NOT NULL DEFAULT 0,
  "accuracy_percentage" numeric(8,4) NOT NULL DEFAULT 0,
  "average_time_seconds" numeric(10,2) NOT NULL DEFAULT 0,
  "first_attempted_at" timestamptz,
  "last_attempted_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "topic_mastery_counts_check" CHECK (
    "attempts_count" >= 0
    AND "questions_answered" >= 0
    AND "correct_count" >= 0
    AND "incorrect_count" >= 0
    AND "unanswered_count" >= 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "topic_mastery_user_topic_unique"
  ON "topic_mastery" ("user_id", "topic_id");
CREATE INDEX IF NOT EXISTS "topic_mastery_user_idx" ON "topic_mastery" ("user_id");
CREATE INDEX IF NOT EXISTS "topic_mastery_topic_idx" ON "topic_mastery" ("topic_id");
