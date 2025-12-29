import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

function parseTrustProxy(
  value: string | undefined,
): boolean | number | string | undefined {
  if (value == null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  const num = Number.parseInt(normalized, 10);
  if (!Number.isNaN(num) && num >= 0) return num;
  return value;
}

function parseAllowedOrigins(): string[] {
  const raw =
    process.env.WEB_ORIGINS?.trim() || process.env.WEB_ORIGIN?.trim() || '';
  const fromEnv = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const isProduction = process.env.NODE_ENV === 'production';
  const defaults = isProduction
    ? ['https://noj4.dev']
    : [
        'https://dev.noj4.dev',
        'http://localhost:3000',
        'http://localhost:3001',
      ];

  return Array.from(new Set([...fromEnv, ...defaults]));
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const isProduction = process.env.NODE_ENV === 'production';
  const webOrigin = process.env.WEB_ORIGIN?.trim() || '';
  const defaultTrustProxy =
    isProduction || webOrigin.startsWith('https://') ? 1 : false;
  const trustProxy =
    parseTrustProxy(process.env.TRUST_PROXY) ?? defaultTrustProxy;
  app.set('trust proxy', trustProxy);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  const allowedOrigins = new Set(parseAllowedOrigins());
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, allowedOrigins.has(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Locale'],
    exposedHeaders: ['X-Conversation-Id', 'X-Ai-Filtered'],
  });

  const port = Number.parseInt(process.env.PORT ?? '', 10) || 4000;
  await app.listen(port);
}
bootstrap();
