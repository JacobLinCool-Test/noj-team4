import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { RedisLockService } from '../redis/redis-lock.service';
import { SandboxRunner } from '../sandbox/sandbox.runner';
import { PipelineExecutor } from '../pipeline/pipeline.executor';
interface JudgeJob {
    submissionId: string;
}
export declare class JudgeProcessor extends WorkerHost {
    private readonly prisma;
    private readonly minio;
    private readonly redisLock;
    private readonly sandbox;
    private readonly pipelineExecutor;
    private readonly logger;
    private testdataCache;
    constructor(prisma: PrismaService, minio: MinioService, redisLock: RedisLockService, sandbox: SandboxRunner, pipelineExecutor: PipelineExecutor);
    process(job: Job<JudgeJob>): Promise<void>;
    private preparePipelineConfig;
    private createPipelineContext;
    private extractMultiFileSubmission;
    private extractTestdata;
    private saveResults;
    private cleanup;
    private fetchTestdata;
    private fetchTestdataWithLock;
    private fetchTestdataInternal;
    private delay;
}
export {};
