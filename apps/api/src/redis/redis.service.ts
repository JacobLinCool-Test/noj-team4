import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnApplicationShutdown {
  readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST') || '127.0.0.1';
    const port = Number.parseInt(
      this.configService.get<string>('REDIS_PORT') || '6379',
      10,
    );
    const password = this.configService.get<string>('REDIS_PASSWORD');

    this.client = new Redis({
      host,
      port: Number.isNaN(port) ? 6379 : port,
      password: password || undefined,
      enableReadyCheck: true,
      maxRetriesPerRequest: null,
    });
  }

  async onApplicationShutdown() {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
