import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "kankorprep.exam.";
const ACTIVE_KEY = "kankorprep.exam.active";

export type ChoiceKey = "A" | "B" | "C" | "D";

export type ExamAnswerState = {
  examQuestionId: string;
  selectedChoice: ChoiceKey | null;
  flagged: boolean;
  timeSpentSeconds: number;
  clientRevision: number;
};

export type ExamQuestionState = {
  id: string;
  order: number;
  questionId: string;
  questionVersion: number;
  content: string;
  choices: Array<{ key: ChoiceKey; text: string }>;
  curriculum: Record<string, unknown>;
};

export type ExamAttemptState = {
  attempt: {
    id: string;
    examId: string;
    status: string;
    title: string;
    mode: string;
    questionCount: number;
    durationSeconds: number | null;
    language: string;
    startedAt: string | null;
    submittedAt: string | null;
    expiresAt: string | null;
    remainingSeconds: number | null;
    timeExpired: boolean;
    summary: {
      questionCount: number;
      answered: number;
      unanswered: number;
      flagged: number;
    };
  };
  questions: ExamQuestionState[];
  answers: ExamAnswerState[];
};

export type PersistedExam = {
  attemptId: string;
  payload: ExamAttemptState;
  currentIndex: number;
  updatedAt: string;
};

function key(attemptId: string) {
  return `${PREFIX}${attemptId}`;
}

export async function loadPersistedExam(attemptId: string): Promise<PersistedExam | null> {
  const raw = await AsyncStorage.getItem(key(attemptId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PersistedExam;
  } catch {
    await AsyncStorage.removeItem(key(attemptId));
    return null;
  }
}

export async function savePersistedExam(value: PersistedExam) {
  await AsyncStorage.multiSet([
    [key(value.attemptId), JSON.stringify(value)],
    [ACTIVE_KEY, value.attemptId]
  ]);
}

export async function getActivePersistedExam(): Promise<PersistedExam | null> {
  const attemptId = await AsyncStorage.getItem(ACTIVE_KEY);
  if (!attemptId) return null;
  const value = await loadPersistedExam(attemptId);
  if (!value) await AsyncStorage.removeItem(ACTIVE_KEY);
  return value;
}

export async function removePersistedExam(attemptId: string) {
  const activeId = await AsyncStorage.getItem(ACTIVE_KEY);
  const keys = [key(attemptId)];
  if (activeId === attemptId) keys.push(ACTIVE_KEY);
  await AsyncStorage.multiRemove(keys);
}

export function mergeExamAnswers(
  local: ExamAnswerState[],
  remote: ExamAnswerState[]
): ExamAnswerState[] {
  const merged = new Map<string, ExamAnswerState>();

  for (const answer of remote) merged.set(answer.examQuestionId, answer);
  for (const answer of local) {
    const current = merged.get(answer.examQuestionId);
    if (!current || answer.clientRevision >= current.clientRevision) {
      merged.set(answer.examQuestionId, answer);
    }
  }

  return [...merged.values()];
}
