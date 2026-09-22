"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

type Grade = { id: string; number: number; nameFa: string };
type Subject = { id: string; code: string; nameFa: string };
type Book = { id: string; subjectId: string; gradeId: string; code: string; titleFa: string; editionYear: number | null; sourceMetadata: Record<string, unknown> };
type Chapter = { id: string; bookId: string; number: number; titleFa: string };
type Topic = { id: string; chapterId: string; titleFa: string };
type Question = { id: string; content: string; verificationStatus: string; difficulty: string };

type Curriculum = {
  grades: Grade[];
  subjects: Subject[];
  books: Book[];
  chapters: Chapter[];
  topics: Topic[];
};

async function request<T>(path: string, options: RequestInit = {}, token?: string) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}/api/v1${path}`, { ...options, headers });
  const body = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "request_failed");
  return body as T;
}

export default function AdminHome() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [curriculum, setCurriculum] = useState<Curriculum>({ grades: [], subjects: [], books: [], chapters: [], topics: [] });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (authToken = token) => {
    if (!authToken) return;
    const [curriculumResult, questionResult] = await Promise.all([
      request<Curriculum>("/admin/curriculum", {}, authToken),
      request<{ items: Question[] }>("/admin/questions", {}, authToken)
    ]);
    setCurriculum(curriculumResult);
    setQuestions(questionResult.items);
  }, [token]);

  useEffect(() => {
    const saved = sessionStorage.getItem("kankor-admin-token") ?? "";
    if (saved) {
      setToken(saved);
      void refresh(saved).catch(() => {
        sessionStorage.removeItem("kankor-admin-token");
        setToken("");
      });
    }
  }, [refresh]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const result = await request<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setToken(result.token);
      sessionStorage.setItem("kankor-admin-token", result.token);
      await refresh(result.token);
      setStatus("ورود موفق بود.");
    } catch (error) {
      sessionStorage.removeItem("kankor-admin-token");
      setToken("");
      setCurriculum({ grades: [], subjects: [], books: [], chapters: [], topics: [] });
      setQuestions([]);
      setStatus(error instanceof Error && error.message === "admin_required"
        ? "این حساب دسترسی مدیریت محتوا ندارد."
        : "ورود یا اتصال به API ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("kankor-admin-token");
    setToken("");
    setCurriculum({ grades: [], subjects: [], books: [], chapters: [], topics: [] });
    setQuestions([]);
  }

  async function create(path: string, payload: Record<string, unknown>, form: HTMLFormElement) {
    setBusy(true);
    setStatus("");
    try {
      await request(path, { method: "POST", body: JSON.stringify(payload) }, token);
      form.reset();
      await refresh();
      setStatus("ذخیره شد.");
    } catch (error) {
      setStatus(`ذخیره نشد: ${error instanceof Error ? error.message : "خطا"}`);
    } finally {
      setBusy(false);
    }
  }

  async function advanceQuestion(question: Question) {
    const transitions: Record<string, string> = {
      draft: "review",
      review: "approved",
      approved: "published",
      published: "deprecated"
    };
    const next = transitions[question.verificationStatus];
    if (!next || !token) return;

    setBusy(true);
    setStatus("");
    try {
      await request(`/admin/questions/${question.id}`, {
        method: "PATCH",
        body: JSON.stringify({ verificationStatus: next })
      }, token);
      await refresh();
      setStatus(`وضعیت سوال به ${next} تغییر کرد.`);
    } catch (error) {
      setStatus(`تغییر وضعیت ناموفق بود: ${error instanceof Error ? error.message : "خطا"}`);
    } finally {
      setBusy(false);
    }
  }

  const bookOptions = useMemo(() => curriculum.books.map((book) => ({
    ...book,
    label: `${book.titleFa} — ${curriculum.grades.find((grade) => grade.id === book.gradeId)?.number ?? ""}`
  })), [curriculum.books, curriculum.grades]);

  if (!token) {
    return (
      <main className="shell">
        <p className="eyebrow">KankorPrep Afghanistan</p>
        <h1>ورود مدیریت محتوا</h1>
        <p>با حسابی وارد شوید که ایمیل آن در ADMIN_BOOTSTRAP_EMAILS قرار دارد یا نقش مدیریتی دارد.</p>
        <form className="card form" onSubmit={login}>
          <label>ایمیل<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>رمز عبور<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <button disabled={busy}>{busy ? "در حال ورود..." : "ورود"}</button>
          {status ? <p className="status">{status}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <main className="shell wide">
      <header className="topbar">
        <div>
          <p className="eyebrow">KankorPrep Afghanistan</p>
          <h1>مدیریت نصاب و سوالات</h1>
          <p>مرحله ۳ — ساختار Subject → Grade → Book → Chapter → Topic → Question</p>
        </div>
        <div className="inline-actions"><a href="/exams">طرح امتحان</a><a href="/historical">فورم‌های تاریخی</a><a href="/billing">Billing</a><button className="secondary" onClick={logout}>خروج</button></div>
      </header>

      {status ? <div className="notice">{status}</div> : null}

      <section className="stats">
        <div><strong>{curriculum.subjects.length}</strong><span>مضمون</span></div>
        <div><strong>{curriculum.books.length}</strong><span>کتاب</span></div>
        <div><strong>{curriculum.chapters.length}</strong><span>فصل</span></div>
        <div><strong>{curriculum.topics.length}</strong><span>موضوع</span></div>
        <div><strong>{questions.length}</strong><span>سوال</span></div>
      </section>

      <section className="card">
        <h2>کتاب‌های نصاب واردشده</h2>
        <div className="list">
          {curriculum.books.length ? curriculum.books.map((book) => {
            const grade = curriculum.grades.find((item) => item.id === book.gradeId);
            const chapterCount = curriculum.chapters.filter((item) => item.bookId === book.id).length;
            const lessonCount = curriculum.topics.filter((topic) =>
              curriculum.chapters.some((chapter) => chapter.id === topic.chapterId && chapter.bookId === book.id)
            ).length;
            return (
              <div className="list-item" key={book.id}>
                <div>
                  <strong>{book.titleFa}</strong>
                  <small>
                    صنف {grade?.number ?? "—"} · چاپ {book.editionYear ?? "—"} · {chapterCount} فصل · {lessonCount} درس
                  </small>
                  <small>منبع: {String(book.sourceMetadata?.publisher ?? "ثبت نشده")}</small>
                </div>
                <span className="badge">{String(book.sourceMetadata?.sourceType ?? "curriculum")}</span>
              </div>
            );
          }) : <p>هنوز کتاب نصاب وارد نشده است.</p>}
        </div>
      </section>

      <section className="grid">
        <form className="card form" onSubmit={(event) => {
          event.preventDefault(); const f = event.currentTarget; const d = new FormData(f);
          void create("/admin/grades", { number: Number(d.get("number")), nameFa: d.get("nameFa"), namePs: d.get("namePs") }, f);
        }}>
          <h2>صنف</h2>
          <label>شماره صنف<input name="number" type="number" min="1" required /></label>
          <label>نام دری<input name="nameFa" required /></label>
          <label>نام پشتو<input name="namePs" /></label>
          <button disabled={busy}>افزودن صنف</button>
        </form>

        <form className="card form" onSubmit={(event) => {
          event.preventDefault(); const f = event.currentTarget; const d = new FormData(f);
          void create("/admin/subjects", { code: d.get("code"), nameFa: d.get("nameFa"), namePs: d.get("namePs") }, f);
        }}>
          <h2>مضمون</h2>
          <label>کُد<input name="code" placeholder="mathematics" required /></label>
          <label>نام دری<input name="nameFa" required /></label>
          <label>نام پشتو<input name="namePs" /></label>
          <button disabled={busy}>افزودن مضمون</button>
        </form>

        <form className="card form" onSubmit={(event) => {
          event.preventDefault(); const f = event.currentTarget; const d = new FormData(f);
          void create("/admin/books", { subjectId: d.get("subjectId"), gradeId: d.get("gradeId"), code: d.get("code"), titleFa: d.get("titleFa"), titlePs: d.get("titlePs") }, f);
        }}>
          <h2>کتاب</h2>
          <label>مضمون<select name="subjectId" required><option value="">انتخاب</option>{curriculum.subjects.map((item) => <option key={item.id} value={item.id}>{item.nameFa}</option>)}</select></label>
          <label>صنف<select name="gradeId" required><option value="">انتخاب</option>{curriculum.grades.map((item) => <option key={item.id} value={item.id}>{item.number}</option>)}</select></label>
          <label>کُد<input name="code" required /></label>
          <label>عنوان دری<input name="titleFa" required /></label>
          <label>عنوان پشتو<input name="titlePs" /></label>
          <button disabled={busy}>افزودن کتاب</button>
        </form>

        <form className="card form" onSubmit={(event) => {
          event.preventDefault(); const f = event.currentTarget; const d = new FormData(f);
          void create("/admin/chapters", { bookId: d.get("bookId"), number: Number(d.get("number")), titleFa: d.get("titleFa"), titlePs: d.get("titlePs") }, f);
        }}>
          <h2>فصل</h2>
          <label>کتاب<select name="bookId" required><option value="">انتخاب</option>{bookOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label>شماره فصل<input name="number" type="number" min="1" required /></label>
          <label>عنوان دری<input name="titleFa" required /></label>
          <label>عنوان پشتو<input name="titlePs" /></label>
          <button disabled={busy}>افزودن فصل</button>
        </form>

        <form className="card form" onSubmit={(event) => {
          event.preventDefault(); const f = event.currentTarget; const d = new FormData(f);
          void create("/admin/topics", { chapterId: d.get("chapterId"), code: d.get("code"), titleFa: d.get("titleFa"), titlePs: d.get("titlePs") }, f);
        }}>
          <h2>موضوع</h2>
          <label>فصل<select name="chapterId" required><option value="">انتخاب</option>{curriculum.chapters.map((item) => <option key={item.id} value={item.id}>{item.number}. {item.titleFa}</option>)}</select></label>
          <label>کُد<input name="code" /></label>
          <label>عنوان دری<input name="titleFa" required /></label>
          <label>عنوان پشتو<input name="titlePs" /></label>
          <button disabled={busy}>افزودن موضوع</button>
        </form>
      </section>

      <form className="card form question-form" onSubmit={(event) => {
        event.preventDefault(); const f = event.currentTarget; const d = new FormData(f);
        void create("/admin/questions", {
          topicId: d.get("topicId"),
          language: d.get("language"),
          content: d.get("content"),
          choices: ["A","B","C","D"].map((key) => ({ key, text: d.get(`choice${key}`) })),
          correctChoice: d.get("correctChoice"),
          difficulty: d.get("difficulty"),
          shortExplanation: d.get("shortExplanation"),
          detailedExplanation: d.get("detailedExplanation"),
          workedSolution: d.get("workedSolution"),
          sourceType: d.get("sourceType") || "editorial"
        }, f);
      }}>
        <h2>سوال جدید</h2>
        <div className="two">
          <label>موضوع<select name="topicId" required><option value="">انتخاب</option>{curriculum.topics.map((item) => <option key={item.id} value={item.id}>{item.titleFa}</option>)}</select></label>
          <label>زبان<select name="language"><option value="fa">دری</option><option value="ps">پشتو</option><option value="en">English</option></select></label>
        </div>
        <label>متن سوال<textarea name="content" rows={3} required /></label>
        <div className="two">
          {["A","B","C","D"].map((key) => <label key={key}>گزینه {key}<input name={`choice${key}`} required /></label>)}
        </div>
        <div className="three">
          <label>جواب صحیح<select name="correctChoice">{["A","B","C","D"].map((key) => <option key={key}>{key}</option>)}</select></label>
          <label>درجه سختی<select name="difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="expert">Expert</option></select></label>
          <label>نوع منبع<input name="sourceType" defaultValue="editorial" /></label>
        </div>
        <label>توضیح کوتاه<textarea name="shortExplanation" rows={2} /></label>
        <label>توضیح کامل<textarea name="detailedExplanation" rows={3} /></label>
        <label>راه‌حل مرحله‌به‌مرحله<textarea name="workedSolution" rows={4} /></label>
        <button disabled={busy}>ذخیره سوال به‌عنوان Draft</button>
      </form>

      <section className="card">
        <h2>سوالات</h2>
        <div className="list">
          {questions.length ? questions.map((question) => (
            <div className="list-item" key={question.id}>
              <div><strong>{question.content}</strong><small>{question.difficulty}</small></div>
              <div className="inline-actions">
                <span className="badge">{question.verificationStatus}</span>
                {question.verificationStatus !== "deprecated" ? (
                  <button disabled={busy} onClick={() => void advanceQuestion(question)}>
                    {question.verificationStatus === "draft"
                      ? "ارسال به Review"
                      : question.verificationStatus === "review"
                        ? "Approve"
                        : question.verificationStatus === "approved"
                          ? "Publish"
                          : "Deprecate"}
                  </button>
                ) : null}
              </div>
            </div>
          )) : <p>هنوز سوالی اضافه نشده است.</p>}
        </div>
      </section>
    </main>
  );
}
