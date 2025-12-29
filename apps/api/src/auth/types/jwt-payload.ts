import { UserRole } from '@prisma/client';

export type JwtPayload = {
  sub: number;
  role: UserRole;
  username: string;
};
