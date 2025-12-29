import { SetMetadata } from '@nestjs/common';
import { TokenScope } from '@prisma/client';

export const SCOPES_KEY = 'scopes';

/**
 * 標記端點需要的 API Token scopes
 * 只有當使用 API Token 驗證時才會檢查 scopes
 * JWT 驗證會跳過 scope 檢查
 *
 * @param scopes - 需要的 scopes（滿足任一即可）
 * @example
 * @RequireScopes(TokenScope.READ_USER, TokenScope.READ_COURSES)
 */
export const RequireScopes = (...scopes: TokenScope[]) =>
  SetMetadata(SCOPES_KEY, scopes);
