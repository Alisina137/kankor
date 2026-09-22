"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

type Blueprint = {
  id: string;
  code: string;
  name: string;
  effectiveYear: number | null;
  questionCount: number;
  durationSeconds: number | null;
  criteria: Record<string, unknown>;
  scoringRules: { correctMultiplier?: number; incorrectMultiplier?: number; unansweredMultiplier?: number; floorAtZero?: boolean } | null;
  active: boolean;
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

export default function ExamBlueprintPage() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<Blueprint[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (authToken: string) => {
    const result = await request<{ items: Blueprint[] }>("/admin/exam-blueprints", {}, authToken);
    setItems(result.items);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("kankor-admin-token") ?? "";
    setToken(saved);
    if (saved) {
      void load(saved).catch(() => setStatus("دسترسی مدیریت یا اتصال API ناموفق است."));
    }
  }, [load]);

  async function createBlueprint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const data = new FormData(form);

    let criteria: Record<string, unknown> = {};
    const rawCriteria = String(data.get("criteria") ?? "").trim();
    if (rawCriteria) {
      try {
        criteria = JSON.parse(rawCriteria) as Record<string, unknown>;
      } catch {
        setStatus("Criteria باید JSON معتبر باشد.");
        return;
      }
    }

    const durationMinutes = String(data.get("durationMinutes") ?? "").trim();
    setBusy(true);
    setStatus("");
    try {
      await request("/admin/exam-blueprints", {
        method: "POST",
        body: JSON.stringify({
          code: data.get("code"),
          name: data.get("name"),
          effectiveYear: data.get("effectiveYear") ? Number(data.get("effectiveYear")) : null,
          questionCount: Number(data.get("questionCount")),
          durationSeconds: durationMinutes ? Number(durationMinutes) * 60 : null,
          criteria,
          scoringRules: {
            mode: "question_marks",
            correctMultiplier: Number(data.get("correctMultiplier")),
            incorrectMultiplier: Number(data.get("incorrectMultiplier")),
            unansweredMultiplier: Number(data.get("unansweredMultiplier")),
            floorAtZero: data.get("floorAtZero") === "on"
          },
          active: data.get("active") === "on"
        })
      }, token);
      form.reset();
      await load(token);
      setStatus("طرح امتحان ذخیره شد.");
    } catch (error) {
      setStatus(`ذخیره نشد: ${error instanceof Error ? error.message : "خطا"}`);
    } finally {
      setBusy(false);
    }
  }

  async function activate(id: string) {
    if (!token) return;
    setBusy(true);
    setStatus("");
    try {
      await request(`/admin/exam-blueprints/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: true })
      }, token);
      await load(token);
      setStatus("طرح فعال شد.");
    } catch (error) {
      setStatus(`فعال‌سازی ناموفق بود: ${error instanceof Error ? error.message : "خطا"}`);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="shell">
        <p className="eyebrow">KankorPrep Afghanistan</p>
        <h1>مدیریت طرح امتحان</h1>
        <p>ابتدا از صفحه اصلی مدیریت وارد شوید.</p>
        <a href="/">بازگشت به ورود مدیریت</a>
      </main>
    );
  }

  return (
    <main className="shell wide">
      <header className="topbar">
        <div>
          <p className="eyebrow">Phase 4</p>
          <h1>طرح امتحان کانکور</h1>
          <p>قواعد سالانه مانند تعداد سوال، زمان و امتیازدهی از اینجا تنظیم می‌شوند و در کد ثابت نیستند.</p>
        </div>
        <a href="/">مدیریت محتوا</a>
      </header>

      {status ? <div className="notice">{status}</div> : null}

      <form className="card form" onSubmit={createBlueprint}>
        <h2>طرح جدید</h2>
        <div className="two">
          <label>کُد<input name="code" placeholder="kankor-1405" required /></label>
          <label>نام<input name="name" placeholder="کانکور کامل ۱۴۰۵" required /></label>
        </div>
        <div className="three">
          <label>سال مؤثر<input name="effectiveYear" type="number" min="1" /></label>
          <label>تعداد سوال<input name="questionCount" type="number" min="1" max="160" required /></label>
          <label>زمان به دقیقه (اختیاری)<input name="durationMinutes" type="number" min="1" /></label>
        </div>
        <div className="three">
          <label>ضریب جواب صحیح<input name="correctMultiplier" type="number" step="0.0001" required placeholder="مثلاً 1" /></label>
          <label>ضریب جواب غلط<input name="incorrectMultiplier" type="number" step="0.0001" required placeholder="قانون رسمی را وارد کنید" /></label>
          <label>ضریب بی‌پاسخ<input name="unansweredMultiplier" type="number" step="0.0001" required placeholder="قانون رسمی را وارد کنید" /></label>
        </div>
        <label className="checkbox-row"><input name="floorAtZero" type="checkbox" /> نمره نهایی کمتر از صفر نشود</label>
        <p>ضرایب امتیازدهی را فقط بر اساس قانون معتبر همان دوره کانکور وارد کنید.</p>
        <label>
          Criteria JSON (اختیاری)
          <textarea
            name="criteria"
            rows={4}
            placeholder='{"subjectIds":[],"gradeIds":[],"difficulties":[]}'
          />
        </label>
        <label className="checkbox-row"><input name="active" type="checkbox" /> همین حالا فعال شود</label>
        <button disabled={busy}>{busy ? "در حال ذخیره..." : "ذخیره طرح"}</button>
      </form>

      <section className="card">
        <h2>طرح‌ها</h2>
        <div className="list">
          {items.length ? items.map((item) => (
            <div className="list-item" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <small>
                  {item.questionCount} سوال · {item.durationSeconds ? `${Math.round(item.durationSeconds / 60)} دقیقه` : "بدون زمان"} · {item.effectiveYear ?? "بدون سال"} · {item.scoringRules ? `ضرایب ${item.scoringRules.correctMultiplier}/${item.scoringRules.incorrectMultiplier}/${item.scoringRules.unansweredMultiplier}` : "امتیازدهی تنظیم نشده"}
                </small>
              </div>
              <div className="inline-actions">
                <span className="badge">{item.active ? "Active" : "Inactive"}</span>
                {!item.active ? <button disabled={busy} onClick={() => void activate(item.id)}>فعال‌سازی</button> : null}
              </div>
            </div>
          )) : <p>هنوز طرحی ایجاد نشده است.</p>}
        </div>
      </section>
    </main>
  );
}
