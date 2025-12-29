import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenScope } from '@prisma/client';
import { SCOPES_KEY } from '../decorators/require-scopes.decorator';

/**
 * Scope 權限檢查守衛
 * 只有當使用 API Token 驗證時才會檢查 scopes
 * JWT 驗證會自動通過（因為 JWT 代表用戶本人）
 */
@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 獲取端點所需的 scopes
    const requiredScopes = this.reflector.getAllAndOverride<TokenScope[]>(
      SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果沒有設置 scopes 要求，直接通過
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authSource = request.authSource;

    // 如果是 JWT 驗證，直接通過（JWT 代表用戶本人，有完整權限）
    if (authSource === 'jwt') {
      return true;
    }

    // 如果是 API Token 驗證，檢查 scopes
    if (authSource === 'api-token') {
      const tokenScopes = request.apiTokenScopes as TokenScope[];

      if (!tokenScopes || tokenScopes.length === 0) {
        throw new ForbiddenException('API token has no scopes');
      }

      // 檢查是否有任一所需的 scope
      const hasRequiredScope = requiredScopes.some((scope) =>
        tokenScopes.includes(scope),
      );

      if (!hasRequiredScope) {
        throw new ForbiddenException(
          `API token missing required scope. Required: ${requiredScopes.join(', ')}`,
        );
      }

      return true;
    }

    // 未知的驗證來源，拒絕
    throw new ForbiddenException('Unknown authentication source');
  }
}
