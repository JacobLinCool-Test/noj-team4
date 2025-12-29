import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SystemConfig } from '@prisma/client';

export type EmailRateLimits = {
  verify: {
    ttlSeconds: number;
    perRecipientLimit: number;
    perIpLimit: number;
  };
  reset: {
    ttlSeconds: number;
    perRecipientLimit: number;
    perIpLimit: number;
  };
  globalIp: {
    ttlSeconds: number;
    limit: number;
  };
};

// Default values matching email-rate-limiter.service.ts
const DEFAULT_LIMITS: EmailRateLimits = {
  verify: {
    ttlSeconds: 600,
    perRecipientLimit: 3,
    perIpLimit: 5,
  },
  reset: {
    ttlSeconds: 900,
    perRecipientLimit: 3,
    perIpLimit: 5,
  },
  globalIp: {
    ttlSeconds: 900,
    limit: 200,
  },
};

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);

  // Short-lived cache to avoid DB queries on every email send
  private configCache: SystemConfig | null = null;
  private configCacheTime = 0;
  private readonly CACHE_TTL_MS = 10_000; // 10 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get system config (singleton with id=1).
   * Creates with defaults if not exists.
   */
  async getConfig(): Promise<SystemConfig> {
    // Check cache first
    if (
      this.configCache &&
      Date.now() - this.configCacheTime < this.CACHE_TTL_MS
    ) {
      return this.configCache;
    }

    const config = await this.prisma.systemConfig.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });

    this.configCache = config;
    this.configCacheTime = Date.now();

    return config;
  }

  /**
   * Update system config and invalidate cache.
   */
  async updateConfig(data: Partial<Omit<SystemConfig, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SystemConfig> {
    const config = await this.prisma.systemConfig.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });

    // Invalidate cache
    this.configCache = config;
    this.configCacheTime = Date.now();

    return config;
  }

  /**
   * Check if registration is enabled.
   * Auto re-enables if disabledUntil has passed.
   */
  async isRegistrationEnabled(): Promise<boolean> {
    const config = await this.getConfig();

    if (config.registrationEnabled) {
      return true;
    }

    // Check if disabled-until has passed
    if (
      config.registrationDisabledUntil &&
      config.registrationDisabledUntil <= new Date()
    ) {
      // Auto re-enable
      this.logger.log('Auto re-enabling registration (disabled-until expired)');
      await this.updateConfig({
        registrationEnabled: true,
        registrationDisabledUntil: null,
      });
      return true;
    }

    return false;
  }

  /**
   * Check if email sending is enabled.
   * Auto re-enables if disabledUntil has passed.
   */
  async isEmailSendingEnabled(): Promise<boolean> {
    const config = await this.getConfig();

    if (config.emailSendingEnabled) {
      return true;
    }

    // Check if disabled-until has passed
    if (
      config.emailSendingDisabledUntil &&
      config.emailSendingDisabledUntil <= new Date()
    ) {
      // Auto re-enable
      this.logger.log('Auto re-enabling email sending (disabled-until expired)');
      await this.updateConfig({
        emailSendingEnabled: true,
        emailSendingDisabledUntil: null,
      });
      return true;
    }

    return false;
  }

  /**
   * Get email rate limits.
   * Priority: DB config > environment variables > defaults
   */
  async getEmailRateLimits(): Promise<EmailRateLimits> {
    const config = await this.getConfig();

    return {
      verify: {
        ttlSeconds: this.getLimit(
          config.emailRlVerifyTtl,
          'EMAIL_RL_VERIFY_TTL',
          DEFAULT_LIMITS.verify.ttlSeconds,
        ),
        perRecipientLimit: this.getLimit(
          config.emailRlVerifyToLimit,
          'EMAIL_RL_VERIFY_TO_LIMIT',
          DEFAULT_LIMITS.verify.perRecipientLimit,
        ),
        perIpLimit: this.getLimit(
          config.emailRlVerifyIpLimit,
          'EMAIL_RL_VERIFY_IP_LIMIT',
          DEFAULT_LIMITS.verify.perIpLimit,
        ),
      },
      reset: {
        ttlSeconds: this.getLimit(
          config.emailRlResetTtl,
          'EMAIL_RL_RESET_TTL',
          DEFAULT_LIMITS.reset.ttlSeconds,
        ),
        perRecipientLimit: this.getLimit(
          config.emailRlResetToLimit,
          'EMAIL_RL_RESET_TO_LIMIT',
          DEFAULT_LIMITS.reset.perRecipientLimit,
        ),
        perIpLimit: this.getLimit(
          config.emailRlResetIpLimit,
          'EMAIL_RL_RESET_IP_LIMIT',
          DEFAULT_LIMITS.reset.perIpLimit,
        ),
      },
      globalIp: {
        ttlSeconds: this.getLimit(
          config.emailRlGlobalIpTtl,
          'EMAIL_RL_GLOBAL_IP_TTL',
          DEFAULT_LIMITS.globalIp.ttlSeconds,
        ),
        limit: this.getLimit(
          config.emailRlGlobalIpLimit,
          'EMAIL_RL_GLOBAL_IP_LIMIT',
          DEFAULT_LIMITS.globalIp.limit,
        ),
      },
    };
  }

  /**
   * Get a limit value with fallback chain: DB > env > default
   */
  private getLimit(
    dbValue: number | null,
    envKey: string,
    defaultValue: number,
  ): number {
    // 1. DB value takes priority
    if (dbValue !== null && dbValue > 0) {
      return dbValue;
    }

    // 2. Environment variable
    const envValue = this.configService.get<string>(envKey);
    if (envValue) {
      const parsed = Number.parseInt(envValue, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    // 3. Default value
    return defaultValue;
  }

  /**
   * Invalidate the config cache (useful for testing or forced refresh)
   */
  invalidateCache(): void {
    this.configCache = null;
    this.configCacheTime = 0;
  }
}
