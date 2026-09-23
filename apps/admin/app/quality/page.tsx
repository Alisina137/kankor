"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

type Dashboard = {
  users: number;
  activeStudents: number;
  completedExams: number;
  questionHealth: Array<{status:string;count:number}>;
  reportHealth: Array<{status:string;count:number}>;
  paymentActivity: Array<{status:string;count:number}>;
};
type Question = { id:string; content:string; language:string; difficulty:string; verificationStatus:string; version:number; updatedAt:string };
type Report = { id:string; questionId:string|null; reportType:string; status:string; description:string; resolutionNotes:string|null; createdAt:string };
type Audit = { id:string; action:string; entityType:string|null; entityId:string|null; metadata:Record<string,unknown>; createdAt:string; actorEmail:string|null };
type ImportBatch = { id:string; status:string; totalRows:number; acceptedRows:number; rejectedRows:number; createdAt:string };
type User = { id:string; email:string; role:string; preferredLanguage:string; targetExamYear:number|null; createdAt:string };
type Revision = { id:string; version:number; changeReason:string|null; createdAt:string; snapshot:Record<string,unknown> };
type LineageItem = { id:string; snapshot:Record<string,unknown> };

async function request<T>(path:string, options:RequestInit={}, token?:string) {
  const headers=new Headers(options.headers);
  if(options.body!=null) headers.set("Content-Type","application/json");
  if(token) headers.set("Authorization",`Bearer ${token}`);
  const response=await fetch(`${API_URL}/api/v1${path}`,{...options,headers});
  const body=response.status===204?{}:await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(body.error??"request_failed");
  return body as T;
}

