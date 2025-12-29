import type { ProgrammingLanguage } from '@prisma/client';

export type HomeworkStatus = 'UPCOMING' | 'ONGOING' | 'ENDED';

export type HomeworkListItemDto = {
  id: string;
  courseId: number;
  title: string;
  startAt: string;
  endAt: string;
  status: HomeworkStatus;
  problemCount: number;
  completedCount: number;
  createdBy: { id: number; username: string; nickname: string | null } | null;
};

export type HomeworkProblemDetailDto = {
  order: number;
  allowedLanguagesOverride: ProgrammingLanguage[] | null;
  problem: {
    id: string;
    displayId: string;
    title: string;
    allowedLanguages: ProgrammingLanguage[];
  };
  isCompleted: boolean;
};

export type HomeworkDetailDto = {
  id: string;
  courseId: number;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  status: HomeworkStatus;
  problems: HomeworkProblemDetailDto[];
  createdBy: { id: number; username: string; nickname: string | null } | null;
  canEdit: boolean;
  canDelete: boolean;
};
