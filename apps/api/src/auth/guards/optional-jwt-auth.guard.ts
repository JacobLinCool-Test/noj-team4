import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(
    err: any,
    user: any,
    info: any,
    _context?: ExecutionContext,
    _status?: any,
  ) {
    if (err) {
      throw err;
    }

    if (info instanceof Error) {
      const message = info.message?.toLowerCase() || '';
      if (
        message.includes('no auth token') ||
        message.includes('no auth credentials')
      ) {
        return undefined;
      }
      throw new UnauthorizedException('Invalid or expired token.');
    }

    return user;
  }
}
