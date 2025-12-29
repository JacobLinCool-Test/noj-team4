import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TestdataController } from './testdata.controller';
import { TestdataService } from './testdata.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [
    PrismaModule,
    MinioModule,
    MulterModule.register({
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
      storage: {
        _handleFile: (req: any, file: any, cb: any) => {
          const chunks: Buffer[] = [];
          file.stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          file.stream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            cb(null, {
              buffer,
              size: buffer.length,
            } as any);
          });
          file.stream.on('error', cb);
        },
        _removeFile: (req: any, file: any, cb: any) => {
          cb(null);
        },
      } as any,
    }),
  ],
  controllers: [TestdataController],
  providers: [TestdataService],
  exports: [TestdataService],
})
export class TestdataModule {}
