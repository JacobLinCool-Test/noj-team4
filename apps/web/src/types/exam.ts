export type ExamStatus = "UPCOMING" | "ONGOING" | "ENDED";

export type ExamListItem = {
  id: string;
  courseId: number;
  title: string;
  startsAt: string;
  endsAt: string;
  status: ExamStatus;
  problemCount: number;
  codeCount: number;
  usedCodeCount: number;
  scoreboardVisible: boolean;
  createdBy: { id: number; username: string; nickname: string | null };
};

export type ExamCode = {
  code: string;
  examId: string;
  studentId: number;
  studentUsername: string;
  studentNickname: string | null;
  studentEmail: string | null;
  usedAt: string | null;
  usedIp: string | null;
  createdAt: string;
};

export type ExamDetail = {
  id: string;
  courseId: number;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  status: ExamStatus;
  problemIds: string[];
  ipAllowList: string[];
  scoreboardVisible: boolean;
  createdBy: { id: number; username: string; nickname: string | null };
  canEdit: boolean;
  canDelete: boolean;
};

export type CreateExamPayload = {
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  problemIds: string[];
  ipAllowList?: string[];
  scoreboardVisible?: boolean;
};

export type UpdateExamPayload = Partial<CreateExamPayload>;

export type GenerateCodesPayload = {
  studentIds: number[];
};

export type ScoreboardEntry = {
  userId: number;
  username: string;
  nickname: string | null;
  totalScore: number;
  solvedCount: number;
  problems: Record<string, { score: number; solved: boolean }>;
};

export type ScoreboardResponse = {
  exam: {
    id: string;
    title: string;
    problemIds: string[];
  };
  scoreboard: ScoreboardEntry[];
};
