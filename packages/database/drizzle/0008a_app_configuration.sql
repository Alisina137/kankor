-- Ensure application configuration exists before Phase 8 billing migration.
-- The table was present in the Drizzle schema but was missing from the SQL migration chain.
-- This migration is intentionally ordered between 0008 and 0009 and is safe for databases
-- where the table may already exist.

CREATE TABLE IF NOT EXISTS "app_configuration" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(120) NOT NULL UNIQUE,
  "value" jsonb NOT NULL,
  "description" text,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
