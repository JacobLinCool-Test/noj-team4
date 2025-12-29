import { ProgrammingLanguage } from '@prisma/client';

export interface CopycatJobData {
  reportId: string;
  courseId: number;
  problemId: string;
}

export interface DolosFile {
  id: number;
  path: string;
  charCount: number;
  lineCount: number;
  label: string;
  fullName: string;
}

export interface DolosPair {
  leftFileId: number;
  rightFileId: number;
  similarity: number;
  longestFragment: number;
  totalOverlap: number;
}

export interface DolosResult {
  files: DolosFile[];
  pairs: DolosPair[];
  language: string;
}

export interface CopycatPairInput {
  leftUserId: number;
  leftSubmissionId: string;
  rightUserId: number;
  rightSubmissionId: string;
  language: ProgrammingLanguage;
  similarity: number;
  longestFragment: number;
  totalOverlap: number;
}

export interface SubmissionForCopycat {
  id: string;
  userId: number;
  language: ProgrammingLanguage;
  sourceKey: string;
  user: {
    username: string;
    nickname: string | null;
  };
}
