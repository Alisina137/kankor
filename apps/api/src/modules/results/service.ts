import { asc, eq } from "drizzle-orm";
import { createDatabase, schema } from "@kankor/database";
import { getOwnedAttempt, parseScoringRules, type ScoringRules } from "../exams/service.js";

type SnapshotEntity = Record<string, unknown>;
type CurriculumSnapshot = {
  difficulty?: string;
  subject?: SnapshotEntity;
  grade?: SnapshotEntity;
  book?: SnapshotEntity;
  chapter?: SnapshotEntity;
  topic?: SnapshotEntity;
};

type ScoredQuestion = {
  examQuestionId: string;
  selectedChoice: string | null;
  flagged: boolean;
  timeSpentSeconds: number;
  correct: boolean | null;
  awardedScore: number;
  maxScore: number;
  curriculum: CurriculumSnapshot;
};

type DimensionRow = {
  id: string;
  label: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  maxScore: number;
  percentage: number;
  averageTimeSeconds: number;
};

function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function entityId(entity: SnapshotEntity | undefined, fallback: string) {
  const id = entity?.id;
  return typeof id === "string" && id ? id : fallback;
}

function labelFromEntity(entity: SnapshotEntity | undefined, fallback: string) {
  if (!entity) return fallback;
  for (const key of ["nameFa", "titleFa", "code", "number", "namePs", "titlePs"]) {
    const value = entity[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return fallback;
}

function buildDimension(
  questions: ScoredQuestion[],
  selector: (curriculum: CurriculumSnapshot) => { id: string; label: string } | null
): DimensionRow[] {
  const groups = new Map<string, DimensionRow & { timeTotal: number }>();

  for (const question of questions) {
    const selected = selector(question.curriculum);
    if (!selected) continue;

    const current = groups.get(selected.id) ?? {
      id: selected.id,
      label: selected.label,
      total: 0,
      correct: 0,
      incorrect: 0,
      unanswered: 0,
      score: 0,
      maxScore: 0,
      percentage: 0,
      averageTimeSeconds: 0,
      timeTotal: 0
    };

    current.total += 1;
    if (question.correct === true) current.correct += 1;
    else if (question.correct === false) current.incorrect += 1;
    else current.unanswered += 1;

    current.score += question.awardedScore;
    current.maxScore += question.maxScore;
    current.timeTotal += question.timeSpentSeconds;
    groups.set(selected.id, current);
  }

  return [...groups.values()].map(({ timeTotal, ...group }) => ({
    ...group,
    score: round(group.score),
    maxScore: round(group.maxScore),
    percentage: group.maxScore > 0 ? round((group.score / group.maxScore) * 100, 2) : 0,
    averageTimeSeconds: group.total > 0 ? round(timeTotal / group.total, 2) : 0
  }));
}

function calculateAward(marks: number, correct: boolean | null, rules: ScoringRules) {
  if (correct === true) return marks * rules.correctMultiplier;
  if (correct === false) return marks * rules.incorrectMultiplier;
  return marks * rules.unansweredMultiplier;
}

export async function getStoredResult(attemptId: string) {
  const db = createDatabase();
  const [resultRows, analysisRows] = await Promise.all([
    db.select().from(schema.attemptResults)
      .where(eq(schema.attemptResults.attemptId, attemptId))
      .limit(1),
    db.select().from(schema.attemptAnalyses)
      .where(eq(schema.attemptAnalyses.attemptId, attemptId))
      .limit(1)
  ]);

  return resultRows[0]
    ? {
        result: {
          ...resultRows[0],
          score: Number(resultRows[0].score),
          maxScore: Number(resultRows[0].maxScore),
          percentage: Number(resultRows[0].percentage)
        },
        analysis: analysisRows[0] ?? null
      }
    : null;
}

export async function scoreAttempt(attemptId: string, userId: string) {
  const existing = await getStoredResult(attemptId);
  if (existing?.analysis) return existing;

  const attempt = await getOwnedAttempt(attemptId, userId);
  if (!attempt) throw new Error("attempt_not_found");
  if (!["submitted", "scored", "analyzed"].includes(attempt.status)) {
    throw new Error("attempt_not_submitted");
  }

  const rules = parseScoringRules(attempt.scoringSnapshot);
  if (!rules) throw new Error("scoring_configuration_missing");

  const db = createDatabase();
  const [questions, answers] = await Promise.all([
    db.select({
      id: schema.examQuestions.id,
      order: schema.examQuestions.order,
      correctChoice: schema.examQuestions.correctChoiceSnapshot,
      marks: schema.examQuestions.marksSnapshot,
      curriculum: schema.examQuestions.curriculumSnapshot
    }).from(schema.examQuestions)
      .where(eq(schema.examQuestions.examId, attempt.examId))
      .orderBy(asc(schema.examQuestions.order)),
    db.select({
      id: schema.attemptAnswers.id,
      examQuestionId: schema.attemptAnswers.examQuestionId,
      selectedChoice: schema.attemptAnswers.selectedChoice,
      flagged: schema.attemptAnswers.flagged,
      timeSpentSeconds: schema.attemptAnswers.timeSpentSeconds
    }).from(schema.attemptAnswers)
      .where(eq(schema.attemptAnswers.attemptId, attempt.id))
  ]);

  const answerMap = new Map(answers.map((answer) => [answer.examQuestionId, answer]));

  const scored: ScoredQuestion[] = questions.map((question) => {
    const answer = answerMap.get(question.id);
    const selectedChoice = answer?.selectedChoice ?? null;
    const correct = selectedChoice == null ? null : selectedChoice === question.correctChoice;
    const marks = Number(question.marks);
    const awardedScore = calculateAward(marks, correct, rules);

    return {
      examQuestionId: question.id,
      selectedChoice,
      flagged: answer?.flagged ?? false,
      timeSpentSeconds: answer?.timeSpentSeconds ?? 0,
      correct,
      awardedScore,
      maxScore: marks * rules.correctMultiplier,
      curriculum: (question.curriculum ?? {}) as CurriculumSnapshot
    };
  });

  for (const item of scored) {
    const answer = answerMap.get(item.examQuestionId);
    if (!answer) continue;

    await db.update(schema.attemptAnswers).set({
      correct: item.correct,
      awardedScore: String(round(item.awardedScore))
    }).where(eq(schema.attemptAnswers.id, answer.id));
  }

  const rawScore = scored.reduce((sum, item) => sum + item.awardedScore, 0);
  const score = rules.floorAtZero ? Math.max(0, rawScore) : rawScore;
  const maxScore = scored.reduce((sum, item) => sum + item.maxScore, 0);
  const correctCount = scored.filter((item) => item.correct === true).length;
  const incorrectCount = scored.filter((item) => item.correct === false).length;
  const unansweredCount = scored.filter((item) => item.correct === null).length;

  const elapsedSeconds = attempt.startedAt && attempt.submittedAt
    ? Math.max(0, Math.floor((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000))
    : scored.reduce((sum, item) => sum + item.timeSpentSeconds, 0);

  const totalTimeSeconds = attempt.durationSeconds
    ? Math.min(elapsedSeconds, attempt.durationSeconds)
    : elapsedSeconds;

  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

  const bySubject = buildDimension(scored, (curriculum) => curriculum.subject ? ({
    id: entityId(curriculum.subject, "subject-unknown"),
    label: labelFromEntity(curriculum.subject, "Subject")
  }) : null);

  const byGrade = buildDimension(scored, (curriculum) => curriculum.grade ? ({
    id: entityId(curriculum.grade, "grade-unknown"),
    label: labelFromEntity(curriculum.grade, "Grade")
  }) : null);

  const byBook = buildDimension(scored, (curriculum) => curriculum.book ? ({
    id: entityId(curriculum.book, "book-unknown"),
    label: labelFromEntity(curriculum.book, "Book")
  }) : null);

  const byChapter = buildDimension(scored, (curriculum) => curriculum.chapter ? ({
    id: entityId(curriculum.chapter, "chapter-unknown"),
    label: labelFromEntity(curriculum.chapter, "Chapter")
  }) : null);

  const byTopic = buildDimension(scored, (curriculum) => curriculum.topic ? ({
    id: entityId(curriculum.topic, "topic-unknown"),
    label: labelFromEntity(curriculum.topic, "Topic")
  }) : null);

  const byDifficulty = buildDimension(scored, (curriculum) => {
    const difficulty = typeof curriculum.difficulty === "string" ? curriculum.difficulty : "unknown";
    return { id: difficulty, label: difficulty };
  });

  const rankedTopics = [...byTopic].sort((a, b) => b.percentage - a.percentage || b.total - a.total);
  const strongestAreas = rankedTopics.slice(0, 3);
  const weakestAreas = [...rankedTopics].reverse().slice(0, 3);
  const weakest = weakestAreas[0] ?? null;

  const overall = {
    score: round(score),
    maxScore: round(maxScore),
    percentage: round(percentage, 2),
    correct: correctCount,
    incorrect: incorrectCount,
    unanswered: unansweredCount,
    totalQuestions: scored.length,
    totalTimeSeconds
  };

  const timing = {
    totalTimeSeconds,
    averageTimePerQuestionSeconds: scored.length > 0 ? round(totalTimeSeconds / scored.length, 2) : 0,
    recordedQuestionTimeSeconds: scored.reduce((sum, item) => sum + item.timeSpentSeconds, 0)
  };

  const recommendation = weakest
    ? {
        type: "practice_topic",
        topicId: weakest.id,
        label: weakest.label,
        reason: "lowest_topic_accuracy",
        percentage: weakest.percentage
      }
    : {
        type: "take_another_exam",
        reason: "no_topic_breakdown"
      };

  await db.update(schema.examAttempts)
    .set({ status: "scored", updatedAt: new Date() })
    .where(eq(schema.examAttempts.id, attempt.id));

  await db.insert(schema.attemptResults).values({
    attemptId: attempt.id,
    score: String(round(score)),
    maxScore: String(round(maxScore)),
    percentage: String(round(percentage, 2)),
    correctCount,
    incorrectCount,
    unansweredCount,
    totalTimeSeconds,
    scoringSnapshot: rules
  }).onConflictDoNothing();

  await db.insert(schema.attemptAnalyses).values({
    attemptId: attempt.id,
    overall,
    bySubject,
    byGrade,
    byBook,
    byChapter,
    byTopic,
    byDifficulty,
    timing,
    strongestAreas,
    weakestAreas,
    recommendation
  }).onConflictDoNothing();

  await db.update(schema.examAttempts)
    .set({ status: "analyzed", updatedAt: new Date() })
    .where(eq(schema.examAttempts.id, attempt.id));

  const stored = await getStoredResult(attempt.id);
  if (!stored) throw new Error("result_persistence_failed");
  return stored;
}
