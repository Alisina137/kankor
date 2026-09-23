import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import {
  CONTENT_MANAGE_ROLES,
  CONTENT_REVIEW_ROLES,
  SUPER_ADMIN_ROLES,
  requireAdminRole
} from "../../common/admin-auth.js";
import {
  latestReview,
  publishCriteria,
  questionSnapshot,
  saveRevision,
  writeAudit
} from "./content-quality-service.js";

const CHOICES = new Set(["A","B","C","D"]);
const LANGUAGES = new Set(["fa","ps","en"]);
const DIFFICULTIES = new Set(["easy","medium","hard","expert"]);
const REPORT_TYPES = new Set(["question","incorrect_answer","explanation","translation","rendering","curriculum_mapping","source_provenance","other"]);
const REPORT_STATUSES = new Set(["open","investigating","resolved","dismissed"]);

function str(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function opt(value: unknown) {
  const result = str(value);
  return result || null;
}
function validChoices(value: unknown): value is Array<{key:"A"|"B"|"C"|"D";text:string}> {
  return Array.isArray(value)
    && value.length === 4
    && new Set(value.map((item) => item?.key)).size === 4
    && value.every((item) => item && typeof item === "object"
      && CHOICES.has(String((item as Record<string,unknown>).key))
      && Boolean(str((item as Record<string,unknown>).text)));
}

function correctionValues(source: typeof schema.questions.$inferSelect, body: Record<string, unknown>) {
  const choices = "choices" in body ? body.choices : source.choices;
  const correctChoice = "correctChoice" in body ? str(body.correctChoice).toUpperCase() : source.correctChoice;
  const language = "language" in body ? str(body.language) : source.language;
  const difficulty = "difficulty" in body ? str(body.difficulty) : source.difficulty;
  const content = "content" in body ? str(body.content) : source.content;
  const topicId = "topicId" in body ? str(body.topicId) : source.topicId;

  if (!topicId || !content || !validChoices(choices) || !CHOICES.has(correctChoice)
    || !LANGUAGES.has(language) || !DIFFICULTIES.has(difficulty)) {
    return null;
  }

  return {
    topicId,
    language,
    questionType: source.questionType,
    content,
    choices,
    correctChoice,
    shortExplanation: "shortExplanation" in body ? opt(body.shortExplanation) : source.shortExplanation,
    detailedExplanation: "detailedExplanation" in body ? opt(body.detailedExplanation) : source.detailedExplanation,
    workedSolution: "workedSolution" in body ? opt(body.workedSolution) : source.workedSolution,
    difficulty,
    marks: "marks" in body ? String(Number(body.marks)) : source.marks,
    sourceType: "sourceType" in body ? str(body.sourceType) : source.sourceType,
    sourceMetadata: body.sourceMetadata && typeof body.sourceMetadata === "object"
      ? body.sourceMetadata as Record<string,unknown>
      : source.sourceMetadata,
    verificationStatus: "draft",
    version: source.version + 1,
    supersedesQuestionId: source.id
  };
}

export const adminContentQualityRoutes: FastifyPluginAsync = async (app) => {
  app.post<{Params:{id:string};Body:{notes?:string}}>(
    "/content/questions/:id/submit-review",
    async (request, reply) => {
      const admin = await requireAdminRole(request, reply, CONTENT_MANAGE_ROLES);
      if (!admin) return;
      const db = createDatabase();
      const rows = await db.select().from(schema.questions).where(eq(schema.questions.id, request.params.id)).limit(1);
      const question = rows[0];
      if (!question) return reply.code(404).send({error:"question_not_found"});
      if (question.verificationStatus !== "draft") return reply.code(409).send({error:"question_not_draft"});

      const criteria = publishCriteria(question);
      await db.update(schema.questions).set({
        verificationStatus:"review", updatedBy:admin.user.userId, updatedAt:new Date()
      }).where(eq(schema.questions.id, question.id));
      await db.insert(schema.contentReviews).values({
        entityType:"question", entityId:question.id, decision:"submitted",
        notes:opt(request.body?.notes), criteria:criteria.checks, reviewerId:admin.user.userId
      });
      await writeAudit({actorUserId:admin.user.userId,action:"question.submit_review",entityType:"question",entityId:question.id,before:questionSnapshot(question),after:{...questionSnapshot(question),verificationStatus:"review"}});
      return {status:"review",criteria};
    }
  );

  app.post<{Params:{id:string};Body:{decision?:string;notes?:string}}>(
    "/content/questions/:id/review",
    async (request, reply) => {
      const admin = await requireAdminRole(request, reply, CONTENT_REVIEW_ROLES);
      if (!admin) return;
      const decision = str(request.body?.decision);
      if (!["approved","rejected"].includes(decision)) return reply.code(400).send({error:"invalid_review_decision"});
      const db = createDatabase();
      const rows = await db.select().from(schema.questions).where(eq(schema.questions.id, request.params.id)).limit(1);
      const question = rows[0];
      if (!question) return reply.code(404).send({error:"question_not_found"});
      if (question.verificationStatus !== "review") return reply.code(409).send({error:"question_not_in_review"});
      const criteria = publishCriteria(question);
      const next = decision === "approved" ? "approved" : "draft";
      await db.update(schema.questions).set({verificationStatus:next,updatedBy:admin.user.userId,updatedAt:new Date()}).where(eq(schema.questions.id,question.id));
      await db.insert(schema.contentReviews).values({
        entityType:"question",entityId:question.id,decision,notes:opt(request.body?.notes),criteria:criteria.checks,reviewerId:admin.user.userId
      });
      await writeAudit({actorUserId:admin.user.userId,action:`question.review.${decision}`,entityType:"question",entityId:question.id,before:questionSnapshot(question),after:{...questionSnapshot(question),verificationStatus:next},metadata:{notes:opt(request.body?.notes)}});
      return {status:next,criteria};
    }
  );

  app.post<{Params:{id:string}}>(
    "/content/questions/:id/publish",
    async (request, reply) => {
      const admin = await requireAdminRole(request, reply, CONTENT_MANAGE_ROLES);
      if (!admin) return;
      const db = createDatabase();
      const rows = await db.select().from(schema.questions).where(eq(schema.questions.id, request.params.id)).limit(1);
      const question = rows[0];
      if (!question) return reply.code(404).send({error:"question_not_found"});
      if (question.verificationStatus !== "approved") return reply.code(409).send({error:"question_not_approved"});
      const review = await latestReview("question", question.id);
      if (!review || review.decision !== "approved") return reply.code(409).send({error:"approved_review_required"});
      const criteria = publishCriteria(question);
      if (!criteria.passed) return reply.code(409).send({error:"publish_criteria_failed",criteria:criteria.checks});
      await db.update(schema.questions).set({verificationStatus:"published",updatedBy:admin.user.userId,updatedAt:new Date()}).where(eq(schema.questions.id,question.id));
      await db.insert(schema.contentReviews).values({entityType:"question",entityId:question.id,decision:"published",criteria:criteria.checks,reviewerId:admin.user.userId});
      await writeAudit({actorUserId:admin.user.userId,action:"question.publish",entityType:"question",entityId:question.id,before:questionSnapshot(question),after:{...questionSnapshot(question),verificationStatus:"published"}});
      return {status:"published"};
    }
  );

  app.post<{Params:{id:string};Body:Record<string,unknown>}>(
    "/content/questions/:id/correct",
    async (request, reply) => {
      const admin = await requireAdminRole(request, reply, CONTENT_MANAGE_ROLES);
      if (!admin) return;
      const reason = str(request.body.changeReason);
      if (!reason) return reply.code(400).send({error:"change_reason_required"});
      const db = createDatabase();
      const rows = await db.select().from(schema.questions).where(eq(schema.questions.id, request.params.id)).limit(1);
      const current = rows[0];
      if (!current) return reply.code(404).send({error:"question_not_found"});
      if (!["published","deprecated"].includes(current.verificationStatus)) return reply.code(409).send({error:"correction_requires_published_question"});
      const values = correctionValues(current, request.body);
      if (!values) return reply.code(400).send({error:"invalid_correction"});

      await saveRevision(current, reason, admin.user.userId);
      const [next] = await db.insert(schema.questions).values({...values,createdBy:admin.user.userId,updatedBy:admin.user.userId}).returning();
      if (current.verificationStatus === "published") {
        await db.update(schema.questions).set({verificationStatus:"deprecated",updatedBy:admin.user.userId,updatedAt:new Date()}).where(eq(schema.questions.id,current.id));
      }
      await writeAudit({
        actorUserId:admin.user.userId,action:"question.correct",entityType:"question",entityId:next.id,
        before:questionSnapshot(current),after:questionSnapshot(next),metadata:{supersedesQuestionId:current.id,changeReason:reason}
      });
      return reply.code(201).send({question:next,supersededQuestionId:current.id});
    }
  );

  app.get<{Params:{id:string}}>(
    "/content/questions/:id/revisions",
    async (request, reply) => {
      if (!(await requireAdminRole(request, reply, CONTENT_REVIEW_ROLES))) return;
      const db = createDatabase();
      const current = await db.select().from(schema.questions).where(eq(schema.questions.id,request.params.id)).limit(1);
      if (!current[0]) return reply.code(404).send({error:"question_not_found"});
      const items = await db.select().from(schema.questionRevisions)
        .where(eq(schema.questionRevisions.questionId,request.params.id))
        .orderBy(desc(schema.questionRevisions.version));
      return {current:questionSnapshot(current[0]),items};
    }
  );

  app.post<{Body:{questions?:unknown[];dryRun?:boolean}}>(
    "/content/import/questions",
    async (request, reply) => {
      const admin = await requireAdminRole(request, reply, CONTENT_MANAGE_ROLES);
      if (!admin) return;
      const rows = Array.isArray(request.body?.questions) ? request.body.questions : [];
      if (!rows.length || rows.length > 1000) return reply.code(400).send({error:"invalid_import_batch"});
      const db = createDatabase();
      const accepted:Array<{index:number;value:Record<string,unknown>}> = [];
      const rejected:Array<{index:number;errors:string[]}> = [];

      for (let index=0; index<rows.length; index++) {
        const raw = rows[index] && typeof rows[index] === "object" ? rows[index] as Record<string,unknown> : {};
        const errors:string[] = [];
        const topicId=str(raw.topicId), language=str(raw.language)||"fa", content=str(raw.content);
        const correctChoice=str(raw.correctChoice).toUpperCase(), difficulty=str(raw.difficulty)||"medium";
        if (!topicId) errors.push("topicId");
        if (!content) errors.push("content");
        if (!validChoices(raw.choices)) errors.push("choices");
        if (!CHOICES.has(correctChoice)) errors.push("correctChoice");
        if (!LANGUAGES.has(language)) errors.push("language");
        if (!DIFFICULTIES.has(difficulty)) errors.push("difficulty");
        if (errors.length) rejected.push({index,errors});
        else accepted.push({index,value:{...raw,topicId,language,content,correctChoice,difficulty}});
      }

      const [batch] = await db.insert(schema.contentImportBatches).values({
        importType:"questions",status:request.body?.dryRun === false && rejected.length===0 ? "applied" : "validated",
        totalRows:rows.length,acceptedRows:accepted.length,rejectedRows:rejected.length,
        validationReport:{rejected},createdBy:admin.user.userId,
        appliedAt:request.body?.dryRun === false && rejected.length===0 ? new Date() : null
      }).returning();

      let inserted=0;
      if (request.body?.dryRun === false && rejected.length===0) {
        for (const item of accepted) {
          const v=item.value;
          await db.insert(schema.questions).values({
            topicId:String(v.topicId),language:String(v.language),questionType:"single_choice",
            content:String(v.content),choices:v.choices as Array<{key:"A"|"B"|"C"|"D";text:string}>,
            correctChoice:String(v.correctChoice),shortExplanation:opt(v.shortExplanation),
            detailedExplanation:opt(v.detailedExplanation),workedSolution:opt(v.workedSolution),
            difficulty:String(v.difficulty),marks:String(Number(v.marks??1)),
            sourceType:str(v.sourceType)||"editorial",
            sourceMetadata:v.sourceMetadata && typeof v.sourceMetadata==="object" ? v.sourceMetadata as Record<string,unknown> : {},
            verificationStatus:"draft",createdBy:admin.user.userId,updatedBy:admin.user.userId
          });
          inserted++;
        }
      }
      await writeAudit({actorUserId:admin.user.userId,action:"content.bulk_import.questions",entityType:"import_batch",entityId:batch.id,metadata:{dryRun:request.body?.dryRun!==false,totalRows:rows.length,accepted:accepted.length,rejected:rejected.length,inserted}});
      return {batch,inserted,rejected};
    }
  );

  app.get("/content/imports", async (request, reply) => {
    if (!(await requireAdminRole(request, reply, CONTENT_REVIEW_ROLES))) return;
    const db=createDatabase();
    return {items:await db.select().from(schema.contentImportBatches).orderBy(desc(schema.contentImportBatches.createdAt)).limit(100)};
  });

  app.get("/content/reports", async (request, reply) => {
    if (!(await requireAdminRole(request, reply, CONTENT_REVIEW_ROLES))) return;
    const db=createDatabase();
    return {items:await db.select().from(schema.contentReports).orderBy(desc(schema.contentReports.createdAt)).limit(200)};
  });

  app.post<{Body:Record<string,unknown>}>("/content/reports", async (request, reply) => {
    const admin=await requireAdminRole(request,reply,CONTENT_REVIEW_ROLES);
    if(!admin)return;
    const reportType=str(request.body.reportType),description=str(request.body.description),questionId=opt(request.body.questionId);
    if(!REPORT_TYPES.has(reportType)||!description)return reply.code(400).send({error:"invalid_content_report"});
    const db=createDatabase();
    if(questionId){
      const q=await db.select({id:schema.questions.id}).from(schema.questions).where(eq(schema.questions.id,questionId)).limit(1);
      if(!q[0])return reply.code(404).send({error:"question_not_found"});
    }
    const [item]=await db.insert(schema.contentReports).values({questionId,reportType,description,source:"admin_review",reportedBy:admin.user.userId}).returning();
    await writeAudit({actorUserId:admin.user.userId,action:"content_report.create",entityType:"content_report",entityId:item.id,after:item as unknown as Record<string,unknown>});
    return reply.code(201).send({item});
  });

  app.patch<{Params:{id:string};Body:Record<string,unknown>}>("/content/reports/:id", async (request, reply) => {
    const admin=await requireAdminRole(request,reply,CONTENT_REVIEW_ROLES);
    if(!admin)return;
    const status=str(request.body.status);
    if(!REPORT_STATUSES.has(status))return reply.code(400).send({error:"invalid_report_status"});
    const db=createDatabase();
    const rows=await db.select().from(schema.contentReports).where(eq(schema.contentReports.id,request.params.id)).limit(1);
    if(!rows[0])return reply.code(404).send({error:"report_not_found"});
    const resolutionNotes=opt(request.body.resolutionNotes);
    const terminal=["resolved","dismissed"].includes(status);
    const [item]=await db.update(schema.contentReports).set({
      status,resolutionNotes,resolvedBy:terminal?admin.user.userId:null,resolvedAt:terminal?new Date():null
    }).where(eq(schema.contentReports.id,request.params.id)).returning();
    await writeAudit({actorUserId:admin.user.userId,action:"content_report.update",entityType:"content_report",entityId:item.id,before:rows[0] as unknown as Record<string,unknown>,after:item as unknown as Record<string,unknown>});
    return {item};
  });

  app.get("/audit", async (request, reply) => {
    if (!(await requireAdminRole(request, reply, CONTENT_MANAGE_ROLES))) return;
    const db=createDatabase();
    return {items:await db.select({
      id:schema.adminAuditLogs.id,action:schema.adminAuditLogs.action,entityType:schema.adminAuditLogs.entityType,
      entityId:schema.adminAuditLogs.entityId,metadata:schema.adminAuditLogs.metadata,createdAt:schema.adminAuditLogs.createdAt,
      actorEmail:schema.users.email
    }).from(schema.adminAuditLogs).leftJoin(schema.users,eq(schema.adminAuditLogs.actorUserId,schema.users.id))
      .orderBy(desc(schema.adminAuditLogs.createdAt)).limit(300)};
  });

  app.get("/dashboard", async (request, reply) => {
    if (!(await requireAdminRole(request, reply, CONTENT_REVIEW_ROLES))) return;
    const db=createDatabase();
    const [users,attempts,questions,reports,payments] = await Promise.all([
      db.select({count:sql<number>`count(*)`}).from(schema.users),
      db.select({count:sql<number>`count(*)`}).from(schema.examAttempts).where(eq(schema.examAttempts.status,"analyzed")),
      db.select({status:schema.questions.verificationStatus,count:sql<number>`count(*)`}).from(schema.questions).groupBy(schema.questions.verificationStatus),
      db.select({status:schema.contentReports.status,count:sql<number>`count(*)`}).from(schema.contentReports).groupBy(schema.contentReports.status),
      db.select({status:schema.paymentTransactions.status,count:sql<number>`count(*)`}).from(schema.paymentTransactions).groupBy(schema.paymentTransactions.status)
    ]);
    return {users:Number(users[0]?.count??0),completedExams:Number(attempts[0]?.count??0),questionHealth:questions,reportHealth:reports,paymentActivity:payments};
  });

  app.get("/users", async (request, reply) => {
    if (!(await requireAdminRole(request, reply, CONTENT_MANAGE_ROLES))) return;
    const db=createDatabase();
    return {items:await db.select({
      id:schema.users.id,email:schema.users.email,role:schema.users.role,preferredLanguage:schema.users.preferredLanguage,
      targetExamYear:schema.users.targetExamYear,onboardingCompletedAt:schema.users.onboardingCompletedAt,createdAt:schema.users.createdAt
    }).from(schema.users).orderBy(desc(schema.users.createdAt)).limit(300)};
  });

  app.patch<{Params:{id:string};Body:{role?:string}}>("/users/:id/role", async (request, reply) => {
    const admin=await requireAdminRole(request,reply,SUPER_ADMIN_ROLES);
    if(!admin)return;
    const role=str(request.body?.role);
    const allowed=["student","content_reviewer","content_admin","admin","super_admin"];
    if(!allowed.includes(role))return reply.code(400).send({error:"invalid_role"});
    const db=createDatabase();
    const rows=await db.select().from(schema.users).where(eq(schema.users.id,request.params.id)).limit(1);
    if(!rows[0])return reply.code(404).send({error:"user_not_found"});
    await db.update(schema.users).set({role,updatedAt:new Date()}).where(eq(schema.users.id,request.params.id));
    await writeAudit({actorUserId:admin.user.userId,action:"user.role_change",entityType:"user",entityId:request.params.id,before:{role:rows[0].role},after:{role}});
    return {updated:true};
  });
};
