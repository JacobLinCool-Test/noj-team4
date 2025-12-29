import type { ProgrammingLanguage } from "@/lib/api/problem";

export type HomeworkStatus = "UPCOMING" | "ONGOING" | "ENDED";

export type HomeworkListItem = {
  id: string;
  courseId: number;
  title: string;
  startAt: string;
  endAt: string;
  status: HomeworkStatus;
  problemCount: number;
  completedCount: number;
  createdBy: { id: number; username: string; nickname: string | null };
};

export type HomeworkProblem = {
  order: number;
  allowedLanguagesOverride: ProgrammingLanguage[] | null;
  problem: { id: string; displayId: string; title: string; allowedLanguages: ProgrammingLanguage[] };
  isCompleted: boolean;
};

export type HomeworkDetail = {
  id: string;
  courseId: number;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  status: HomeworkStatus;
  problems: HomeworkProblem[];
  createdBy: { id: number; username: string; nickname: string | null };
  canEdit: boolean;
  canDelete: boolean;
};

export type HomeworkProblemInput = {
  problemId: string;
  allowedLanguagesOverride?: ProgrammingLanguage[];
};

export type CreateHomeworkPayload = {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  problems: HomeworkProblemInput[];
};

export type UpdateHomeworkPayload = Partial<CreateHomeworkPayload>;
