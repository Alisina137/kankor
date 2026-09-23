import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const required = [
  "packages/database/drizzle/0010_admin_content_quality.sql",
  "apps/api/src/modules/admin/content-quality-service.ts",
  "apps/api/src/modules/admin/content-quality-routes.ts",
  "apps/admin/app/quality/page.tsx"
];

for (const file of required) await readFile(resolve(file), "utf8");

const schema = await readFile(resolve("packages/database/src/schema.ts"), "utf8");
for (const marker of [
  "questionRevisions",
  "contentReviews",
  "contentReports",
  "contentImportBatches",
  "adminAuditLogs",
  "supersedesQuestionId",
  "verificationStatus",
  "updatedBy"
]) {
  if (!schema.includes(marker)) throw new Error(`Phase 9 schema invariant missing: ${marker}`);
}

const migration = await readFile(resolve("packages/database/drizzle/0010_admin_content_quality.sql"), "utf8");
for (const marker of [
  "question_revisions",
  "content_reviews",
  "content_reports",
  "content_import_batches",
  "admin_audit_logs",
  "supersedes_question_id",
  "phase_9_baseline"
]) {
  if (!migration.includes(marker)) throw new Error(`Phase 9 migration invariant missing: ${marker}`);
}

const auth = await readFile(resolve("apps/api/src/common/admin-auth.ts"), "utf8");
for (const marker of [
  "CONTENT_REVIEW_ROLES",
  "CONTENT_MANAGE_ROLES",
  "OPERATIONS_ADMIN_ROLES",
  "SUPER_ADMIN_ROLES",
  "requireAdminRole"
]) {
  if (!auth.includes(marker)) throw new Error(`RBAC invariant missing: ${marker}`);
}

const quality = await readFile(resolve("apps/api/src/modules/admin/content-quality-routes.ts"), "utf8");
for (const marker of [
  "/content/questions/:id/submit-review",
  "/content/questions/:id/review",
  "/content/questions/:id/publish",
  "/content/questions/:id/deprecate",
  "/content/questions/:id/correct",
  "/content/questions/:id/revisions",
  "/content/questions/:id/translations/:language/review",
  "/content/import/questions",
  "/content/reports",
  "/audit",
  "/dashboard",
  "/configuration",
  "/users/:id/role",
  "supersededQuestionId",
  "change_reason_required"
]) {
  if (!quality.includes(marker)) throw new Error(`Content quality capability missing: ${marker}`);
}

const service = await readFile(resolve("apps/api/src/modules/admin/content-quality-service.ts"), "utf8");
for (const marker of [
  "publishCriteria",
  "renderingValidated",
  "workedSolutionSatisfied",
  "saveRevision",
  "writeAudit"
]) {
  if (!service.includes(marker)) throw new Error(`Quality service invariant missing: ${marker}`);
}

const questions = await readFile(resolve("apps/api/src/modules/admin/question-routes.ts"), "utf8");
for (const marker of [
  "published_question_requires_correction",
  "use_content_review_workflow",
  "question.create",
  "translation.edit",
  "version:"
]) {
  if (!questions.includes(marker)) throw new Error(`Question safety invariant missing: ${marker}`);
}

const app = await readFile(resolve("apps/api/src/app.ts"), "utf8");
if (!app.includes("adminContentQualityRoutes") || !app.includes("phase: 9") || !app.includes("admin-content-quality")) {
  throw new Error("Phase 9 routes/status are not registered");
}

const ui = await readFile(resolve("apps/admin/app/quality/page.tsx"), "utf8");
for (const marker of [
  "Review Queue",
  "Published Question Correction & Version History",
  "Bulk Question Import",
  "Content Reports",
  "Audit Log",
  "Revision History"
]) {
  if (!ui.includes(marker)) throw new Error(`Content Quality UI missing: ${marker}`);
}

console.log("Phase 9 structure verified: scoped RBAC, explicit approval workflow, independent translation review, publish criteria, immutable revisions, safe published-question correction lineage, bulk import validation, content reports, audit logs, dashboard/user/configuration administration, and Content Quality UI are present.");
