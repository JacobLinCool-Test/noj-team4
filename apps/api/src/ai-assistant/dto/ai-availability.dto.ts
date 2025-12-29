import { AiProvider } from '@prisma/client';

export type AiAvailabilityDto = {
  canUse: boolean;
  reason?: string;
  scope: {
    problemStatement: boolean;
    userCode: boolean;
    compileError: boolean;
    judgeSummary: boolean;
  };
  provider: AiProvider;
  model: string | null;
  rateLimit?: {
    perMinute: number;
    perHour: number;
  };
};
