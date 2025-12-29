import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { RedisLockService } from '../redis/redis-lock.service';
import { SubmissionStatus, SubmissionType, PipelineStageType } from '@prisma/client';
import AdmZip from 'adm-zip';
import { SandboxRunner } from '../sandbox/sandbox.runner';
import { PipelineExecutor } from '../pipeline/pipeline.executor';
import { PipelineContext } from '../pipeline/types/stage-context.interface';
import { ProblemPipelineConfig } from '../pipeline/types/pipeline-config.interface';
import * as path from 'path';
import * as fs from 'fs-extra';
import {
  extractBase64Securely,
  extractZipSecurely,
  ZipSecurityError,
} from '../utils/zip-security';

interface JudgeJob {
  submissionId: string;
}

interface TestdataManifest {
  version: string;
  cases: {
    name: string;
    inputFile: string;
    outputFile: string;
    points: number;
    isSample: boolean;
    timeLimitMs?: number;
    memoryLimitKb?: number;
  }[];
  defaultTimeLimitMs: number;
  defaultMemoryLimitKb: number;
}

interface CachedTestdata {
  zip: AdmZip;
  manifest: TestdataManifest;
  fetchedAt: number;
}

const TESTDATA_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const TESTDATA_CACHE_MAX_SIZE = 50;

