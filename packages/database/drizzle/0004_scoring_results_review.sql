ALTER TABLE "exam_blueprints"
  ADD COLUMN IF NOT EXISTS "scoring_rules" jsonb;

ALTER TABLE "exams"
  ADD COLUMN IF NOT EXISTS "scoring_snapshot" jsonb;

ALTER TABLE "exam_questions"
  ADD COLUMN IF NOT EXISTS "explanation_snapshot" jsonb NOT NULL DEFAULT '{"shortExplanation":null,"detailedExplanation":null,"workedSolution":null}'::jsonb;

UPDATE "exam_questions" eq
SET "explanation_snapshot" = jsonb_build_object(
  'shortExplanation', q."short_explanation",
  'detailedExplanation', q."detailed_explanation",
  'workedSolution', q."worked_solution"
)
FROM "questions" q
WHERE eq."question_id" = q."id"
  AND eq."explanation_snapshot" = '{"shortExplanation":null,"detailedExplanation":null,"workedSolution":null}'::jsonb;

ALTER TABLE "attempt_answers"
  ADD COLUMN IF NOT EXISTS "correct" boolean,
  ADD COLUMN IF NOT EXISTS "awarded_score" numeric(12,4);

UPDATE "exams"
SET "scoring_snapshot" = '{
  "mode":"question_marks",
  "correctMultiplier":1,
  "incorrectMultiplier":0,
  "unansweredMultiplier":0,
  "floorAtZero":false
}'::jsonb
WHERE "scoring_snapshot" IS NULL
  AND "mode" <> 'full_kankor';

CREATE TABLE IF NOT EXISTS "attempt_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attempt_id" uuid NOT NULL UNIQUE REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
  "score" numeric(12,4) NOT NULL,
  "max_score" numeric(12,4) NOT NULL,
  "percentage" numeric(8,4) NOT NULL,
  "correct_count" integer NOT NULL,
  "incorrect_count" integer NOT NULL,
  "unanswered_count" integer NOT NULL,
  "total_time_seconds" integer NOT NULL,
  "scoring_snapshot" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "attempt_results_attempt_unique" ON "attempt_results" ("attempt_id");

CREATE TABLE IF NOT EXISTS "attempt_analyses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attempt_id" uuid NOT NULL UNIQUE REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
  "overall" jsonb NOT NULL,
  "by_subject" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "by_grade" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "by_book" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "by_chapter" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "by_topic" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "by_difficulty" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "timing" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "strongest_areas" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "weakest_areas" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "recommendation" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "attempt_analyses_attempt_unique" ON "attempt_analyses" ("attempt_id");
