import { IsString, IsOptional, MaxLength, IsBoolean, IsIn } from 'class-validator';

export class StartSessionDto {
  @IsOptional()
  @IsString()
  courseSlug?: string;
}

export class ChatRequestDto {
  @IsString()
  @MaxLength(5000)
  message: string;

  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  courseSlug?: string;

  /**
   * Generation mode:
   * - 'direct': For homepage - generate problem immediately without conversation
   * - 'conversation': For problem page - guided conversation before generation
   */
  @IsOptional()
  @IsString()
  @IsIn(['direct', 'conversation'])
  mode?: 'direct' | 'conversation';
}

export class SessionResponseDto {
  sessionId: string;
  createdAt: string;
}

export class ChatResponseDto {
  sessionId: string;
  message: string;
  problemReady: boolean;
  problemData?: GeneratedProblemDto;
  solutionData?: GeneratedSolutionDto;
}

export class GeneratedProblemDto {
  title: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  hint?: string;
  sampleCases: Array<{ input: string; output: string }>;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string[];
  constraints: {
    timeLimitMs: number;
    memoryLimitKb: number;
  };
  suggestedTestInputs?: string[];
}

export class GeneratedSolutionDto {
  language: 'C' | 'CPP' | 'JAVA' | 'PYTHON';
  code: string;
}

export class AvailabilityResponseDto {
  available: boolean;
  reason?: string;
  rateLimit: {
    minIntervalMs: number;
    maxPerMinute: number;
    maxPerSession: number;
  };
  sessionInfo?: {
    sessionId: string;
    messageCount: number;
  };
}
