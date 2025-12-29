"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisLockService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisLockService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisLockService = RedisLockService_1 = class RedisLockService {
    constructor() {
        this.logger = new common_1.Logger(RedisLockService_1.name);
    }
    async onModuleInit() {
        this.redis = new ioredis_1.default({
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: null,
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
    async acquireLock(key, ttlMs = 60000, retryCount = 10, retryDelayMs = 200) {
        const lockKey = `lock:${key}`;
        const token = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
        for (let i = 0; i < retryCount; i++) {
            const result = await this.redis.set(lockKey, token, 'PX', ttlMs, 'NX');
            if (result === 'OK') {
                this.logger.debug(`Acquired lock: ${lockKey}`);
                return token;
            }
            if (i < retryCount - 1) {
                await this.delay(retryDelayMs);
            }
        }
        this.logger.warn(`Failed to acquire lock after ${retryCount} attempts: ${lockKey}`);
        return null;
    }
    async releaseLock(key, token) {
        const lockKey = `lock:${key}`;
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
        }
        else {
            this.logger.warn(`Failed to release lock (token mismatch or expired): ${lockKey}`);
            return false;
        }
    }
    async withLock(key, fn, ttlMs = 60000) {
        const token = await this.acquireLock(key, ttlMs);
        if (!token) {
            throw new Error(`Failed to acquire lock: ${key}`);
        }
        try {
            return await fn();
        }
        finally {
            await this.releaseLock(key, token);
        }
    }
    async tryWithLock(key, fn, ttlMs = 60000) {
        const token = await this.acquireLock(key, ttlMs, 1, 0);
        if (!token) {
            this.logger.debug(`Could not acquire lock, skipping: ${key}`);
            return null;
        }
        try {
            return await fn();
        }
        finally {
            await this.releaseLock(key, token);
        }
    }
    async getOrLoad(cacheKey, loader, ttlSeconds = 600) {
        const lockKey = `loader:${cacheKey}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            }
            catch {
            }
        }
        return this.withLock(lockKey, async () => {
            const cachedAgain = await this.redis.get(cacheKey);
            if (cachedAgain) {
                try {
                    return JSON.parse(cachedAgain);
                }
                catch {
                }
            }
            const data = await loader();
            if (data !== null && data !== undefined) {
                await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(data));
            }
            return data;
        });
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.RedisLockService = RedisLockService;
exports.RedisLockService = RedisLockService = RedisLockService_1 = __decorate([
    (0, common_1.Injectable)()
], RedisLockService);
//# sourceMappingURL=redis-lock.service.js.map