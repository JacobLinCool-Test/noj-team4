import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { SandboxRunner } from '../sandbox/sandbox.runner';
interface JudgeJob {
    submissionId: string;
}
export declare class JudgeProcessor extends WorkerHost {
    private readonly prisma;
    private readonly minio;
    private readonly sandbox;
    private readonly logger;
    private testdataCache;
    constructor(prisma: PrismaService, minio: MinioService, sandbox: SandboxRunner);
    process(job: Job<JudgeJob>): Promise<void>;
    private compareOutput;
    private normalizeOutput;
    private prepareTestCases;
    private fetchTestdata;
    private getTestdataFromCache;
    private cacheTestdata;
}
export {};
