import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ExamSession } from '../types';

/**
 * 從請求中提取考試 Session
 * 需要配合 ExamSessionGuard 使用
 */
export const CurrentExamSession = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ExamSession => {
    const request = ctx.switchToHttp().getRequest();
    return request.examSession;
  },
);
