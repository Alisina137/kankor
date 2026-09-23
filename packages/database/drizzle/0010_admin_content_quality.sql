ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "supersedes_question_id" uuid;
CREATE TABLE IF NOT EXISTS "question_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question_id" uuid NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "snapshot" jsonb NOT NULL,
  "change_reason" text,
  "changed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "question_revisions_question_version_unique"
  ON "question_revisions" ("question_id","version");
CREATE INDEX IF NOT EXISTS "question_revisions_question_idx"
  ON "question_revisions" ("question_id");

CREATE TABLE IF NOT EXISTS "content_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" varchar(32) NOT NULL,
  "entity_id" uuid NOT NULL,
  "decision" varchar(24) NOT NULL,
  "notes" text,
  "criteria" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "reviewer_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "content_reviews_decision_check" CHECK ("decision" IN ('submitted','approved','rejected','published','deprecated'))
);
CREATE INDEX IF NOT EXISTS "content_reviews_entity_idx" ON "content_reviews" ("entity_type","entity_id");
CREATE INDEX IF NOT EXISTS "content_reviews_reviewer_idx" ON "content_reviews" ("reviewer_id");

CREATE TABLE IF NOT EXISTS "content_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "question_id" uuid REFERENCES "questions"("id") ON DELETE SET NULL,
  "report_type" varchar(40) NOT NULL,
  "status" varchar(24) NOT NULL DEFAULT 'open',
  "description" text NOT NULL,
  "source" varchar(32) NOT NULL DEFAULT 'admin_review',
  "reported_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "resolved_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "resolution_notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "resolved_at" timestamptz,
  CONSTRAINT "content_reports_status_check" CHECK ("status" IN ('open','investigating','resolved','dismissed')),
  CONSTRAINT "content_reports_type_check" CHECK ("report_type" IN ('question','incorrect_answer','explanation','translation','rendering','curriculum_mapping','source_provenance','other'))
);
CREATE INDEX IF NOT EXISTS "content_reports_status_idx" ON "content_reports" ("status");
CREATE INDEX IF NOT EXISTS "content_reports_question_idx" ON "content_reports" ("question_id");

CREATE TABLE IF NOT EXISTS "content_import_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "import_type" varchar(40) NOT NULL,
  "status" varchar(24) NOT NULL DEFAULT 'validated',
  "total_rows" integer NOT NULL DEFAULT 0,
  "accepted_rows" integer NOT NULL DEFAULT 0,
  "rejected_rows" integer NOT NULL DEFAULT 0,
  "validation_report" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "applied_at" timestamptz,
  CONSTRAINT "content_import_batches_status_check" CHECK ("status" IN ('validated','applied','failed'))
);
CREATE INDEX IF NOT EXISTS "content_import_batches_status_idx" ON "content_import_batches" ("status");
CREATE INDEX IF NOT EXISTS "content_import_batches_created_by_idx" ON "content_import_batches" ("created_by");

CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "action" varchar(96) NOT NULL,
  "entity_type" varchar(48),
  "entity_id" varchar(128),
  "before_snapshot" jsonb,
  "after_snapshot" jsonb,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "admin_audit_logs_actor_idx" ON "admin_audit_logs" ("actor_user_id");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_entity_idx" ON "admin_audit_logs" ("entity_type","entity_id");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_at_idx" ON "admin_audit_logs" ("created_at");

INSERT INTO "question_revisions" ("question_id","version","snapshot","change_reason","changed_by","created_at")
SELECT
  q."id",
  q."version",
  jsonb_build_object(
    'topicId', q."topic_id",
    'language', q."language",
    'questionType', q."question_type",
    'content', q."content",
    'choices', q."choices",
    'correctChoice', q."correct_choice",
    'shortExplanation', q."short_explanation",
    'detailedExplanation', q."detailed_explanation",
    'workedSolution', q."worked_solution",
    'difficulty', q."difficulty",
    'marks', q."marks",
    'sourceType', q."source_type",
    'sourceMetadata', q."source_metadata",
    'verificationStatus', q."verification_status"
  ),
  'phase_9_baseline',
  q."updated_by",
  q."updated_at"
FROM "questions" q
ON CONFLICT ("question_id","version") DO NOTHING;
