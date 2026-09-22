import { and, desc, eq, gt, sql } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";

export type FreeEntitlements = {
  dailyQuestionAllowance: number;
  topicExamsPerDay: number;
  subjectExamsPerDay: number;
  bookExamsPerDay: number;
  chapterExamsPerDay: number;
  customExamsPerDay: number;
  fullKankorPerDay: number;
  historicalFormsPerDay: number;
  maxQuestionsPerTargetedExam: number;
  progressHistoryLimit: number;
  detailedExplanationsPerDay: number;
  mistakeNotebook: boolean;
  weaknessPractice: boolean;
  completeAnalytics: boolean;
};

const DEFAULT_FREE: FreeEntitlements = {
  dailyQuestionAllowance: 50,
  topicExamsPerDay: 3,
  subjectExamsPerDay: 1,
  bookExamsPerDay: 1,
  chapterExamsPerDay: 2,
  customExamsPerDay: 0,
  fullKankorPerDay: 0,
  historicalFormsPerDay: 1,
  maxQuestionsPerTargetedExam: 10,
  progressHistoryLimit: 5,
  detailedExplanationsPerDay: 5,
  mistakeNotebook: false,
  weaknessPractice: false,
  completeAnalytics: false
};

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function boolValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export async function getFreeEntitlements(): Promise<FreeEntitlements> {
  const db = createDatabase();
  const rows = await db.select({ value: schema.appConfiguration.value })
    .from(schema.appConfiguration)
    .where(and(
      eq(schema.appConfiguration.key, "billing.free_entitlements"),
      eq(schema.appConfiguration.active, true)
    ))
    .limit(1);
  const value = rows[0]?.value && typeof rows[0].value === "object"
    ? rows[0].value as Record<string, unknown>
    : {};

  return {
    dailyQuestionAllowance: numberValue(value.dailyQuestionAllowance, DEFAULT_FREE.dailyQuestionAllowance),
    topicExamsPerDay: numberValue(value.topicExamsPerDay, DEFAULT_FREE.topicExamsPerDay),
    subjectExamsPerDay: numberValue(value.subjectExamsPerDay, DEFAULT_FREE.subjectExamsPerDay),
    bookExamsPerDay: numberValue(value.bookExamsPerDay, DEFAULT_FREE.bookExamsPerDay),
    chapterExamsPerDay: numberValue(value.chapterExamsPerDay, DEFAULT_FREE.chapterExamsPerDay),
    customExamsPerDay: numberValue(value.customExamsPerDay, DEFAULT_FREE.customExamsPerDay),
    fullKankorPerDay: numberValue(value.fullKankorPerDay, DEFAULT_FREE.fullKankorPerDay),
    historicalFormsPerDay: numberValue(value.historicalFormsPerDay, DEFAULT_FREE.historicalFormsPerDay),
    maxQuestionsPerTargetedExam: numberValue(value.maxQuestionsPerTargetedExam, DEFAULT_FREE.maxQuestionsPerTargetedExam),
    progressHistoryLimit: numberValue(value.progressHistoryLimit, DEFAULT_FREE.progressHistoryLimit),
    detailedExplanationsPerDay: numberValue(value.detailedExplanationsPerDay, DEFAULT_FREE.detailedExplanationsPerDay),
    mistakeNotebook: boolValue(value.mistakeNotebook, DEFAULT_FREE.mistakeNotebook),
    weaknessPractice: boolValue(value.weaknessPractice, DEFAULT_FREE.weaknessPractice),
    completeAnalytics: boolValue(value.completeAnalytics, DEFAULT_FREE.completeAnalytics)
  };
}

export async function expireSubscriptions(userId?: string) {
  const db = createDatabase();
  const now = new Date();
  const conditions = [
    eq(schema.subscriptions.status, "active"),
    sql`${schema.subscriptions.currentPeriodEnd} IS NOT NULL`,
    sql`${schema.subscriptions.currentPeriodEnd} <= ${now}`
  ];
  if (userId) conditions.push(eq(schema.subscriptions.userId, userId));

  await db.update(schema.subscriptions)
    .set({ status: "expired", updatedAt: now })
    .where(and(...conditions));
}

