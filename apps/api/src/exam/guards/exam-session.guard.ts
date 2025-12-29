import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ExamContestService } from '../exam-contest.service';
import { getClientIp, isIpAllowed } from '../utils';

@Injectable()
export class ExamSessionGuard implements CanActivate {
  constructor(private readonly examContestService: ExamContestService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 從 Cookie 取得 session token
    const sessionToken = request.cookies?.exam_session;
    if (!sessionToken) {
      throw new UnauthorizedException('Exam session required');
    }

    // 驗證 session
    const session =
      await this.examContestService.validateSession(sessionToken);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // 驗證 IP
    const clientIp = getClientIp(request);
    if (!isIpAllowed(clientIp, session.exam.ipAllowList)) {
      throw new ForbiddenException('IP not allowed');
    }

    // 驗證時間（只檢查是否已結束，允許提前登入看倒數）
    const now = new Date();
    if (now > session.exam.endsAt) {
      throw new ForbiddenException('Exam has ended');
    }

    // 將 session 附加到 request
    (request as any).examSession = session;

    return true;
  }
}