@Processor('judge-submission', {
  concurrency: Number.parseInt(process.env.NOJ_JUDGE_CONCURRENCY || '1', 10) || 1,
})
@Injectable()
export class JudgeProcessor extends WorkerHost {
  private readonly logger = new Logger(JudgeProcessor.name);
  private testdataCache: Map<string, CachedTestdata> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly redisLock: RedisLockService,
    @Inject('SANDBOX_RUNNER') private readonly sandbox: SandboxRunner,
    private readonly pipelineExecutor: PipelineExecutor,
  ) {
    super();
  }

  async process(job: Job<JudgeJob>): Promise<void> {
    const { submissionId } = job.data;
    this.logger.log(`[Pipeline] Processing submission ${submissionId}`);

    try {
      // Fetch submission from DB
      const submission = await this.prisma.submission.findUnique({
        where: { id: submissionId },
        include: { problem: true },
      });

      if (!submission) {
        throw new Error(`Submission ${submissionId} not found`);
      }

      // Update status to RUNNING
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: { status: SubmissionStatus.RUNNING },
      });

      // 準備 Pipeline 配置
      const pipelineConfig = this.preparePipelineConfig(submission.problem);

      // 建立 Pipeline 上下文
      const pipelineContext = await this.createPipelineContext(submission);

      try {
        // 執行 Pipeline
        const result = await this.pipelineExecutor.execute(
          pipelineContext,
          pipelineConfig,
        );

        // 儲存結果到資料庫
        await this.saveResults(submissionId, result);

        this.logger.log(
          `[Pipeline] Submission ${submissionId} judged: ${result.finalStatus} (分數: ${result.score})`,
        );
      } finally {
        // 清理工作目錄
        await this.cleanup(pipelineContext);
      }
    } catch (error) {
      this.logger.error(
        `[Pipeline] Error judging submission ${submissionId}:`,
        error,
      );

      // Update submission as JUDGE_ERROR
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.JUDGE_ERROR,
          judgedAt: new Date(),
          summary: { error: error.message },
        },
      });

      throw error;
    }
  }

  /**
   * 準備 Pipeline 配置
   * 如果題目沒有自訂配置，使用預設配置
   */
  private preparePipelineConfig(problem: any): ProblemPipelineConfig {
    // 如果題目有自訂 Pipeline 配置
    if (problem.pipelineConfig) {
      // 處理兩種格式：
      // 1. { stages: [...] } - 正確格式
      // 2. [...] - 舊格式（直接是陣列）
      const config = problem.pipelineConfig;
      if (Array.isArray(config)) {
        return { stages: config };
      }
      if (config.stages && Array.isArray(config.stages)) {
        return config as ProblemPipelineConfig;
      }
      // 如果格式不正確，使用預設配置
      this.logger.warn(`[Pipeline] 題目 ${problem.displayId} 的 pipelineConfig 格式不正確，使用預設配置`);
    }

    // 否則使用預設配置：編譯 -> 執行 -> 檢查
    return {
      stages: [
        {
          type: PipelineStageType.COMPILE,
          config: {},
        },
        {
          type: PipelineStageType.EXECUTE,
          config: {
            useTestdata: true,
          },
        },
        {
          type: PipelineStageType.CHECK,
          config: {
            mode: 'diff',
            ignoreWhitespace: true,
            caseSensitive: true,
          },
        },
      ],
    };
  }

  /**
   * 建立 Pipeline 上下文
   */
  private async createPipelineContext(
    submission: any,
  ): Promise<PipelineContext> {
    const { problem } = submission;

    // 建立工作目錄
    const sandboxJob = await this.sandbox.createJob(submission.id);
    const jobDir = sandboxJob.jobDir;

    // 下載原始碼
    const sourceCode = await this.minio.getObjectAsString(
      'noj-submissions',
      submission.sourceKey,
    );

    // 處理不同的提交類型
    if (problem.submissionType === SubmissionType.MULTI_FILE) {
      // 多檔案專案：解壓縮 ZIP
      await this.extractMultiFileSubmission(sourceCode, path.join(jobDir, 'src'));
    } else if (problem.submissionType === SubmissionType.SINGLE_FILE) {
      // 單一檔案：稍後由 CompileStage 處理
    }

    // 下載測資
    let testdataManifest: TestdataManifest | undefined;
    const testdata = await this.fetchTestdata(problem.id);
    if (testdata) {
      testdataManifest = testdata.manifest;
      await this.extractTestdata(testdata.zip, path.join(jobDir, 'testdata'));
    }

    // 準備範例測資作為備用
    const sampleCases = (problem.sampleInputs || []).map(
      (input: string, i: number) => ({
        input,
        output: problem.sampleOutputs?.[i] || '',
      }),
    );

    // 建立上下文
    const context: PipelineContext = {
      submissionId: submission.id,
      userId: submission.userId,
      problemId: problem.id,
      language: submission.language,
      submissionType: problem.submissionType || SubmissionType.SINGLE_FILE,
      jobDir,
      srcDir: path.join(jobDir, 'src'),
      buildDir: path.join(jobDir, 'build'),
      testdataDir: path.join(jobDir, 'testdata'),
      outDir: path.join(jobDir, 'out'),
      sourceCode,
      sourceKey: submission.sourceKey,
      testdataManifest,
      testdataVersion: submission.testdataVersion,
      sampleCases,
      checkerKey: problem.checkerKey,
      checkerLanguage: problem.checkerLanguage,
      templateKey: problem.templateKey,
      makefileKey: problem.makefileKey,
      artifactPaths: problem.artifactPaths || [],
      networkConfig: problem.networkConfig,
      stageData: new Map(),
      artifacts: new Map(),
    };

    return context;
  }

  /**
   * 解壓縮多檔案提交（含 Zip Slip 防護）
   */
  private async extractMultiFileSubmission(
    zipContent: string,
    targetDir: string,
  ): Promise<void> {
    try {
      const extractedFiles = await extractBase64Securely(zipContent, targetDir, {
        checkDangerousFiles: true,
        maxUncompressedSize: 50 * 1024 * 1024, // 50MB for submissions
      });
      this.logger.debug(
        `安全解壓縮多檔案提交到 ${targetDir}，共 ${extractedFiles.length} 個檔案`,
      );
    } catch (error) {
      if (error instanceof ZipSecurityError) {
        this.logger.warn(`多檔案提交安全檢查失敗: ${error.code} - ${error.message}`);
        throw new Error(`提交檔案安全檢查失敗: ${error.code}`);
      }
      throw error;
    }
  }

  /**
   * 解壓縮測資到目錄（含 Zip Slip 防護）
   */
  private async extractTestdata(
    zip: AdmZip,
    targetDir: string,
  ): Promise<void> {
    try {
      const extractedFiles = await extractZipSecurely(zip, targetDir, {
        checkDangerousFiles: false, // 測資可能包含各種檔案作為輸入
        maxUncompressedSize: 100 * 1024 * 1024, // 100MB for testdata
      });
      this.logger.debug(
        `安全解壓縮測資到 ${targetDir}，共 ${extractedFiles.length} 個檔案`,
      );
    } catch (error) {
      if (error instanceof ZipSecurityError) {
        this.logger.error(`測資安全檢查失敗: ${error.code} - ${error.message}`);
        throw new Error(`測資安全檢查失敗: ${error.code}`);
      }
      throw error;
    }
  }

  /**
   * 儲存結果到資料庫
   */
  private async saveResults(submissionId: string, result: any): Promise<void> {
    // 更新 Submission
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: result.finalStatus,
        score: result.score,
        rawScore: result.rawScore,
        judgedAt: new Date(),
        compileLog: result.compileLog,
        summary: result.summary,
        pipelineResults: result.stageResults,
        artifactsKey: result.artifactsKey,
      },
    });

    // 建立 SubmissionCase 記錄
    if (result.testCaseResults && result.testCaseResults.length > 0) {
      for (const testCase of result.testCaseResults) {
        await this.prisma.submissionCase.create({
          data: {
            submissionId,
            caseNo: testCase.caseNo,
            name: testCase.name,
            status: testCase.status,
            timeMs: testCase.timeMs,
            memoryKb: testCase.memoryKb,
            stdoutTrunc: testCase.stdout?.substring(0, 65536),
            stderrTrunc: testCase.stderr?.substring(0, 65536),
            expectedOutputTrunc: testCase.expectedOutput?.substring(0, 65536),
            points: testCase.points,
            isSample: testCase.isSample,
          },
        });
      }
    }
  }

  /**
   * 清理工作目錄
   */
  private async cleanup(context: PipelineContext): Promise<void> {
    try {
      await this.sandbox.cleanupJob({ jobDir: context.jobDir } as any);
    } catch (error) {
      this.logger.warn(
        `[${context.submissionId}] 清理工作目錄失敗: ${error.message}`,
      );
    }
  }

  /**
   * 從快取或 MinIO 獲取測資（使用分散式鎖防止併發刷新）
   */
  private async fetchTestdata(
    problemId: string,
  ): Promise<CachedTestdata | null> {
    // Check local cache first (本地快取檢查不需要鎖)
    const cached = this.testdataCache.get(problemId);
    if (cached && Date.now() - cached.fetchedAt < TESTDATA_CACHE_TTL) {
      this.logger.debug(`[Testdata] 使用本地快取: ${problemId}`);
      return cached;
    }

    // 使用分散式鎖防止多個 worker 同時刷新同一題的測資
    const lockKey = `testdata:${problemId}`;
    const lockToken = await this.redisLock.acquireLock(lockKey, 60000, 30, 500);

    if (!lockToken) {
      // 無法取得鎖，可能其他 worker 正在刷新
      // 稍等後再次嘗試從本地快取取得（可能已被其他 worker 更新）
      this.logger.debug(
        `[Testdata] 等待其他 worker 刷新測資: ${problemId}`,
      );
      await this.delay(1000);
      const cachedAfterWait = this.testdataCache.get(problemId);
      if (cachedAfterWait && Date.now() - cachedAfterWait.fetchedAt < TESTDATA_CACHE_TTL) {
        return cachedAfterWait;
      }
      // 如果還是沒有快取，嘗試強制取得鎖
      return this.fetchTestdataWithLock(problemId);
    }

    try {
      return await this.fetchTestdataInternal(problemId);
    } finally {
      await this.redisLock.releaseLock(lockKey, lockToken);
    }
  }

  /**
   * 強制取得鎖後刷新測資
   */
  private async fetchTestdataWithLock(
    problemId: string,
  ): Promise<CachedTestdata | null> {
    return this.redisLock.withLock(
      `testdata:${problemId}`,
      async () => {
        // 雙重檢查：可能在等待鎖的時候已被其他進程更新
        const cached = this.testdataCache.get(problemId);
        if (cached && Date.now() - cached.fetchedAt < TESTDATA_CACHE_TTL) {
          return cached;
        }
        return this.fetchTestdataInternal(problemId);
      },
      60000,
    );
  }

  /**
   * 實際執行測資載入（假設已取得鎖）
   */
  private async fetchTestdataInternal(
    problemId: string,
  ): Promise<CachedTestdata | null> {
    // 再次檢查快取（在取得鎖後）
    const cached = this.testdataCache.get(problemId);
    if (cached && Date.now() - cached.fetchedAt < TESTDATA_CACHE_TTL) {
      return cached;
    }

    // Fetch active testdata from database
    const testdataRecord = await this.prisma.problemTestdata.findFirst({
      where: { problemId, isActive: true },
      orderBy: { version: 'desc' },
    });

    if (!testdataRecord) {
      return null;
    }

    this.logger.debug(
      `[Testdata] 從 MinIO 下載測資: ${problemId} v${testdataRecord.version}`,
    );

    // Download ZIP from MinIO
    const zipBuffer = await this.minio.getObject(
      'noj-testdata',
      testdataRecord.zipKey,
    );
    const zip = new AdmZip(zipBuffer);

    const manifest = testdataRecord.manifest as unknown as TestdataManifest;

    const testdata: CachedTestdata = {
      zip,
      manifest,
      fetchedAt: Date.now(),
    };

    // Update local cache
    this.testdataCache.set(problemId, testdata);

    // Clean up old cache entries
    if (this.testdataCache.size > TESTDATA_CACHE_MAX_SIZE) {
      const oldestKey = Array.from(this.testdataCache.entries()).sort(
        (a, b) => a[1].fetchedAt - b[1].fetchedAt,
      )[0][0];
      this.testdataCache.delete(oldestKey);
    }

    this.logger.log(
      `[Testdata] 測資已更新: ${problemId} v${testdataRecord.version}`,
    );

    return testdata;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
