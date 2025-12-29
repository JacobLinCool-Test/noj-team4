import { Injectable } from '@nestjs/common';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService {
  private client: Minio.Client;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'noj_minio',
      secretKey: process.env.MINIO_SECRET_KEY || 'noj_minio_dev_password_change_me',
    });
  }

  async getObject(bucket: string, key: string): Promise<Buffer> {
    const stream = await this.client.getObject(bucket, key);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async putObject(
    bucket: string,
    key: string,
    data: Buffer | string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
    await this.client.putObject(bucket, key, buffer, buffer.length, metadata);
  }

  async getObjectAsString(bucket: string, key: string): Promise<string> {
    const buffer = await this.getObject(bucket, key);
    return buffer.toString('utf-8');
  }
}
