import { Exam, ExamCode, User } from '@prisma/client';

/**
 * 考試 Session（從 JWT 解析出來的資訊）
 */
export interface ExamSessionPayload {
  /** 學生 userId */
  sub: number;
  /** 考試 ID */
  examId: string;
  /** 代碼 */
  code: string;
  /** 發行時間 */
  iat: number;
  /** 過期時間（= 考試結束時間） */
  exp: number;
}

/**
 * 完整的考試 Session（包含資料庫資料）
 */
export interface ExamSession {
  /** 學生 userId */
  userId: number;
  /** 學生資訊 */
  user: Pick<User, 'id' | 'username' | 'nickname'>;
  /** 考試資訊 */
  exam: Exam;
  /** 代碼資訊 */
  code: ExamCode;
}
