ALTER TABLE "historical_forms"
  ADD COLUMN IF NOT EXISTS "access_tier" varchar(16) NOT NULL DEFAULT 'free';

ALTER TABLE "historical_forms"
  DROP CONSTRAINT IF EXISTS "historical_forms_access_tier_check";
ALTER TABLE "historical_forms"
  ADD CONSTRAINT "historical_forms_access_tier_check" CHECK ("access_tier" IN ('free','premium'));

CREATE TABLE IF NOT EXISTS "billing_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(96) NOT NULL UNIQUE,
  "name_fa" varchar(180) NOT NULL,
  "name_ps" varchar(180),
  "name_en" varchar(180),
  "billing_period" varchar(32) NOT NULL,
  "duration_days" integer NOT NULL,
  "price_afn" integer NOT NULL,
  "entitlements" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "active" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "billing_plans_duration_check" CHECK ("duration_days" > 0),
  CONSTRAINT "billing_plans_price_check" CHECK ("price_afn" >= 0)
);
CREATE INDEX IF NOT EXISTS "billing_plans_active_idx" ON "billing_plans" ("active");

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "plan_id" uuid NOT NULL REFERENCES "billing_plans"("id") ON DELETE RESTRICT,
  "status" varchar(24) NOT NULL DEFAULT 'pending',
  "provider" varchar(32) NOT NULL,
  "provider_subscription_id" varchar(160),
  "current_period_start" timestamptz,
  "current_period_end" timestamptz,
  "canceled_at" timestamptz,
  "cancel_at_period_end" boolean NOT NULL DEFAULT false,
  "entitlement_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "subscriptions_status_check" CHECK ("status" IN ('pending','active','canceled','expired','failed'))
);
CREATE INDEX IF NOT EXISTS "subscriptions_user_idx" ON "subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" ("status");

CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "plan_id" uuid NOT NULL REFERENCES "billing_plans"("id") ON DELETE RESTRICT,
  "subscription_id" uuid REFERENCES "subscriptions"("id") ON DELETE SET NULL,
  "provider" varchar(32) NOT NULL,
  "provider_payment_id" varchar(180) NOT NULL UNIQUE,
  "status" varchar(24) NOT NULL DEFAULT 'pending',
  "amount_afn" integer NOT NULL,
  "provider_payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "confirmed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "payment_transactions_status_check" CHECK ("status" IN ('pending','confirmed','failed','refunded')),
  CONSTRAINT "payment_transactions_amount_check" CHECK ("amount_afn" >= 0)
);
CREATE INDEX IF NOT EXISTS "payment_transactions_user_idx" ON "payment_transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "payment_transactions_status_idx" ON "payment_transactions" ("status");

CREATE TABLE IF NOT EXISTS "entitlement_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "usage_date" varchar(10) NOT NULL,
  "key" varchar(96) NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "entitlement_usage_count_check" CHECK ("count" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "entitlement_usage_user_date_key_unique"
  ON "entitlement_usage" ("user_id", "usage_date", "key");
CREATE INDEX IF NOT EXISTS "entitlement_usage_user_idx" ON "entitlement_usage" ("user_id");

INSERT INTO "app_configuration" ("key", "value", "description", "active")
VALUES (
  'billing.free_entitlements',
  '{
    "developmentDefaults": true,
    "dailyQuestionAllowance": 50,
    "topicExamsPerDay": 3,
    "subjectExamsPerDay": 1,
    "bookExamsPerDay": 1,
    "chapterExamsPerDay": 2,
    "customExamsPerDay": 0,
    "fullKankorPerDay": 0,
    "historicalFormsPerDay": 1,
    "maxQuestionsPerTargetedExam": 10,
    "progressHistoryLimit": 5,
    "detailedExplanationsPerDay": 5,
    "mistakeNotebook": false,
    "weaknessPractice": false,
    "completeAnalytics": false
  }'::jsonb,
  'Development defaults for free-plan limits. Product owner should tune remotely from usage data before launch.',
  true
)
ON CONFLICT ("key") DO NOTHING;
