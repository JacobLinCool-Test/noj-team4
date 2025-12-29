import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

/**
 * Rate Limit 配置
 */
export interface RateLimitConfig {
  minIntervalMs: number;      // 訊息間隔最小時間（毫秒）
  maxPerMinute: number;       // 每分鐘最大訊息數
  maxPerSession: number;      // 每 session 最大訊息數
  maxPerHour: number;         // 每小時全局最大次數（跨所有 session）
  maxConsecutiveIdentical: number; // 連續相同訊息最大數量
  banDurationMinutes: number; // 封鎖時間（分鐘）
}

/**
 * Rate Limit 檢查結果
 */
export interface RateLimitResult {
  allowed: boolean;
  reason?: 'INTERVAL' | 'MINUTE_LIMIT' | 'SESSION_LIMIT' | 'HOURLY_LIMIT' | 'CONSECUTIVE_IDENTICAL' | 'BANNED';
  retryAfterMs?: number;
  sessionMessageCount?: number;
  hourlyCount?: number;
  banExpiresAt?: Date;
}

/**
 * Session 資訊
 */
export interface SessionInfo {
  sessionId: string;
  messageCount: number;
  createdAt: Date;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  minIntervalMs: 3000,         // 3 秒
  maxPerMinute: 10,            // 每分鐘 10 則
  maxPerSession: 100,          // 每 session 100 則
  maxPerHour: 60,              // 每小時 60 次（跨所有 session）
  maxConsecutiveIdentical: 10, // 連續 10 則相同
  banDurationMinutes: 15,      // 封鎖 15 分鐘
};

/**
 * 增強版 Rate Limit Lua Script
 *
 * KEYS:
 * 1. interval_key - 上次訊息時間戳
 * 2. minute_key - 本分鐘訊息計數
 * 3. session_key - session 訊息計數
 * 4. hash_key - 上則訊息 hash
 * 5. consecutive_key - 連續相同計數
 * 6. history_key - 近 10 則訊息 hash 列表
 * 7. hourly_key - 每小時全局計數（跨所有 session）
 *
 * ARGV:
 * 1. min_interval_ms
 * 2. max_per_minute
 * 3. max_per_session
 * 4. current_time_ms
 * 5. message_hash
 * 6. max_consecutive
 * 7. session_ttl (秒)
 * 8. max_per_hour
 */
const LUA_ENHANCED_RATE_LIMIT = `
local interval_key = KEYS[1]
local minute_key = KEYS[2]
local session_key = KEYS[3]
local hash_key = KEYS[4]
local consecutive_key = KEYS[5]
local history_key = KEYS[6]
local hourly_key = KEYS[7]

local min_interval_ms = tonumber(ARGV[1])
local max_per_minute = tonumber(ARGV[2])
local max_per_session = tonumber(ARGV[3])
local current_time_ms = tonumber(ARGV[4])
local message_hash = ARGV[5]
local max_consecutive = tonumber(ARGV[6])
local session_ttl = tonumber(ARGV[7])
local max_per_hour = tonumber(ARGV[8])

-- 1. 檢查訊息間隔
local last_time = tonumber(redis.call('GET', interval_key) or '0')
local time_diff = current_time_ms - last_time
if time_diff < min_interval_ms then
  return {0, 'INTERVAL', min_interval_ms - time_diff, 0, 0, 0}
end

-- 2. 檢查每分鐘限制
local minute_count = tonumber(redis.call('GET', minute_key) or '0')
if minute_count >= max_per_minute then
  local ttl = redis.call('TTL', minute_key)
  return {0, 'MINUTE_LIMIT', ttl * 1000, 0, 0, 0}
end

-- 3. 檢查 session 限制
local session_count = tonumber(redis.call('GET', session_key) or '0')
if session_count >= max_per_session then
  return {0, 'SESSION_LIMIT', 0, session_count, 0, 0}
end

-- 4. 檢查每小時全局限制（跨所有 session）
local hourly_count = tonumber(redis.call('GET', hourly_key) or '0')
if hourly_count >= max_per_hour then
  local ttl = redis.call('TTL', hourly_key)
  return {0, 'HOURLY_LIMIT', ttl * 1000, session_count, 0, hourly_count}
end

-- 5. 檢查連續相同訊息
local last_hash = redis.call('GET', hash_key)
local consecutive = 0
if last_hash == message_hash then
  consecutive = tonumber(redis.call('INCR', consecutive_key) or '1')
else
  redis.call('SET', consecutive_key, '1')
  redis.call('EXPIRE', consecutive_key, 3600)
  consecutive = 1
end

-- 6. 檢查近 10 則是否全部相同
redis.call('LPUSH', history_key, message_hash)
redis.call('LTRIM', history_key, 0, 9)
redis.call('EXPIRE', history_key, 3600)

local history = redis.call('LRANGE', history_key, 0, 9)
local all_same = true
local first_hash = history[1]
for i = 2, #history do
  if history[i] ~= first_hash then
    all_same = false
    break
  end
end

if #history >= max_consecutive and all_same then
  return {0, 'CONSECUTIVE_IDENTICAL', 0, session_count, consecutive, hourly_count}
end

-- 所有檢查通過，更新計數器
redis.call('SET', interval_key, tostring(current_time_ms))
redis.call('EXPIRE', interval_key, 120)

local new_minute = redis.call('INCR', minute_key)
if new_minute == 1 then
  redis.call('EXPIRE', minute_key, 60)
end

local new_session = redis.call('INCR', session_key)
if new_session == 1 then
  redis.call('EXPIRE', session_key, session_ttl)
end

-- 更新每小時全局計數
local new_hourly = redis.call('INCR', hourly_key)
if new_hourly == 1 then
  redis.call('EXPIRE', hourly_key, 3600)
end

redis.call('SET', hash_key, message_hash)
redis.call('EXPIRE', hash_key, 3600)

return {1, 'OK', 0, new_session, consecutive, new_hourly}
`;

