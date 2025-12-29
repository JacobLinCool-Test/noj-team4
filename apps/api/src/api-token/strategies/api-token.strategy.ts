import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { ApiTokenService } from '../api-token.service';
import { ApiTokenPayload } from '../types/api-token-payload';

@Injectable()
export class ApiTokenStrategy extends PassportStrategy(Strategy, 'api-token') {
  constructor(private readonly apiTokenService: ApiTokenService) {
    super();
  }

  async validate(token: string): Promise<ApiTokenPayload> {
    const result = await this.apiTokenService.validateToken(token);

    if (!result) {
      throw new UnauthorizedException('Invalid or expired API token');
    }

    return {
      sub: result.userId,
      tokenId: result.tokenId,
      scopes: result.scopes,
    };
  }
}
