import { CopycatStatus, ProgrammingLanguage } from '@prisma/client';

export class CopycatReportSummary {
  languages: string[];
  avgSimilarity: number;
  maxSimilarity: number;
  suspiciousPairCount: number;
}

export class CopycatUserDto {
  id: number;
  username: string;
  nickname: string | null;
}

export class CopycatPairDto {
  id: string;
  leftUser: CopycatUserDto;
  rightUser: CopycatUserDto;
  language: ProgrammingLanguage;
  similarity: number;
  longestFragment: number;
  totalOverlap: number;
}

export class CopycatReportDto {
  id: string;
  courseId: number;
  problemId: string;
  status: CopycatStatus;
  studentCount: number;
  submissionCount: number;
  summary: CopycatReportSummary | null;
  errorMessage: string | null;
  requestedBy: CopycatUserDto;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  topPairs: CopycatPairDto[];
}

export class TriggerCopycatResponseDto {
  reportId: string;
  status: CopycatStatus;
}

export class PaginatedCopycatPairsDto {
  pairs: CopycatPairDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class CopycatPairsQueryDto {
  page?: number;
  limit?: number;
  minSimilarity?: number;
  language?: ProgrammingLanguage;
}

export class CopycatPairDetailDto {
  id: string;
  leftUser: CopycatUserDto;
  rightUser: CopycatUserDto;
  leftCode: string;
  rightCode: string;
  language: ProgrammingLanguage;
  similarity: number;
  longestFragment: number;
  totalOverlap: number;
}
