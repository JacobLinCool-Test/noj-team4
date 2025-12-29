import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export declare class RedisLockService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private redis;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    acquireLock(key: string, ttlMs?: number, retryCount?: number, retryDelayMs?: number): Promise<string | null>;
    releaseLock(key: string, token: string): Promise<boolean>;
    withLock<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T>;
    tryWithLock<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T | null>;
    getOrLoad<T>(cacheKey: string, loader: () => Promise<T>, ttlSeconds?: number): Promise<T | null>;
    private delay;
}
