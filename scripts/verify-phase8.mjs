import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const required = [
  "packages/database/drizzle/0009_freemium_billing.sql",
  "apps/api/src/modules/billing/service.ts",
  "apps/api/src/modules/billing/routes.ts",
  "apps/api/src/modules/admin/billing-routes.ts",
  "apps/mobile/src/app/premium.tsx",
  "apps/admin/app/billing/page.tsx"
];

for (const file of required) await readFile(resolve(file), "utf8");

const schema = await readFile(resolve("packages/database/src/schema.ts"), "utf8");
for (const marker of [
  "billingPlans",
  "subscriptions",
  "paymentTransactions",
  "entitlementUsage",
  "accessTier",
  "idempotencyKey",
  "entitlementSnapshot"
]) {
  if (!schema.includes(marker)) throw new Error(`Phase 8 schema invariant missing: ${marker}`);
}

const migration = await readFile(resolve("packages/database/drizzle/0009_freemium_billing.sql"), "utf8");
for (const marker of [
  "billing_plans",
  "subscriptions",
  "payment_transactions",
  "entitlement_usage",
  "billing.free_entitlements",
  "developmentDefaults",
  "access_tier"
]) {
  if (!migration.includes(marker)) throw new Error(`Phase 8 migration invariant missing: ${marker}`);
}

const service = await readFile(resolve("apps/api/src/modules/billing/service.ts"), "utf8");
for (const marker of [
  "getEntitlementState",
  "expireSubscriptions",
  "authorizeExamStart",
  "recordExamStart",
  "authorizeHistoricalStart",
  "confirmPayment",
  "failPayment",
  "premium_required",
  "dailyQuestionAllowance"
]) {
  if (!service.includes(marker)) throw new Error(`Entitlement lifecycle missing: ${marker}`);
}

const routes = await readFile(resolve("apps/api/src/modules/billing/routes.ts"), "utf8");
for (const marker of [
  '"/plans"',
  '"/checkout"',
  '"/billing/simulated/confirm"',
  '"/billing/webhook"',
  '"/subscription"',
  '"/subscription/cancel"',
  "BILLING_WEBHOOK_SECRET",
  "idempotencyKey",
  "subscription_already_active"
]) {
  if (!routes.includes(marker)) throw new Error(`Billing API capability missing: ${marker}`);
}
if (!routes.includes('process.env.NODE_ENV === "production"')) {
  throw new Error("Simulated checkout must be disabled in production");
}

const examRoutes = await readFile(resolve("apps/api/src/modules/exams/routes.ts"), "utf8");
if (!examRoutes.includes("authorizeExamStart")) {
  throw new Error("Exam generation must preflight entitlements");
}

const attempts = await readFile(resolve("apps/api/src/modules/attempts/routes.ts"), "utf8");
if (!attempts.includes("authorizeExamStart") || !attempts.includes("recordExamStart")) {
  throw new Error("Exam attempt start must enforce and record entitlements");
}

const historical = await readFile(resolve("apps/api/src/modules/exams/historical-routes.ts"), "utf8");
for (const marker of ["authorizeHistoricalStart", "recordHistoricalStart", "accessTier", "locked"]) {
  if (!historical.includes(marker)) throw new Error(`Historical entitlement capability missing: ${marker}`);
}

const progress = await readFile(resolve("apps/api/src/modules/progress/routes.ts"), "utf8");
if (!progress.includes('"mistake_notebook"') || !progress.includes('"weakness_practice"')) {
  throw new Error("Premium progress boundaries are missing");
}

const results = await readFile(resolve("apps/api/src/modules/results/routes.ts"), "utf8");
if (!results.includes("premiumLocked") || !results.includes("detailedExplanation: null") || !results.includes("workedSolution: null")) {
  throw new Error("Free result/review depth controls are missing");
}

const app = await readFile(resolve("apps/api/src/app.ts"), "utf8");
const currentPhase = Number(app.match(/phase:\s*(\d+)/)?.[1] ?? 0);
if (!app.includes("billingRoutes") || !app.includes("adminBillingRoutes") || currentPhase < 8) {
  throw new Error("Phase 8 billing routes or Phase 8+ API status are missing");
}

const premium = await readFile(resolve("apps/mobile/src/app/premium.tsx"), "utf8");
for (const marker of ["/plans", "/subscription", "/checkout", "/billing/simulated/confirm", "/subscription/cancel"]) {
  if (!premium.includes(marker)) throw new Error(`Premium mobile capability missing: ${marker}`);
}

const admin = await readFile(resolve("apps/admin/app/billing/page.tsx"), "utf8");
for (const marker of ["/admin/billing/plans", "/admin/billing/config", "Subscription activity", "Payment activity"]) {
  if (!admin.includes(marker)) throw new Error(`Billing admin capability missing: ${marker}`);
}

console.log("Phase 8 structure verified: configurable free/premium entitlements, plans, checkout idempotency, server confirmation, expiration, cancellation, premium boundaries, simulated development billing, and admin/mobile billing surfaces are present.");
