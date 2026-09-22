"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

type Plan = {
  id: string;
  code: string;
  nameFa: string;
  namePs: string | null;
  nameEn: string | null;
  billingPeriod: string;
  durationDays: number;
  priceAfn: number;
  entitlements: Record<string, unknown>;
  active: boolean;
  sortOrder: number;
};

type Subscription = {
  id: string;
  userEmail: string;
  planCode: string;
  planNameFa: string;
  status: string;
  provider: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
};

type Payment = {
  id: string;
  userEmail: string;
  planCode: string;
  provider: string;
  providerPaymentId: string;
  status: string;
  amountAfn: number;
  confirmedAt: string | null;
  createdAt: string;
};

async function request<T>(path: string, options: RequestInit = {}, token?: string) {
  const headers = new Headers(options.headers);
  if (options.body != null) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}/api/v1${path}`, { ...options, headers });
  const body = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "request_failed");
  return body as T;
}

export default function BillingAdminPage() {
  const [token, setToken] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [freeConfig, setFreeConfig] = useState("{}");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (authToken: string) => {
    const [planResult, configResult, subscriptionResult, paymentResult] = await Promise.all([
      request<{ items: Plan[] }>("/admin/billing/plans", {}, authToken),
      request<{ freeEntitlements: Record<string, unknown> }>("/admin/billing/config", {}, authToken),
      request<{ items: Subscription[] }>("/admin/billing/subscriptions", {}, authToken),
      request<{ items: Payment[] }>("/admin/billing/payments", {}, authToken)
    ]);
    setPlans(planResult.items);
    setFreeConfig(JSON.stringify(configResult.freeEntitlements, null, 2));
    setSubscriptions(subscriptionResult.items);
    setPayments(paymentResult.items);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("kankor-admin-token") ?? "";
    setToken(saved);
    if (saved) void load(saved).catch(() => setStatus("بارگیری اطلاعات Billing ناموفق بود."));
  }, [load]);

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setStatus("");
    try {
      await request("/admin/billing/plans", {
        method: "POST",
        body: JSON.stringify({
          code: data.get("code"),
          nameFa: data.get("nameFa"),
          namePs: data.get("namePs"),
          nameEn: data.get("nameEn"),
          billingPeriod: data.get("billingPeriod"),
          durationDays: Number(data.get("durationDays")),
          priceAfn: Number(data.get("priceAfn")),
          active: data.get("active") === "on",
          entitlements: {
            historicalArchive: true,
            highLimitExams: true,
            detailedExplanations: true,
            workedSolutions: true,
            completeAnalytics: true,
            mistakeNotebook: true,
            weaknessPractice: true,
            extendedHistory: true
          }
        })
      }, token);
      form.reset();
      await load(token);
      setStatus("پلن ذخیره شد.");
    } catch (error) {
      setStatus(`ذخیره پلن ناموفق بود: ${error instanceof Error ? error.message : "خطا"}`);
    } finally {
      setBusy(false);
    }
  }

  async function togglePlan(plan: Plan) {
    if (!token) return;
    setBusy(true);
    setStatus("");
    try {
      await request(`/admin/billing/plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !plan.active })
      }, token);
      await load(token);
    } catch (error) {
      setStatus(`تغییر پلن ناموفق بود: ${error instanceof Error ? error.message : "خطا"}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveFreeConfig() {
    if (!token) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(freeConfig);
    } catch {
      setStatus("JSON محدودیت‌های رایگان معتبر نیست.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const result = await request<{ freeEntitlements: Record<string, unknown> }>("/admin/billing/config", {
        method: "PATCH",
        body: JSON.stringify({ freeEntitlements: parsed })
      }, token);
      setFreeConfig(JSON.stringify(result.freeEntitlements, null, 2));
      setStatus("محدودیت‌های رایگان به‌روزرسانی شد.");
    } catch (error) {
      setStatus(`ذخیره تنظیمات ناموفق بود: ${error instanceof Error ? error.message : "خطا"}`);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="shell">
        <p className="eyebrow">KankorPrep Afghanistan</p>
        <h1>Billing & Entitlements</h1>
        <p>ابتدا از صفحه اصلی مدیریت وارد شوید.</p>
        <a href="/">بازگشت به مدیریت</a>
      </main>
    );
  }

  return (
    <main className="shell wide">
      <header className="topbar">
        <div>
          <p className="eyebrow">Phase 8</p>
          <h1>Billing & Entitlements</h1>
          <p>قیمت‌ها، دوره‌ها و محدودیت‌های رایگان از اینجا تنظیم می‌شوند و در کد ثابت نیستند.</p>
        </div>
        <div className="inline-actions">
          <a href="/">مدیریت محتوا</a>
          <a href="/historical">فورم‌های تاریخی</a>
          <a href="/exams">طرح امتحان</a>
        </div>
      </header>

      {status ? <div className="notice">{status}</div> : null}

      <form className="card form" onSubmit={createPlan}>
        <h2>ایجاد پلن Premium</h2>
        <div className="three">
          <label>کُد<input name="code" required placeholder="premium-monthly" /></label>
          <label>مدت (روز)<input name="durationDays" type="number" min="1" required /></label>
          <label>قیمت AFN<input name="priceAfn" type="number" min="0" required /></label>
        </div>
        <div className="three">
          <label>نام دری<input name="nameFa" required /></label>
          <label>نام پشتو<input name="namePs" /></label>
          <label>نام انگلیسی<input name="nameEn" /></label>
        </div>
        <label>نوع دوره
          <select name="billingPeriod" defaultValue="monthly">
            <option value="monthly">Monthly</option>
            <option value="multi_month">Multi-month / Kankor season</option>
            <option value="annual">Annual</option>
          </select>
        </label>
        <label className="checkbox-row"><input name="active" type="checkbox" /> فعال و قابل خرید</label>
        <button disabled={busy}>{busy ? "در حال ذخیره..." : "ذخیره پلن"}</button>
      </form>

      <section className="card">
        <h2>پلن‌ها</h2>
        <div className="list">
          {plans.length ? plans.map((plan) => (
            <div className="list-item" key={plan.id}>
              <div>
                <strong>{plan.nameFa}</strong>
                <small>{plan.code} · {plan.durationDays} روز · {plan.priceAfn} AFN</small>
              </div>
              <div className="inline-actions">
                <span className="badge">{plan.active ? "active" : "inactive"}</span>
                <button className="secondary" disabled={busy} onClick={() => void togglePlan(plan)}>
                  {plan.active ? "غیرفعال" : "فعال"}
                </button>
              </div>
            </div>
          )) : <p>هنوز هیچ پلن قیمتی تعریف نشده است.</p>}
        </div>
      </section>

      <section className="card form">
        <h2>محدودیت‌های پلن رایگان</h2>
        <p>این اعداد development defaults هستند و باید با داده واقعی محصول تنظیم شوند.</p>
        <textarea rows={18} value={freeConfig} onChange={(event) => setFreeConfig(event.target.value)} />
        <button disabled={busy} onClick={() => void saveFreeConfig()}>ذخیره محدودیت‌ها</button>
      </section>

      <section className="card">
        <h2>Subscription activity</h2>
        <div className="list">
          {subscriptions.length ? subscriptions.map((item) => (
            <div className="list-item" key={item.id}>
              <div>
                <strong>{item.userEmail}</strong>
                <small>{item.planCode} · {item.provider} · {item.currentPeriodEnd ? new Date(item.currentPeriodEnd).toLocaleString() : "pending"}</small>
              </div>
              <span className="badge">{item.status}{item.cancelAtPeriodEnd ? " · cancel at end" : ""}</span>
            </div>
          )) : <p>هنوز subscription وجود ندارد.</p>}
        </div>
      </section>

      <section className="card">
        <h2>Payment activity</h2>
        <div className="list">
          {payments.length ? payments.map((item) => (
            <div className="list-item" key={item.id}>
              <div>
                <strong>{item.userEmail} — {item.amountAfn} AFN</strong>
                <small>{item.planCode} · {item.providerPaymentId}</small>
              </div>
              <span className="badge">{item.status}</span>
            </div>
          )) : <p>هنوز پرداختی وجود ندارد.</p>}
        </div>
      </section>
    </main>
  );
}
