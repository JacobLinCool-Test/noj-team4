import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Redis 分散式鎖服務
 * 用於防止多個 Judge Worker 同時刷新同一個題目的測資
 */
@Injectable()
export class RedisLockService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisLockService.name);
  private redis: Redis;

  async onModuleInit() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null, // Required for BullMQ compatibility
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected for lock service');
    });
  }

  async onModuleDestroy() {
    await this.redis?.quit();
  }

  /**
   * 取得分散式鎖
   * @param key 鎖的鍵
   * @param ttlMs 鎖的有效期（毫秒）
   * @param retryCount 重試次數
   * @param retryDelayMs 重試間隔（毫秒）
   * @returns 鎖的 token（用於解鎖），如果失敗返回 null
   */
  async acquireLock(
    key: string,
    ttlMs: number = 60000,
    retryCount: number = 10,
    retryDelayMs: number = 200,
  ): Promise<string | null> {
    const lockKey = `lock:${key}`;
    const token = `${Date.now()}-${Math.random().toString(36).substring(2)}`;

    for (let i = 0; i < retryCount; i++) {
      // 使用 SET NX EX 來原子性地取得鎖
      const result = await this.redis.set(
        lockKey,
        token,
        'PX',
        ttlMs,
        'NX',
      );

      if (result === 'OK') {
        this.logger.debug(`Acquired lock: ${lockKey}`);
        return token;
      }

      // 鎖已被佔用，等待後重試
      if (i < retryCount - 1) {
        await this.delay(retryDelayMs);
      }
    }

    this.logger.warn(`Failed to acquire lock after ${retryCount} attempts: ${lockKey}`);
    return null;
  }

  /**
   * 釋放分散式鎖
   * @param key 鎖的鍵
   * @param token 取得鎖時返回的 token
   * @returns 是否成功釋放
   */
  async releaseLock(key: string, token: string): Promise<boolean> {
    const lockKey = `lock:${key}`;

    // 使用 Lua 腳本來原子性地檢查並刪除
    // 只有當 token 匹配時才刪除，防止誤刪其他進程的鎖
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, lockKey, token);

    if (result === 1) {
      this.logger.debug(`Released lock: ${lockKey}`);
      return true;
    } else {
      this.logger.warn(`Failed to release lock (token mismatch or expired): ${lockKey}`);
      return false;
    }
  }

  /**
   * 使用鎖執行操作
   * @param key 鎖的鍵
   * @param fn 要執行的操作
   * @param ttlMs 鎖的有效期（毫秒）
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs: number = 60000,
  ): Promise<T> {
    const token = await this.acquireLock(key, ttlMs);

    if (!token) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(key, token);
    }
  }

  /**
   * 嘗試使用鎖執行操作，如果無法取得鎖則返回 null
   * @param key 鎖的鍵
   * @param fn 要執行的操作
   * @param ttlMs 鎖的有效期（毫秒）
   */
  async tryWithLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttlMs: number = 60000,
  ): Promise<T | null> {
    const token = await this.acquireLock(key, ttlMs, 1, 0); // 不重試

    if (!token) {
      this.logger.debug(`Could not acquire lock, skipping: ${key}`);
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(key, token);
    }
  }

  /**
   * 檢查並取得快取值，如果快取不存在或過期則使用 loader 更新
   * 使用分散式鎖確保只有一個進程執行 loader
   */
  async getOrLoad<T>(
    cacheKey: string,
    loader: () => Promise<T>,
    ttlSeconds: number = 600,
  ): Promise<T | null> {
    const lockKey = `loader:${cacheKey}`;

    // 先嘗試取得快取
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // 快取損壞，需要重新載入
      }
    }

    // 取得鎖後載入資料
    return this.withLock(lockKey, async () => {
      // 雙重檢查：可能在等待鎖的時候其他進程已經載入了
      const cachedAgain = await this.redis.get(cacheKey);
      if (cachedAgain) {
        try {
          return JSON.parse(cachedAgain) as T;
        } catch {
          // 快取損壞，繼續載入
        }
      }

      // 載入資料
      const data = await loader();
      if (data !== null && data !== undefined) {
        await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(data));
      }
      return data;
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
