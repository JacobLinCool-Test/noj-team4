import { BlockedSourceType, ProgrammingLanguage } from '@prisma/client';

export interface CodeSafetyCheckParams {
  source: string;
  language: ProgrammingLanguage;
  userId?: number;
  problemId?: string;
  sourceType: BlockedSourceType;
  ip?: string;
  userAgent?: string;
  examId?: string;
}

export interface CodeSafetyResult {
  isSafe: boolean;
  reason?: string;
  threatType?: string;
  analysis?: string;
}

export interface AiSafetyResponse {
  is_safe: boolean;
  threat_type: string;
  reason_zh: string;
  reason_en: string;
  analysis: string;
}
