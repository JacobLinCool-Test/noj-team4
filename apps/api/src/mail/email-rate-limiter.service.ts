import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { SystemConfigService } from '../system-config/system-config.service';

export type EmailSendType = 'verify_email' | 'password_reset';

type Policy = {
  ttlSeconds: number;
  perRecipientLimit: number;
  perIpLimit: number;
};

type GlobalIpPolicy = {
  ttlSeconds: number;
  limit: number;
};

const LUA_TWO_KEYS = `
local key1 = KEYS[1]
local key2 = KEYS[2]
local limit1 = tonumber(ARGV[1])
local limit2 = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])

local v1 = redis.call('INCR', key1)
if v1 == 1 then redis.call('EXPIRE', key1, ttl) end

local v2 = redis.call('INCR', key2)
if v2 == 1 then redis.call('EXPIRE', key2, ttl) end

if v1 > limit1 or v2 > limit2 then
  return 0
end
return 1
`;

const LUA_ONE_KEY = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local v = redis.call('INCR', key)
if v == 1 then redis.call('EXPIRE', key, ttl) end

if v > limit then
  return 0
end
return 1
`;

// Check 3 keys: recipient, type-specific IP+user, and global IP (cross-type)
// - recipientKey: prevents spamming one email address
// - typeIpUserKey: per-user limit, NAT-friendly (different users behind same IP have independent limits)
// - globalIpKey: prevents mass spam from one IP to many different recipients
const LUA_THREE_KEYS = `
local recipientKey = KEYS[1]
local typeIpKey = KEYS[2]
local globalIpKey = KEYS[3]
local recipientLimit = tonumber(ARGV[1])
local typeIpLimit = tonumber(ARGV[2])
local globalIpLimit = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])
local globalTtl = tonumber(ARGV[5])

local v1 = redis.call('INCR', recipientKey)
if v1 == 1 then redis.call('EXPIRE', recipientKey, ttl) end

local v2 = redis.call('INCR', typeIpKey)
if v2 == 1 then redis.call('EXPIRE', typeIpKey, ttl) end

local v3 = redis.call('INCR', globalIpKey)
if v3 == 1 then redis.call('EXPIRE', globalIpKey, globalTtl) end

if v1 > recipientLimit or v2 > typeIpLimit or v3 > globalIpLimit then
  return 0
end
return 1
`;

@Injectable()
export class EmailRateLimiterService {
  private readonly logger = new Logger(EmailRateLimiterService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async shouldSend(params: {
    type: EmailSendType;
    recipientEmail: string;
    ip?: string;
  }): Promise<boolean> {
    const normalizedEmail = params.recipientEmail.trim().toLowerCase();
    if (!normalizedEmail) return false;

    const limits = await this.systemConfigService.getEmailRateLimits();
    const policy = this.getPolicy(params.type, limits);
    const globalIpPolicy = this.getGlobalIpPolicy(limits);
    const recipientHash = this.sha256(normalizedEmail);
    const recipientKey = `rl:mail:${params.type}:to:${recipientHash}`;

    const ip = params.ip?.trim();
    if (!ip) {
      const allowed = await this.evalOneKey(
        recipientKey,
        policy.perRecipientLimit,
        policy.ttlSeconds,
      );
      if (!allowed) {
        this.logger.warn(
          `Email rate limited (no ip) type=${params.type} recipientHash=${recipientHash}`,
        );
      }
      return allowed;
    }

    const ipHash = this.sha256(ip);
    // Combine IP + email for NAT-friendly per-user limit
    const ipUserHash = this.sha256(`${ip}:${normalizedEmail}`);
    const typeIpUserKey = `rl:mail:${params.type}:ip_user:${ipUserHash}`;
    // Pure IP key for global limit (still needed to prevent mass spam)
    const globalIpKey = `rl:mail:global:ip:${ipHash}`;

    const allowed = await this.evalThreeKeys(
      recipientKey,
      typeIpUserKey,
      globalIpKey,
      policy.perRecipientLimit,
      policy.perIpLimit,
      globalIpPolicy.limit,
      policy.ttlSeconds,
      globalIpPolicy.ttlSeconds,
    );
    if (!allowed) {
      this.logger.warn(
        `Email rate limited type=${params.type} recipientHash=${recipientHash} ipHash=${ipHash}`,
      );
    }
    return allowed;
  }

  private getPolicy(
    type: EmailSendType,
    limits: Awaited<ReturnType<SystemConfigService['getEmailRateLimits']>>,
  ): Policy {
    if (type === 'verify_email') {
      return {
        ttlSeconds: limits.verify.ttlSeconds,
        perRecipientLimit: limits.verify.perRecipientLimit,
        perIpLimit: limits.verify.perIpLimit,
      };
    }

    return {
      ttlSeconds: limits.reset.ttlSeconds,
      perRecipientLimit: limits.reset.perRecipientLimit,
      perIpLimit: limits.reset.perIpLimit,
    };
  }

  private getGlobalIpPolicy(
    limits: Awaited<ReturnType<SystemConfigService['getEmailRateLimits']>>,
  ): GlobalIpPolicy {
    return {
      ttlSeconds: limits.globalIp.ttlSeconds,
      limit: limits.globalIp.limit,
    };
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private async evalThreeKeys(
    recipientKey: string,
    typeIpKey: string,
    globalIpKey: string,
    recipientLimit: number,
    typeIpLimit: number,
    globalIpLimit: number,
    ttlSeconds: number,
    globalTtlSeconds: number,
  ): Promise<boolean> {
    const result = (await this.redisService.client.eval(
      LUA_THREE_KEYS,
      3,
      recipientKey,
      typeIpKey,
      globalIpKey,
      String(recipientLimit),
      String(typeIpLimit),
      String(globalIpLimit),
      String(ttlSeconds),
      String(globalTtlSeconds),
    )) as number;
    return result === 1;
  }

  private async evalTwoKeys(
    key1: string,
    key2: string,
    limit1: number,
    limit2: number,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = (await this.redisService.client.eval(
      LUA_TWO_KEYS,
      2,
      key1,
      key2,
      String(limit1),
      String(limit2),
      String(ttlSeconds),
    )) as number;
    return result === 1;
  }

  private async evalOneKey(
    key: string,
    limit: number,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = (await this.redisService.client.eval(
      LUA_ONE_KEY,
      1,
      key,
      String(limit),
      String(ttlSeconds),
    )) as number;
    return result === 1;
  }
}