export async function getEntitlementState(userId: string) {
  await expireSubscriptions(userId);
  const db = createDatabase();
  const now = new Date();
  const rows = await db.select({
    subscription: schema.subscriptions,
    planCode: schema.billingPlans.code,
    planNameFa: schema.billingPlans.nameFa,
    planNamePs: schema.billingPlans.namePs,
    planNameEn: schema.billingPlans.nameEn
  }).from(schema.subscriptions)
    .innerJoin(schema.billingPlans, eq(schema.subscriptions.planId, schema.billingPlans.id))
    .where(and(
      eq(schema.subscriptions.userId, userId),
      eq(schema.subscriptions.status, "active"),
      gt(schema.subscriptions.currentPeriodEnd, now)
    ))
    .orderBy(desc(schema.subscriptions.currentPeriodEnd))
    .limit(1);

  const active = rows[0];
  if (active) {
    return {
      tier: "premium" as const,
      subscription: {
        id: active.subscription.id,
        status: active.subscription.status,
        planCode: active.planCode,
        planNameFa: active.planNameFa,
        planNamePs: active.planNamePs,
        planNameEn: active.planNameEn,
        currentPeriodStart: active.subscription.currentPeriodStart,
        currentPeriodEnd: active.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: active.subscription.cancelAtPeriodEnd,
        provider: active.subscription.provider
      },
      entitlements: {
        historicalArchive: true,
        highLimitExams: true,
        detailedExplanations: true,
        workedSolutions: true,
        completeAnalytics: true,
        mistakeNotebook: true,
        weaknessPractice: true,
        extendedHistory: true,
        ...(active.subscription.entitlementSnapshot as Record<string, unknown>)
      }
    };
  }

  return {
    tier: "free" as const,
    subscription: null,
    entitlements: await getFreeEntitlements()
  };
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export async function getUsage(userId: string, key: string) {
  const db = createDatabase();
  const rows = await db.select({ count: schema.entitlementUsage.count })
    .from(schema.entitlementUsage)
    .where(and(
      eq(schema.entitlementUsage.userId, userId),
      eq(schema.entitlementUsage.usageDate, todayUtc()),
      eq(schema.entitlementUsage.key, key)
    ))
    .limit(1);
  return rows[0]?.count ?? 0;
}

export async function consumeUsage(userId: string, key: string, amount = 1) {
  if (amount <= 0) return;
  const db = createDatabase();
  await db.insert(schema.entitlementUsage).values({
    userId,
    usageDate: todayUtc(),
    key,
    count: amount
  }).onConflictDoUpdate({
    target: [
      schema.entitlementUsage.userId,
      schema.entitlementUsage.usageDate,
      schema.entitlementUsage.key
    ],
    set: {
      count: sql`${schema.entitlementUsage.count} + ${amount}`,
      updatedAt: new Date()
    }
  });
}

const MODE_KEYS: Record<string, keyof FreeEntitlements> = {
  topic: "topicExamsPerDay",
  subject: "subjectExamsPerDay",
  book: "bookExamsPerDay",
  chapter: "chapterExamsPerDay",
  custom: "customExamsPerDay",
  full_kankor: "fullKankorPerDay"
};

export async function authorizeExamStart(userId: string, mode: string, questionCount: number) {
  const state = await getEntitlementState(userId);
  if (state.tier === "premium") return { allowed: true as const, tier: state.tier };

  const free = state.entitlements as FreeEntitlements;
  if (mode !== "full_kankor" && questionCount > free.maxQuestionsPerTargetedExam) {
    return {
      allowed: false as const,
      error: "premium_required",
      reason: "question_count_limit",
      limit: free.maxQuestionsPerTargetedExam
    };
  }

  const configKey = MODE_KEYS[mode];
  if (!configKey) return { allowed: true as const, tier: state.tier };
  const limit = Number(free[configKey]);
  const usageKey = `exam:${mode}`;
  const used = await getUsage(userId, usageKey);

  if (limit <= 0 || used >= limit) {
    return {
      allowed: false as const,
      error: "premium_required",
      reason: "daily_exam_limit",
      limit,
      used
    };
  }

  return { allowed: true as const, tier: state.tier, usageKey };
}

export async function recordExamStart(userId: string, mode: string, questionCount: number) {
  const state = await getEntitlementState(userId);
  if (state.tier === "premium") return;
  await consumeUsage(userId, `exam:${mode}`, 1);
  await consumeUsage(userId, "questions", questionCount);
}

export async function authorizeHistoricalStart(userId: string, accessTier: string) {
  const state = await getEntitlementState(userId);
  if (state.tier === "premium") return { allowed: true as const };
  if (accessTier === "premium") {
    return { allowed: false as const, error: "premium_required", reason: "historical_archive" };
  }

  const free = state.entitlements as FreeEntitlements;
  const used = await getUsage(userId, "historical");
  if (free.historicalFormsPerDay <= 0 || used >= free.historicalFormsPerDay) {
    return {
      allowed: false as const,
      error: "premium_required",
      reason: "historical_daily_limit",
      limit: free.historicalFormsPerDay,
      used
    };
  }
  return { allowed: true as const };
}

export async function recordHistoricalStart(userId: string) {
  const state = await getEntitlementState(userId);
  if (state.tier === "free") await consumeUsage(userId, "historical", 1);
}


export async function confirmPayment(providerPaymentId: string, providerPayload: Record<string, unknown> = {}) {
  const db = createDatabase();
  const payments = await db.select({
    payment: schema.paymentTransactions,
    planDurationDays: schema.billingPlans.durationDays,
    planEntitlements: schema.billingPlans.entitlements
  }).from(schema.paymentTransactions)
    .innerJoin(schema.billingPlans, eq(schema.paymentTransactions.planId, schema.billingPlans.id))
    .where(eq(schema.paymentTransactions.providerPaymentId, providerPaymentId))
    .limit(1);

  const row = payments[0];
  if (!row) return { ok: false as const, error: "payment_not_found" };
  if (row.payment.status === "confirmed") {
    return { ok: true as const, alreadyConfirmed: true, subscriptionId: row.payment.subscriptionId };
  }
  if (row.payment.status !== "pending") {
    return { ok: false as const, error: "payment_not_pending" };
  }
  if (!row.payment.subscriptionId) {
    return { ok: false as const, error: "subscription_not_found" };
  }

  const subscriptions = await db.select().from(schema.subscriptions)
    .where(eq(schema.subscriptions.id, row.payment.subscriptionId))
    .limit(1);
  const subscription = subscriptions[0];
  if (!subscription) return { ok: false as const, error: "subscription_not_found" };
  if (subscription.status === "active") {
    await db.update(schema.paymentTransactions).set({
      status: "confirmed",
      confirmedAt: new Date(),
      providerPayload,
      updatedAt: new Date()
    }).where(eq(schema.paymentTransactions.id, row.payment.id));
    return { ok: true as const, alreadyConfirmed: true, subscriptionId: subscription.id };
  }

  const start = new Date();
  const end = new Date(start.getTime() + row.planDurationDays * 24 * 60 * 60 * 1000);

  await db.update(schema.subscriptions).set({
    status: "active",
    currentPeriodStart: start,
    currentPeriodEnd: end,
    entitlementSnapshot: row.planEntitlements,
    updatedAt: new Date()
  }).where(eq(schema.subscriptions.id, subscription.id));

  await db.update(schema.paymentTransactions).set({
    status: "confirmed",
    confirmedAt: new Date(),
    providerPayload,
    updatedAt: new Date()
  }).where(eq(schema.paymentTransactions.id, row.payment.id));

  return {
    ok: true as const,
    alreadyConfirmed: false,
    subscriptionId: subscription.id,
    currentPeriodEnd: end
  };
}

export async function failPayment(providerPaymentId: string, providerPayload: Record<string, unknown> = {}) {
  const db = createDatabase();
  const rows = await db.select().from(schema.paymentTransactions)
    .where(eq(schema.paymentTransactions.providerPaymentId, providerPaymentId))
    .limit(1);
  const payment = rows[0];
  if (!payment) return { ok: false as const, error: "payment_not_found" };
  if (payment.status === "confirmed") return { ok: false as const, error: "payment_already_confirmed" };
  if (payment.status === "failed") return { ok: true as const, alreadyFailed: true };

  await db.update(schema.paymentTransactions).set({
    status: "failed",
    providerPayload,
    updatedAt: new Date()
  }).where(eq(schema.paymentTransactions.id, payment.id));

  if (payment.subscriptionId) {
    await db.update(schema.subscriptions).set({
      status: "failed",
      updatedAt: new Date()
    }).where(eq(schema.subscriptions.id, payment.subscriptionId));
  }

  return { ok: true as const, alreadyFailed: false };
}
