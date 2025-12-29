import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { ApiTokenDto, CreatedApiTokenDto } from './dto/api-token.dto';
import { TokenScope } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ApiTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 生成 API Token
   */
  async create(
    userId: number,
    dto: CreateApiTokenDto,
    ip?: string,
    userAgent?: string,
  ): Promise<CreatedApiTokenDto> {
    // 生成隨機 token (格式: noj_pat_<32字節隨機字符串的hex>)
    const randomBytes = crypto.randomBytes(32);
    const token = `noj_pat_${randomBytes.toString('hex')}`;

    // 使用 SHA-256 hash token 用於儲存
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 儲存 token 到資料庫
    const apiToken = await this.prisma.apiToken.create({
      data: {
        name: dto.name,
        tokenHash,
        scopes: dto.scopes,
        userId,
        ip,
        userAgent,
      },
    });

    return {
      id: apiToken.id,
      name: apiToken.name,
      scopes: apiToken.scopes,
      lastUsedAt: apiToken.lastUsedAt,
      createdAt: apiToken.createdAt,
      expiresAt: apiToken.expiresAt,
      revokedAt: apiToken.revokedAt,
      token, // 明文 token，只在創建時返回
    };
  }

  /**
   * 列出用戶的所有 API Tokens
   */
  async listUserTokens(userId: number): Promise<ApiTokenDto[]> {
    const tokens = await this.prisma.apiToken.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tokens.map((token) => ({
      id: token.id,
      name: token.name,
      scopes: token.scopes,
      lastUsedAt: token.lastUsedAt,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
    }));
  }

  /**
   * 撤銷 API Token
   */
  async revoke(userId: number, tokenId: number): Promise<void> {
    const token = await this.prisma.apiToken.findUnique({
      where: { id: tokenId },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    if (token.userId !== userId) {
      throw new ForbiddenException('You do not own this token');
    }

    if (token.revokedAt) {
      throw new ForbiddenException('Token is already revoked');
    }

    await this.prisma.apiToken.update({
      where: { id: tokenId },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  /**
   * 驗證 token 並返回相關資訊
   * 這個方法會被 API Token Strategy 使用
   */
  async validateToken(token: string): Promise<{
    userId: number;
    tokenId: number;
    scopes: TokenScope[];
  } | null> {
    // Hash 提供的 token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 查找 token
    const apiToken = await this.prisma.apiToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            status: true,
          },
        },
      },
    });

    // 驗證 token 是否存在、未撤銷、未過期、用戶是否啟用
    if (
      !apiToken ||
      apiToken.revokedAt ||
      (apiToken.expiresAt && apiToken.expiresAt < new Date()) ||
      apiToken.user.status !== 'ACTIVE'
    ) {
      return null;
    }

    // 更新 lastUsedAt（非阻塞）
    this.prisma.apiToken
      .update({
        where: { id: apiToken.id },
        data: {
          lastUsedAt: new Date(),
        },
      })
      .catch(() => {
        // 忽略錯誤，lastUsedAt 更新失敗不應該影響請求
      });

    return {
      userId: apiToken.userId,
      tokenId: apiToken.id,
      scopes: apiToken.scopes,
    };
  }

  /**
   * 檢查 token 是否具有指定的 scope
   */
  hasScope(tokenScopes: TokenScope[], requiredScope: TokenScope): boolean {
    return tokenScopes.includes(requiredScope);
  }

  /**
   * 檢查 token 是否具有任意一個指定的 scope
   */
  hasAnyScope(
    tokenScopes: TokenScope[],
    requiredScopes: TokenScope[],
  ): boolean {
    return requiredScopes.some((scope) => tokenScopes.includes(scope));
  }

  /**
   * 檢查 token 是否具有所有指定的 scope
   */
  hasAllScopes(
    tokenScopes: TokenScope[],
    requiredScopes: TokenScope[],
  ): boolean {
    return requiredScopes.every((scope) => tokenScopes.includes(scope));
  }
}
