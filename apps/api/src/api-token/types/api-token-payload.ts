import { TokenScope } from '@prisma/client';

export interface ApiTokenPayload {
  sub: number; // User ID
  tokenId: number; // Token ID
  scopes: TokenScope[];
}
