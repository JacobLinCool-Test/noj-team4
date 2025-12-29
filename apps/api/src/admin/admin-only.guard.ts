import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload';
import type { Request } from 'express';

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;

    // 允許 ADMIN 或 demo-admin 帳號進入後台
    const isDemoAdmin = user?.username === 'demo-admin';
    if (!user || (user.role !== UserRole.ADMIN && !isDemoAdmin)) {
      throw new ForbiddenException('ADMIN_ONLY');
    }

    // demo-admin 只能讀取，不能修改
    if (isDemoAdmin) {
      const method = request.method?.toUpperCase();
      if (method !== 'GET') {
        throw new ForbiddenException('READ_ONLY_MODE');
      }
    }

    return true;
  }
}