@Injectable()
export class EnhancedRateLimitService {
  private readonly config: RateLimitConfig;

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      minIntervalMs: this.getInt('AI_RL_MIN_INTERVAL_MS', DEFAULT_CONFIG.minIntervalMs),
      maxPerMinute: this.getInt('AI_RL_MAX_PER_MINUTE', DEFAULT_CONFIG.maxPerMinute),
      maxPerSession: this.getInt('AI_RL_MAX_PER_SESSION', DEFAULT_CONFIG.maxPerSession),
      maxPerHour: this.getInt('AI_RL_MAX_PER_HOUR', DEFAULT_CONFIG.maxPerHour),
      maxConsecutiveIdentical: this.getInt('AI_RL_MAX_CONSECUTIVE', DEFAULT_CONFIG.maxConsecutiveIdentical),
      banDurationMinutes: this.getInt('AI_RL_BAN_DURATION_MINUTES', DEFAULT_CONFIG.banDurationMinutes),
    };
  }

  /**
   * 檢查 rate limit
   */
  async checkRateLimit(params: {
    userId: number;
    sessionId: string;
    message: string;
    ip?: string;
    deviceFingerprint?: string;
  }): Promise<RateLimitResult> {
    // 1. 先檢查是否被封鎖
    const banCheck = await this.checkBan(params.ip, params.deviceFingerprint);
    if (banCheck) {
      return {
        allowed: false,
        reason: 'BANNED',
        banExpiresAt: banCheck.expiresAt,
      };
    }

    // 2. 執行 Lua script 檢查 rate limit
    const messageHash = this.hashMessage(params.message);
    const currentTimeMs = Date.now();
    const sessionTtl = 7200; // 2 小時 session TTL

    const keyPrefix = `rl:ai:${params.userId}:${params.sessionId}`;
    const keys = [
      `${keyPrefix}:interval`,
      `${keyPrefix}:minute`,
      `${keyPrefix}:session`,
      `${keyPrefix}:hash`,
      `${keyPrefix}:consecutive`,
      `${keyPrefix}:history`,
      `rl:ai:global:${params.userId}:hourly`, // Global hourly key (not session-specific)
    ];

    const result = (await this.redis.client.eval(
      LUA_ENHANCED_RATE_LIMIT,
      7, // Now 7 keys
      ...keys,
      String(this.config.minIntervalMs),
      String(this.config.maxPerMinute),
      String(this.config.maxPerSession),
      String(currentTimeMs),
      messageHash,
      String(this.config.maxConsecutiveIdentical),
      String(sessionTtl),
      String(this.config.maxPerHour),
    )) as [number, string, number, number, number, number];

    const [allowed, reason, retryAfterMs, sessionCount, consecutiveCount, hourlyCount] = result;

    if (allowed === 1) {
      return {
        allowed: true,
        sessionMessageCount: sessionCount,
        hourlyCount,
      };
    }

    // 如果是連續相同訊息，自動封鎖
    if (reason === 'CONSECUTIVE_IDENTICAL') {
      await this.applyBan({
        ip: params.ip,
        deviceFingerprint: params.deviceFingerprint,
        userId: params.userId,
        reason: 'CONSECUTIVE_IDENTICAL_MESSAGES',
      });
    }

    return {
      allowed: false,
      reason: reason as RateLimitResult['reason'],
      retryAfterMs: retryAfterMs > 0 ? retryAfterMs : undefined,
      sessionMessageCount: sessionCount,
      hourlyCount,
    };
  }

  /**
   * 檢查是否被封鎖
   */
  async checkBan(ip?: string, deviceFingerprint?: string): Promise<{ expiresAt: Date } | null> {
    const identifiers: string[] = [];
    if (ip) identifiers.push(`ip:${ip}`);
    if (deviceFingerprint) identifiers.push(`device:${deviceFingerprint}`);
    if (ip && deviceFingerprint) identifiers.push(`combo:${ip}:${deviceFingerprint}`);

    if (identifiers.length === 0) return null;

    const now = new Date();
    const ban = await this.prisma.aiRateLimitBan.findFirst({
      where: {
        identifier: { in: identifiers },
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: 'desc' },
    });

    return ban ? { expiresAt: ban.expiresAt } : null;
  }

  /**
   * 套用封鎖
   */
  async applyBan(params: {
    ip?: string;
    deviceFingerprint?: string;
    userId?: number;
    reason: string;
  }): Promise<void> {
    const expiresAt = new Date(Date.now() + this.config.banDurationMinutes * 60 * 1000);
    const identifiers: string[] = [];

    if (params.ip) identifiers.push(`ip:${params.ip}`);
    if (params.deviceFingerprint) identifiers.push(`device:${params.deviceFingerprint}`);
    if (params.ip && params.deviceFingerprint) {
      identifiers.push(`combo:${params.ip}:${params.deviceFingerprint}`);
    }

    // 至少要有一個識別碼
    if (identifiers.length === 0 && params.userId) {
      identifiers.push(`user:${params.userId}`);
    }

    for (const identifier of identifiers) {
      await this.prisma.aiRateLimitBan.upsert({
        where: { identifier },
        update: {
          reason: params.reason,
          userId: params.userId,
          expiresAt,
          bannedAt: new Date(),
        },
        create: {
          identifier,
          reason: params.reason,
          userId: params.userId,
          expiresAt,
        },
      });
    }
  }

  /**
   * 產生 session ID
   */
  generateSessionId(userId: number): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${userId}-${timestamp}-${random}`;
  }

  /**
   * 取得 session 資訊
   */
  async getSessionInfo(userId: number, sessionId: string): Promise<SessionInfo | null> {
    const key = `rl:ai:${userId}:${sessionId}:session`;
    const count = await this.redis.client.get(key);

    if (!count) return null;

    return {
      sessionId,
      messageCount: parseInt(count, 10),
      createdAt: new Date(), // Redis 不保存建立時間，僅回傳當前
    };
  }

  /**
   * 重置 session（清除 rate limit 計數）
   */
  async resetSession(userId: number, sessionId: string): Promise<void> {
    const keyPrefix = `rl:ai:${userId}:${sessionId}`;
    const keys = [
      `${keyPrefix}:interval`,
      `${keyPrefix}:minute`,
      `${keyPrefix}:session`,
      `${keyPrefix}:hash`,
      `${keyPrefix}:consecutive`,
      `${keyPrefix}:history`,
    ];

    await this.redis.client.del(...keys);
  }

  /**
   * 清理過期的封鎖記錄
   */
  async cleanupExpiredBans(): Promise<number> {
    const result = await this.prisma.aiRateLimitBan.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  /**
   * 計算訊息 hash
   */
  private hashMessage(message: string): string {
    // 正規化訊息：去除前後空白、轉小寫
    const normalized = message.trim().toLowerCase();
    return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  /**
   * 取得設定值
   */
  private getInt(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    if (!raw) return fallback;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  /**
   * 取得當前設定
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }
}
