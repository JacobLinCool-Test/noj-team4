import type { Exam, ExamCode, User } from '@prisma/client';

export type ExamSession = {
  userId: number;
  user: Pick<User, 'id' | 'username' | 'nickname'>;
  exam: Exam;
  code: ExamCode;
};

export type ExamSessionPayload = {
  /** User ID */
  sub: number;
  /** Exam ID */
  examId: string;
  /** Exam Code */
  code: string;
  /** Issued at (Unix timestamp) */
  iat: number;
  /** Expires at (Unix timestamp) */
  exp: number;
};
