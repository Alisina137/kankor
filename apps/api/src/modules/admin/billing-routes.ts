import type { FastifyPluginAsync } from "fastify";
import { asc, desc, eq } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { requireAdmin } from "../../common/admin-auth.js";
import { getFreeEntitlements } from "../billing/service.js";

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function optionalString(value: unknown) {
  const valueString = stringValue(value);
  return valueString || null;
}
function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export const adminBillingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/billing/plans", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const db = createDatabase();
    const items = await db.select().from(schema.billingPlans)
      .orderBy(asc(schema.billingPlans.sortOrder), asc(schema.billingPlans.priceAfn));
    return { items };
  });

  app.post<{ Body: Record<string, unknown> }>("/billing/plans", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const code = stringValue(request.body.code).toLowerCase();
    const nameFa = stringValue(request.body.nameFa);
    const billingPeriod = stringValue(request.body.billingPeriod);
    const durationDays = Number(request.body.durationDays);
    const priceAfn = Number(request.body.priceAfn);
    if (
      !code || !nameFa || !billingPeriod
      || !Number.isInteger(durationDays) || durationDays < 1
      || !Number.isInteger(priceAfn) || priceAfn < 0
    ) {
      return reply.code(400).send({ error: "invalid_billing_plan" });
    }

    const db = createDatabase();
    const [item] = await db.insert(schema.billingPlans).values({
      code,
      nameFa,
      namePs: optionalString(request.body.namePs),
      nameEn: optionalString(request.body.nameEn),
      billingPeriod,
      durationDays,
      priceAfn,
      entitlements: objectValue(request.body.entitlements),
      active: Boolean(request.body.active),
      sortOrder: Number.isInteger(Number(request.body.sortOrder)) ? Number(request.body.sortOrder) : 0
    }).returning();

    return reply.code(201).send({ item });
  });

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>("/billing/plans/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const db = createDatabase();

    const rows = await db.select().from(schema.billingPlans)
      .where(eq(schema.billingPlans.id, request.params.id)).limit(1);
    if (!rows[0]) return reply.code(404).send({ error: "plan_not_found" });

    const values: Record<string, unknown> = { updatedAt: new Date() };
    if ("nameFa" in request.body) {
      const value = stringValue(request.body.nameFa);
      if (!value) return reply.code(400).send({ error: "invalid_plan_name" });
      values.nameFa = value;
    }
    if ("namePs" in request.body) values.namePs = optionalString(request.body.namePs);
    if ("nameEn" in request.body) values.nameEn = optionalString(request.body.nameEn);
    if ("billingPeriod" in request.body) {
      const value = stringValue(request.body.billingPeriod);
      if (!value) return reply.code(400).send({ error: "invalid_billing_period" });
      values.billingPeriod = value;
    }
    if ("durationDays" in request.body) {
      const value = Number(request.body.durationDays);
      if (!Number.isInteger(value) || value < 1) return reply.code(400).send({ error: "invalid_duration" });
      values.durationDays = value;
    }
    if ("priceAfn" in request.body) {
      const value = Number(request.body.priceAfn);
      if (!Number.isInteger(value) || value < 0) return reply.code(400).send({ error: "invalid_price" });
      values.priceAfn = value;
    }
    if ("entitlements" in request.body) values.entitlements = objectValue(request.body.entitlements);
    if ("active" in request.body) values.active = Boolean(request.body.active);
    if ("sortOrder" in request.body) values.sortOrder = Number(request.body.sortOrder) || 0;

    const [item] = await db.update(schema.billingPlans)
      .set(values as typeof schema.billingPlans.$inferInsert)
      .where(eq(schema.billingPlans.id, request.params.id))
      .returning();
    return { item };
  });

  app.get("/billing/config", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    return { freeEntitlements: await getFreeEntitlements() };
  });

  app.patch<{ Body: Record<string, unknown> }>("/billing/config", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const value = objectValue(request.body.freeEntitlements);
    if (!Object.keys(value).length) return reply.code(400).send({ error: "free_entitlements_required" });

    const db = createDatabase();
    await db.insert(schema.appConfiguration).values({
      key: "billing.free_entitlements",
      value,
      description: "Remote free-plan entitlement and usage limits.",
      active: true
    }).onConflictDoUpdate({
      target: schema.appConfiguration.key,
      set: {
        value,
        description: "Remote free-plan entitlement and usage limits.",
        active: true,
        updatedAt: new Date()
      }
    });

    return { freeEntitlements: await getFreeEntitlements() };
  });

  app.get("/billing/subscriptions", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const db = createDatabase();
    const items = await db.select({
      id: schema.subscriptions.id,
      userEmail: schema.users.email,
      planCode: schema.billingPlans.code,
      planNameFa: schema.billingPlans.nameFa,
      status: schema.subscriptions.status,
      provider: schema.subscriptions.provider,
      currentPeriodStart: schema.subscriptions.currentPeriodStart,
      currentPeriodEnd: schema.subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: schema.subscriptions.cancelAtPeriodEnd,
      createdAt: schema.subscriptions.createdAt
    }).from(schema.subscriptions)
      .innerJoin(schema.users, eq(schema.subscriptions.userId, schema.users.id))
      .innerJoin(schema.billingPlans, eq(schema.subscriptions.planId, schema.billingPlans.id))
      .orderBy(desc(schema.subscriptions.createdAt))
      .limit(200);

    return { items };
  });

  app.get("/billing/payments", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const db = createDatabase();
    const items = await db.select({
      id: schema.paymentTransactions.id,
      userEmail: schema.users.email,
      planCode: schema.billingPlans.code,
      provider: schema.paymentTransactions.provider,
      providerPaymentId: schema.paymentTransactions.providerPaymentId,
      status: schema.paymentTransactions.status,
      amountAfn: schema.paymentTransactions.amountAfn,
      confirmedAt: schema.paymentTransactions.confirmedAt,
      createdAt: schema.paymentTransactions.createdAt
    }).from(schema.paymentTransactions)
      .innerJoin(schema.users, eq(schema.paymentTransactions.userId, schema.users.id))
      .innerJoin(schema.billingPlans, eq(schema.paymentTransactions.planId, schema.billingPlans.id))
      .orderBy(desc(schema.paymentTransactions.createdAt))
      .limit(200);

    return { items };
  });
};
