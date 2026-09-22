"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

type HistoricalForm = {
  id: string;
  archiveCode: string;
  year: number;
  cycle: string | null;
  province: string | null;
  round: string | null;
  formCode: string | null;
  language: string;
  title: string;
  sourceReference: string | null;
  sourceStatus: string;
  verificationStatus: string;
  originalOrderStatus: string;
  questionCount: number;
  durationSeconds: number | null;
  scoringRules: Record<string, unknown> | null;
};

type Question = {
  id: string;
  content: string;
  language: string;
  verificationStatus: string;
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

export default function HistoricalFormsAdminPage() {
  const [token, setToken] = useState("");
  const [forms, setForms] = useState<HistoricalForm[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [importJson, setImportJson] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (authToken: string) => {
    const [formResult, questionResult] = await Promise.all([
      request<{ items: HistoricalForm[] }>("/admin/historical-forms", {}, authToken),
      request<{ items: Question[] }>("/admin/questions", {}, authToken)
    ]);
    setForms(formResult.items);
    setQuestions(questionResult.items);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("kankor-admin-token") ?? "";
    setToken(saved);
    if (saved) void load(saved).catch(() => setStatus("بارگیری آرشیف تاریخی ناموفق بود."));
  }, [load]);

  async function createForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const data = new FormData(form);

    const durationMinutes = String(data.get("durationMinutes") ?? "").trim();
    const correctMultiplier = String(data.get("correctMultiplier") ?? "").trim();
    const incorrectMultiplier = String(data.get("incorrectMultiplier") ?? "").trim();
    const unansweredMultiplier = String(data.get("unansweredMultiplier") ?? "").trim();

    let scoringRules: Record<string, unknown> | null = null;
    if (correctMultiplier || incorrectMultiplier || unansweredMultiplier) {
      scoringRules = {
        mode: "question_marks",
        correctMultiplier: Number(correctMultiplier || 1),
        incorrectMultiplier: Number(incorrectMultiplier || 0),
        unansweredMultiplier: Number(unansweredMultiplier || 0),
        floorAtZero: data.get("floorAtZero") === "on"
      };
    }

    setBusy(true);
    setStatus("");
    try {
      await request("/admin/historical-forms", {
        method: "POST",
        body: JSON.stringify({
          archiveCode: data.get("archiveCode"),
          year: Number(data.get("year")),
          cycle: data.get("cycle"),
          province: data.get("province"),
          round: data.get("round"),
          formCode: data.get("formCode"),
          language: data.get("language"),
          title: data.get("title"),
          sourceReference: data.get("sourceReference"),
          sourceStatus: data.get("sourceStatus"),
          originalOrderStatus: data.get("originalOrderStatus"),
          durationSeconds: durationMinutes ? Number(durationMinutes) * 60 : null,
          scoringRules,
          sourceMetadata: {}
        })
      }, token);
      form.reset();
      await load(token);
      setStatus("فورم تاریخی به حالت Draft ایجاد شد.");
    } catch (error) {
      setStatus(`ایجاد فورم ناموفق بود: ${error instanceof Error ? error.message : "خطا"}`);
    } finally {
      setBusy(false);
    }
  }

  async function importQuestions() {
    if (!token || !selectedId) return;
    let payload: unknown;
    try {
      payload = JSON.parse(importJson);
    } catch {
      setStatus("JSON سوالات معتبر نیست.");
      return;
    }

    setBusy(true);
    setStatus("");
    try {
      const result = await request<{ imported: number }>(`/admin/historical-forms/${selectedId}/import`, {
        method: "POST",
        body: JSON.stringify(Array.isArray(payload) ? { questions: payload } : payload)
      }, token);
      await load(token);
      setStatus(`${result.imported} سوال با ترتیب تاریخی وارد شد.`);
    } catch (error) {
      setStatus(`واردسازی ناموفق بود: ${error instanceof Error ? error.message : "خطا"}`);
    } finally {
      setBusy(false);
    }
  }

  async function setVerification(id: string, verificationStatus: string) {
    if (!token) return;
    setBusy(true);
    setStatus("");
    try {
      await request(`/admin/historical-forms/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ verificationStatus })
      }, token);
      await load(token);
      setStatus(`وضعیت فورم به ${verificationStatus} تغییر کرد.`);
    } catch (error) {
      setStatus(`تغییر وضعیت ناموفق بود: ${error instanceof Error ? error.message : "خطا"}`);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="shell">
        <p className="eyebrow">KankorPrep Afghanistan</p>
        <h1>آرشیف فورم‌های تاریخی</h1>
        <p>ابتدا از صفحه اصلی مدیریت وارد شوید.</p>
        <a href="/">بازگشت به ورود مدیریت</a>
      </main>
    );
  }

  return (
    <main className="shell wide">
      <header className="topbar">
        <div>
          <p className="eyebrow">Phase 6</p>
          <h1>آرشیف فورم‌های تاریخی</h1>
          <p>هویت فورم، منبع، ترتیب اصلی و عدم قطعیت منبع باید بدون تغییر حفظ شود.</p>
        </div>
        <div className="inline-actions">
          <a href="/">مدیریت محتوا</a>
          <a href="/exams">طرح امتحان</a>
        </div>
      </header>

      {status ? <div className="notice">{status}</div> : null}

      <form className="card form" onSubmit={createForm}>
        <h2>ایجاد فورم تاریخی</h2>
        <div className="three">
          <label>کُد داخلی<input name="archiveCode" required placeholder="kabul-1404-form-17" /></label>
          <label>سال<input name="year" type="number" min="1301" max="1599" required /></label>
          <label>زبان
            <select name="language" defaultValue="fa">
              <option value="fa">دری</option>
              <option value="ps">پشتو</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
        <label>عنوان<input name="title" required placeholder="کانکور کابل ۱۴۰۴ — فورم ۱۷" /></label>
        <div className="three">
          <label>دوره<input name="cycle" /></label>
          <label>ولایت<input name="province" /></label>
          <label>دور امتحان<input name="round" /></label>
        </div>
        <div className="three">
          <label>شماره/کُد فورم<input name="formCode" /></label>
          <label>وضعیت منبع
            <select name="sourceStatus" defaultValue="unverified">
              <option value="official">Official</option>
              <option value="verified_secondary">Verified secondary</option>
              <option value="unverified">Unverified</option>
            </select>
          </label>
          <label>وضعیت ترتیب
            <select name="originalOrderStatus" defaultValue="uncertain">
              <option value="confirmed">Confirmed</option>
              <option value="uncertain">Uncertain</option>
            </select>
          </label>
        </div>
        <label>مرجع منبع<input name="sourceReference" placeholder="نام فایل، آرشیف، شماره سند یا مرجع قابل بررسی" /></label>
        <label>زمان به دقیقه (اگر معتبر است)<input name="durationMinutes" type="number" min="1" /></label>

        <h2>امتیازدهی تاریخی (اختیاری)</h2>
        <p>اگر قانون معتبر ندارید، خالی بگذارید. اپ هنگام آزمون از امتیازدهی تمرینی استفاده می‌کند و آن را به‌عنوان قانون تاریخی معرفی نمی‌کند.</p>
        <div className="three">
          <label>ضریب صحیح<input name="correctMultiplier" type="number" step="0.0001" /></label>
          <label>ضریب غلط<input name="incorrectMultiplier" type="number" step="0.0001" /></label>
          <label>ضریب بی‌پاسخ<input name="unansweredMultiplier" type="number" step="0.0001" /></label>
        </div>
        <label className="checkbox-row"><input name="floorAtZero" type="checkbox" /> کف نمره صفر</label>
        <button disabled={busy}>{busy ? "در حال ذخیره..." : "ایجاد Draft"}</button>
      </form>

      <section className="card">
        <h2>فورم‌ها</h2>
        <div className="list">
          {forms.length ? forms.map((item) => (
            <div className="list-item" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <small>
                  {item.year} · {item.province ?? "ولایت نامشخص"} · {item.round ?? "دور نامشخص"} · {item.questionCount} سوال
                </small>
                <small>
                  {item.archiveCode} · source={item.sourceStatus} · order={item.originalOrderStatus}
                </small>
              </div>
              <div className="inline-actions">
                <span className="badge">{item.verificationStatus}</span>
                <button className="secondary" onClick={() => setSelectedId(item.id)}>انتخاب برای Import</button>
                {item.verificationStatus !== "published" ? (
                  <>
                    <button className="secondary" disabled={busy} onClick={() => void setVerification(item.id, "review")}>Review</button>
                    <button className="secondary" disabled={busy} onClick={() => void setVerification(item.id, "approved")}>Approve</button>
                    <button disabled={busy} onClick={() => void setVerification(item.id, "published")}>Publish</button>
                  </>
                ) : null}
              </div>
            </div>
          )) : <p>هنوز فورم تاریخی ایجاد نشده است.</p>}
        </div>
      </section>

      <section className="card form">
        <h2>Bulk Import ترتیب سوالات</h2>
        <p>فورم انتخاب‌شده: {selectedId || "هیچ"}</p>
        <p>هر ردیف باید questionId و order داشته باشد. sourceMetadata و historicalScoringMetadata اختیاری است.</p>
        <textarea
          rows={12}
          value={importJson}
          onChange={(event) => setImportJson(event.target.value)}
          placeholder={'{"questions":[{"questionId":"UUID","order":1,"sourceMetadata":{"page":1,"originalQuestionNumber":1}}]}'}
        />
        <button disabled={busy || !selectedId || !importJson.trim()} onClick={() => void importQuestions()}>
          واردسازی سوالات
        </button>
      </section>

      <section className="card">
        <h2>شناسه سوال‌ها برای Import</h2>
        <div className="list">
          {questions.slice(0, 100).map((question) => (
            <div className="list-item" key={question.id}>
              <div>
                <strong>{question.content.slice(0, 110)}</strong>
                <small>{question.id} · {question.language} · {question.verificationStatus}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
