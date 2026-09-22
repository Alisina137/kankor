import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { requireUser } from "../../common/user-auth.js";
import { confirmPayment, failPayment, getEntitlementState } from "./service.js";

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export const billingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/plans", async () => {
    const db = createDatabase();
    const items = await db.select({
      id: schema.billingPlans.id,
      code: schema.billingPlans.code,
      nameFa: schema.billingPlans.nameFa,
      namePs: schema.billingPlans.namePs,
      nameEn: schema.billingPlans.nameEn,
      billingPeriod: schema.billingPlans.billingPeriod,
      durationDays: schema.billingPlans.durationDays,
      priceAfn: schema.billingPlans.priceAfn,
      entitlements: schema.billingPlans.entitlements
    }).from(schema.billingPlans)
      .where(eq(schema.billingPlans.active, true))
      .orderBy(asc(schema.billingPlans.sortOrder), asc(schema.billingPlans.priceAfn));

    return { items };
  });

  app.get("/subscription", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    return getEntitlementState(auth.user.userId);
  });

  app.post<{ Body: { planId?: string; provider?: string; idempotencyKey?: string } }>("/checkout", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;

    const planId = stringValue(request.body?.planId);
    const provider = stringValue(request.body?.provider) || "simulated";
    const idempotencyKey = stringValue(request.body?.idempotencyKey);
    if (!planId || !idempotencyKey) return reply.code(400).send({ error: "plan_and_idempotency_required" });
    if (provider !== "simulated") return reply.code(400).send({ error: "provider_not_configured" });

    const state = await getEntitlementState(auth.user.userId);
    if (state.tier === "premium") {
      return reply.code(409).send({ error: "subscription_already_active" });
    }

    const db = createDatabase();
    const existing = await db.select({
      paymentId: schema.paymentTransactions.id,
      providerPaymentId: schema.paymentTransactions.providerPaymentId,
      status: schema.paymentTransactions.status,
      amountAfn: schema.paymentTransactions.amountAfn,
      subscriptionId: schema.paymentTransactions.subscriptionId
    }).from(schema.paymentTransactions)
      .where(and(
        eq(schema.paymentTransactions.userId, auth.user.userId),
        eq(schema.paymentTransactions.idempotencyKey, idempotencyKey)
      ))
      .limit(1);

    if (existing[0]) {
      return {
        checkout: {
          ...existing[0],
          provider: "simulated",
          confirmationMode: "simulated_server_confirmation"
        }
      };
    }

    const plans = await db.select().from(schema.billingPlans)
      .where(and(
        eq(schema.billingPlans.id, planId),
        eq(schema.billingPlans.active, true)
      ))
      .limit(1);
    const plan = plans[0];
    if (!plan) return reply.code(404).send({ error: "plan_not_found" });

    const [subscription] = await db.insert(schema.subscriptions).values({
      userId: auth.user.userId,
      planId: plan.id,
      status: "pending",
      provider,
      entitlementSnapshot: plan.entitlements
    }).returning({ id: schema.subscriptions.id });

    const providerPaymentId = `sim_${randomUUID()}`;
    const [payment] = await db.insert(schema.paymentTransactions).values({
      userId: auth.user.userId,
      planId: plan.id,
      subscriptionId: subscription.id,
      provider,
      providerPaymentId,
      idempotencyKey,
      status: "pending",
      amountAfn: plan.priceAfn,
      providerPayload: { simulation: true }
    }).returning({
      id: schema.paymentTransactions.id,
      providerPaymentId: schema.paymentTransactions.providerPaymentId,
      status: schema.paymentTransactions.status,
      amountAfn: schema.paymentTransactions.amountAfn
    });

    return reply.code(201).send({
      checkout: {
        paymentId: payment.id,
        providerPaymentId: payment.providerPaymentId,
        subscriptionId: subscription.id,
        status: payment.status,
        amountAfn: payment.amountAfn,
        provider,
        confirmationMode: "simulated_server_confirmation"
      }
    });
  });

  app.post<{ Body: { providerPaymentId?: string } }>("/billing/simulated/confirm", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    if (process.env.NODE_ENV === "production") {
      return reply.code(404).send({ error: "not_found" });
    }

    const providerPaymentId = stringValue(request.body?.providerPaymentId);
    if (!providerPaymentId) return reply.code(400).send({ error: "payment_id_required" });

    const db = createDatabase();
    const owned = await db.select({ id: schema.paymentTransactions.id })
      .from(schema.paymentTransactions)
      .where(and(
        eq(schema.paymentTransactions.userId, auth.user.userId),
        eq(schema.paymentTransactions.providerPaymentId, providerPaymentId),
        eq(schema.paymentTransactions.provider, "simulated")
      ))
      .limit(1);
    if (!owned[0]) return reply.code(404).send({ error: "payment_not_found" });

    const result = await confirmPayment(providerPaymentId, {
      simulation: true,
      confirmedBy: "development_endpoint"
    });
    if (!result.ok) return reply.code(409).send({ error: result.error });
    return { confirmed: true, ...result, entitlement: await getEntitlementState(auth.user.userId) };
  });

  app.post<{ Body: { providerPaymentId?: string; status?: string; payload?: Record<string, unknown> } }>("/billing/webhook", async (request, reply) => {
    const expectedSecret = process.env.BILLING_WEBHOOK_SECRET;
    if (!expectedSecret) return reply.code(503).send({ error: "billing_webhook_not_configured" });

    const suppliedSecret = request.headers["x-billing-secret"];
    if (suppliedSecret !== expectedSecret) return reply.code(401).send({ error: "invalid_webhook_signature" });

    const providerPaymentId = stringValue(request.body?.providerPaymentId);
    const status = stringValue(request.body?.status);
    const payload = request.body?.payload && typeof request.body.payload === "object"
      ? request.body.payload
      : {};
    if (!providerPaymentId || !["confirmed", "failed"].includes(status)) {
      return reply.code(400).send({ error: "invalid_webhook_payload" });
    }

    const result = status === "confirmed"
      ? await confirmPayment(providerPaymentId, payload)
      : await failPayment(providerPaymentId, payload);

    if (!result.ok) {
      const code = result.error === "payment_not_found" ? 404 : 409;
      return reply.code(code).send({ error: result.error });
    }
    return { received: true, ...result };
  });

  app.post("/subscription/cancel", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const db = createDatabase();
    const now = new Date();

    const rows = await db.select().from(schema.subscriptions)
      .where(and(
        eq(schema.subscriptions.userId, auth.user.userId),
        eq(schema.subscriptions.status, "active"),
        gt(schema.subscriptions.currentPeriodEnd, now)
      ))
      .orderBy(desc(schema.subscriptions.currentPeriodEnd))
      .limit(1);

    const subscription = rows[0];
    if (!subscription) return reply.code(404).send({ error: "active_subscription_not_found" });

    await db.update(schema.subscriptions).set({
      cancelAtPeriodEnd: true,
      canceledAt: now,
      updatedAt: now
    }).where(eq(schema.subscriptions.id, subscription.id));

    return {
      canceled: true,
      accessUntil: subscription.currentPeriodEnd,
      entitlement: await getEntitlementState(auth.user.userId)
    };
  });
};
