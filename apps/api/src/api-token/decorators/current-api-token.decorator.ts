import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiTokenPayload } from '../types/api-token-payload';

export const CurrentApiToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ApiTokenPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