export default function ContentQualityPage(){
  const [token,setToken]=useState("");
  const [dashboard,setDashboard]=useState<Dashboard|null>(null);
  const [questions,setQuestions]=useState<Question[]>([]);
  const [reports,setReports]=useState<Report[]>([]);
  const [audits,setAudits]=useState<Audit[]>([]);
  const [imports,setImports]=useState<ImportBatch[]>([]);
  const [users,setUsers]=useState<User[]>([]);
  const [importJson,setImportJson]=useState("");
  const [reportQuestionId,setReportQuestionId]=useState("");
  const [reportType,setReportType]=useState("question");
  const [reportDescription,setReportDescription]=useState("");
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  const [correctionQuestionId,setCorrectionQuestionId]=useState("");
  const [correctionReason,setCorrectionReason]=useState("");
  const [correctionJson,setCorrectionJson]=useState("{}");
  const [revisions,setRevisions]=useState<Revision[]>([]);
  const [lineage,setLineage]=useState<LineageItem[]>([]);

  const load=useCallback(async(authToken:string)=>{
    const [d,q,r,i]=await Promise.all([
      request<Dashboard>("/admin/dashboard",{},authToken),
      request<{items:Question[]}>("/admin/questions",{},authToken),
      request<{items:Report[]}>("/admin/content/reports",{},authToken),
      request<{items:ImportBatch[]}>("/admin/content/imports",{},authToken)
    ]);
    setDashboard(d); setQuestions(q.items); setReports(r.items); setImports(i.items);
    try{
      const a=await request<{items:Audit[]}>("/admin/audit",{},authToken);
      setAudits(a.items);
    }catch{ setAudits([]); }
    try{
      const u=await request<{items:User[]}>("/admin/users",{},authToken);
      setUsers(u.items);
    }catch{ setUsers([]); }
  },[]);

  useEffect(()=>{
    const saved=sessionStorage.getItem("kankor-admin-token")??"";
    setToken(saved);
    if(saved) void load(saved).catch(()=>setStatus("بارگیری Content Quality ناموفق بود."));
  },[load]);

  async function act(path:string, body:Record<string,unknown>={}){
    if(!token)return;
    setBusy(true);setStatus("");
    try{
      await request(path,{method:"POST",body:JSON.stringify(body)},token);
      await load(token);
      setStatus("عملیات با موفقیت ثبت شد.");
    }catch(error){
      setStatus(`عملیات ناموفق بود: ${error instanceof Error?error.message:"خطا"}`);
    }finally{setBusy(false);}
  }

  async function runImport(dryRun:boolean){
    if(!token)return;
    let parsed:unknown;
    try{parsed=JSON.parse(importJson);}catch{setStatus("JSON معتبر نیست.");return;}
    const questions=Array.isArray(parsed)?parsed:(parsed&&typeof parsed==="object"&&Array.isArray((parsed as {questions?:unknown[]}).questions)?(parsed as {questions:unknown[]}).questions:[]);
    if(!questions.length){setStatus("لیست questions خالی است.");return;}
    setBusy(true);setStatus("");
    try{
      const result=await request<{inserted:number;rejected:Array<unknown>}>("/admin/content/import/questions",{
        method:"POST",body:JSON.stringify({questions,dryRun})
      },token);
      await load(token);
      setStatus(dryRun
        ? `Validation تمام شد؛ rejected=${result.rejected.length}`
        : `Import انجام شد؛ inserted=${result.inserted}`);
    }catch(error){setStatus(`Import ناموفق بود: ${error instanceof Error?error.message:"خطا"}`);}
    finally{setBusy(false);}
  }

  async function createReport(){
    if(!token||!reportDescription.trim())return;
    setBusy(true);setStatus("");
    try{
      await request("/admin/content/reports",{
        method:"POST",
        body:JSON.stringify({questionId:reportQuestionId||null,reportType,description:reportDescription})
      },token);
      setReportDescription("");setReportQuestionId("");
      await load(token);setStatus("گزارش محتوا ایجاد شد.");
    }catch(error){setStatus(`گزارش ایجاد نشد: ${error instanceof Error?error.message:"خطا"}`);}
    finally{setBusy(false);}
  }



  async function changeRole(userId:string, role:string){
    if(!token)return;
    setBusy(true);setStatus("");
    try{
      await request(`/admin/users/${userId}/role`,{
        method:"PATCH",body:JSON.stringify({role})
      },token);
      await load(token);
      setStatus(`نقش کاربر به ${role} تغییر کرد.`);
    }catch(error){setStatus(`تغییر نقش ناموفق بود: ${error instanceof Error?error.message:"خطا"}`);}
    finally{setBusy(false);}
  }

  async function loadRevisions(){
    if(!token||!correctionQuestionId.trim())return;
    setBusy(true);setStatus("");
    try{
      const result=await request<{items:Revision[];lineage:LineageItem[]}>(`/admin/content/questions/${correctionQuestionId.trim()}/revisions`,{},token);
      setRevisions(result.items);
      setLineage(result.lineage);
      setStatus(`${result.items.length} revision پیدا شد.`);
    }catch(error){setStatus(`Revision history بارگیری نشد: ${error instanceof Error?error.message:"خطا"}`);}
    finally{setBusy(false);}
  }

  async function correctQuestion(){
    if(!token||!correctionQuestionId.trim()||!correctionReason.trim())return;
    let patch:Record<string,unknown>;
    try{
      const parsed=JSON.parse(correctionJson||"{}");
      if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error();
      patch=parsed as Record<string,unknown>;
    }catch{setStatus("Correction JSON معتبر نیست.");return;}
    setBusy(true);setStatus("");
    try{
      const result=await request<{question:{id:string;version:number};supersededQuestionId:string}>(
        `/admin/content/questions/${correctionQuestionId.trim()}/correct`,
        {method:"POST",body:JSON.stringify({...patch,changeReason:correctionReason.trim()})},
        token
      );
      setCorrectionQuestionId(result.question.id);
      setCorrectionReason("");
      setCorrectionJson("{}");
      await load(token);
      setStatus(`نسخه جدید v${result.question.version} ایجاد شد. سوال قبلی محفوظ و Deprecated شد.`);
    }catch(error){setStatus(`Correction ناموفق بود: ${error instanceof Error?error.message:"خطا"}`);}
    finally{setBusy(false);}
  }

  async function resolveReport(id:string,statusValue:"resolved"|"dismissed"){
    if(!token)return;
    setBusy(true);setStatus("");
    try{
      await request(`/admin/content/reports/${id}`,{
        method:"PATCH",body:JSON.stringify({status:statusValue,resolutionNotes:"Reviewed in Phase 9 admin console."})
      },token);
      await load(token);setStatus("وضعیت گزارش به‌روزرسانی شد.");
    }catch(error){setStatus(`به‌روزرسانی ناموفق بود: ${error instanceof Error?error.message:"خطا"}`);}
    finally{setBusy(false);}
  }

  if(!token){
    return <main className="shell"><p className="eyebrow">KankorPrep Afghanistan</p><h1>Content Quality</h1><p>ابتدا از صفحه مدیریت وارد شوید.</p><a href="/">بازگشت به مدیریت</a></main>;
  }

  const count=(rows:Array<{status:string;count:number}>,statusValue:string)=>Number(rows.find(x=>x.status===statusValue)?.count??0);

  return <main className="shell wide">
    <header className="topbar">
      <div>
        <p className="eyebrow">Phase 9</p>
        <h1>Administration & Content Quality</h1>
        <p>Review، approval، correction/versioning، reports، bulk import و audit در یک محیط.</p>
      </div>
      <div className="inline-actions"><a href="/">محتوا</a><a href="/historical">فورم‌های تاریخی</a><a href="/billing">Billing</a></div>
    </header>

    {status?<div className="notice">{status}</div>:null}

    {dashboard?<section className="stats">
      <div><strong>{dashboard.users}</strong><span>کاربر</span></div>
      <div><strong>{dashboard.activeStudents}</strong><span>کاربر فعال</span></div>
      <div><strong>{dashboard.completedExams}</strong><span>امتحان تکمیل‌شده</span></div>
      <div><strong>{count(dashboard.questionHealth,"published")}</strong><span>سوال Published</span></div>
      <div><strong>{count(dashboard.questionHealth,"review")}</strong><span>در Review</span></div>
      <div><strong>{count(dashboard.reportHealth,"open")}</strong><span>گزارش باز</span></div>
    </section>:null}

    <section className="card">
      <h2>Review Queue</h2>
      <div className="list">
        {questions.filter(q=>["draft","review","approved","published"].includes(q.verificationStatus)).slice(0,100).map(q=>
          <div className="list-item" key={q.id}>
            <div>
              <strong>{q.content.slice(0,140)}</strong>
              <small>v{q.version} · {q.language} · {q.difficulty}</small>
            </div>
            <div className="inline-actions">
              <span className="badge">{q.verificationStatus}</span>
              {q.verificationStatus==="draft"?<button disabled={busy} onClick={()=>void act(`/admin/content/questions/${q.id}/submit-review`)}>Submit Review</button>:null}
              {q.verificationStatus==="review"?<>
                <button disabled={busy} onClick={()=>void act(`/admin/content/questions/${q.id}/review`,{decision:"approved"})}>Approve</button>
                <button className="secondary" disabled={busy} onClick={()=>void act(`/admin/content/questions/${q.id}/review`,{decision:"rejected",notes:"Needs correction"})}>Reject</button>
              </>:null}
              {q.verificationStatus==="approved"?<button disabled={busy} onClick={()=>void act(`/admin/content/questions/${q.id}/publish`)}>Publish</button>:null}
              {q.verificationStatus==="published"?<button className="secondary" disabled={busy} onClick={()=>void act(`/admin/content/questions/${q.id}/deprecate`)}>Deprecate</button>:null}
            </div>
          </div>
        )}
      </div>
    </section>


    <section className="card form">
      <h2>Published Question Correction & Version History</h2>
      <p>سوال Published مستقیماً ویرایش نمی‌شود. Correction یک Question جدید با version بالاتر می‌سازد و سوال قبلی برای تلاش‌ها/فورم‌های تاریخی محفوظ می‌ماند.</p>
      <label>Question ID<input value={correctionQuestionId} onChange={e=>setCorrectionQuestionId(e.target.value)} placeholder="UUID سوال Published"/></label>
      <label>دلیل تغییر<input value={correctionReason} onChange={e=>setCorrectionReason(e.target.value)} placeholder="مثلاً جواب صحیح اشتباه بود" /></label>
      <label>فیلدهای اصلاح‌شده (JSON)
        <textarea rows={8} value={correctionJson} onChange={e=>setCorrectionJson(e.target.value)} placeholder={'{"correctChoice":"B","shortExplanation":"..."}'} />
      </label>
      <div className="inline-actions">
        <button className="secondary" disabled={busy||!correctionQuestionId.trim()} onClick={()=>void loadRevisions()}>Revision History</button>
        <button disabled={busy||!correctionQuestionId.trim()||!correctionReason.trim()} onClick={()=>void correctQuestion()}>Create corrected Draft version</button>
      </div>
      {lineage.length?<div className="list">
        {lineage.map((item,index)=><div className="list-item" key={item.id}>
          <div><strong>Lineage v{String(item.snapshot.version??"—")}</strong><small>{item.id}{index===0?" · current":""}</small></div>
          <span className="badge">{String(item.snapshot.verificationStatus??"—")}</span>
        </div>)}
      </div>:null}
      {revisions.length?<div className="list">
        {revisions.map(r=><div className="list-item" key={r.id}><div><strong>Snapshot v{r.version}</strong><small>{r.changeReason??"بدون دلیل"} · {new Date(r.createdAt).toLocaleString()}</small></div><span className="badge">immutable snapshot</span></div>)}
      </div>:null}
    </section>

    <section className="card form">
      <h2>Bulk Question Import</h2>
      <p>ابتدا Validate کنید. Apply فقط زمانی انجام می‌شود که هیچ ردیف ردشده‌ای وجود نداشته باشد. سوالات واردشده Draft هستند.</p>
      <textarea rows={14} value={importJson} onChange={e=>setImportJson(e.target.value)} placeholder={'{"questions":[{"topicId":"UUID","language":"fa","content":"...","choices":[{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],"correctChoice":"A","difficulty":"medium"}]}'}/>
      <div className="inline-actions">
        <button className="secondary" disabled={busy||!importJson.trim()} onClick={()=>void runImport(true)}>Validate only</button>
        <button disabled={busy||!importJson.trim()} onClick={()=>void runImport(false)}>Validate & Apply</button>
      </div>
      <div className="list">
        {imports.slice(0,10).map(item=><div className="list-item" key={item.id}><div><strong>{item.status}</strong><small>{item.acceptedRows}/{item.totalRows} accepted · {item.rejectedRows} rejected</small></div><span className="badge">{new Date(item.createdAt).toLocaleString()}</span></div>)}
      </div>
    </section>

    <section className="card form">
      <h2>Content Reports</h2>
      <div className="two">
        <label>Question ID (اختیاری)<input value={reportQuestionId} onChange={e=>setReportQuestionId(e.target.value)}/></label>
        <label>نوع<select value={reportType} onChange={e=>setReportType(e.target.value)}>
          <option value="question">Question</option><option value="incorrect_answer">Incorrect answer</option>
          <option value="explanation">Explanation</option><option value="translation">Translation</option>
          <option value="rendering">Rendering</option><option value="curriculum_mapping">Curriculum mapping</option>
          <option value="source_provenance">Source provenance</option><option value="other">Other</option>
        </select></label>
      </div>
      <label>شرح<textarea rows={3} value={reportDescription} onChange={e=>setReportDescription(e.target.value)}/></label>
      <button disabled={busy||!reportDescription.trim()} onClick={()=>void createReport()}>ایجاد گزارش</button>
      <div className="list">
        {reports.slice(0,50).map(r=><div className="list-item" key={r.id}>
          <div><strong>{r.reportType} — {r.description}</strong><small>{r.questionId??"بدون Question ID"} · {new Date(r.createdAt).toLocaleString()}</small></div>
          <div className="inline-actions"><span className="badge">{r.status}</span>
          {!["resolved","dismissed"].includes(r.status)?<>
            <button disabled={busy} onClick={()=>void resolveReport(r.id,"resolved")}>Resolve</button>
            <button className="secondary" disabled={busy} onClick={()=>void resolveReport(r.id,"dismissed")}>Dismiss</button>
          </>:null}</div>
        </div>)}
      </div>
    </section>

    {audits.length?<section className="card"><h2>Audit Log</h2><div className="list">
      {audits.slice(0,80).map(a=><div className="list-item" key={a.id}><div><strong>{a.action}</strong><small>{a.actorEmail??"system"} · {a.entityType??"—"} · {a.entityId??"—"}</small></div><span className="badge">{new Date(a.createdAt).toLocaleString()}</span></div>)}
    </div></section>:null}

    {users.length?<section className="card"><h2>Users</h2><div className="list">
      {users.slice(0,80).map(u=><div className="list-item" key={u.id}>
        <div><strong>{u.email}</strong><small>{u.preferredLanguage} · target {u.targetExamYear??"—"}</small></div>
        <div className="inline-actions">
          <span className="badge">{u.role}</span>
          <button className="secondary" disabled={busy} onClick={()=>void changeRole(u.id,"student")}>Student</button>
          <button className="secondary" disabled={busy} onClick={()=>void changeRole(u.id,"content_reviewer")}>Reviewer</button>
          <button className="secondary" disabled={busy} onClick={()=>void changeRole(u.id,"content_admin")}>Content Admin</button>
        </div>
      </div>)}
    </div></section>:null}
  </main>;
}
