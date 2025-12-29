import { TokenScope } from '@prisma/client';

export class ApiTokenDto {
  id: number;
  name: string;
  scopes: TokenScope[];
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

export class CreatedApiTokenDto extends ApiTokenDto {
  token: string; // 明文 token，只在創建時返回一次
}
