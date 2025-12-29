import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 組合守衛：接受 JWT 或 API Token 驗證
 * 如果其中一個驗證成功，就允許請求通過
 */
@Injectable()
export class JwtOrApiTokenAuthGuard extends AuthGuard(['jwt', 'api-token']) {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      // 如果兩種驗證都失敗，拋出錯誤
      throw error;
    }
  }

  /**
   * 處理請求：記錄驗證來源（JWT 或 API Token）
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new Error('Unauthorized');
    }

    const request = context.switchToHttp().getRequest();

    // 記錄驗證來源
    if (user.tokenId !== undefined) {
      request.authSource = 'api-token';
      request.apiTokenId = user.tokenId;
      request.apiTokenScopes = user.scopes;
    } else {
      request.authSource = 'jwt';
    }

    return user;
  }
}
