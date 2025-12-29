import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'crypto';
import { getClientIp } from '../common/request-ip';

type AnyRequest = {
  ip?: string;
  baseUrl?: string;
  route?: { path?: string };
  body?: unknown;
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function getBodyStringField(body: unknown, key: string): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const record = body as Record<string, unknown>;
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  // Make throttling key more NAT-friendly for auth endpoints:
  // - /auth/register: ip + username+email (hashed)
  // - /auth/login, /auth/resend-verification, /auth/forgot-password: ip + identifier (hashed)
  // Keep other endpoints as default behavior.
  protected generateKey(context: any, suffix: string, name: string): string {
    const req = this.getRequestResponse(context)?.req as AnyRequest | undefined;
    const ip = (getClientIp(req ?? {}) || '').trim();
    const baseUrl = req?.baseUrl || '';
    const routePath = req?.route?.path || '';
    const fullPath = `${baseUrl}${routePath}`;

    const body = req?.body;
    const identifier = getBodyStringField(body, 'identifier')?.trim();
    const username = getBodyStringField(body, 'username')?.trim();
    const email = getBodyStringField(body, 'email')?.trim().toLowerCase();

    let extra = '';
    if (fullPath === '/auth/register') {
      // Avoid storing raw values in redis keys.
      extra = sha256(`u:${username || ''}|e:${email || ''}`);
    } else if (
      fullPath === '/auth/login' ||
      fullPath === '/auth/resend-verification' ||
      fullPath === '/auth/forgot-password'
    ) {
      if (identifier) extra = sha256(identifier.toLowerCase());
    }

    if (ip && extra) {
      return `throttle:${name}:${ip}:${extra}:${suffix}`;
    }

    return super.generateKey(context, suffix, name);
  }
}
