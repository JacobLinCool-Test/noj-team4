import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { SubmissionStatus } from '@prisma/client';
import AdmZip from 'adm-zip';
import { SandboxRunner } from '../sandbox/sandbox.runner';

interface JudgeJob {
  submissionId: string;
}

interface TestCase {
  input: string;
  expectedOutput: string;
  isSample: boolean;
  name?: string;
  points?: number;
  timeLimitMs?: number;
  memoryLimitKb?: number;
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
    @Inject('SANDBOX_RUNNER') private readonly sandbox: SandboxRunner,
  ) {
    super();
  }

  async process(job: Job<JudgeJob>): Promise<void> {
    const { submissionId } = job.data;
    this.logger.log(`Processing submission ${submissionId}`);

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

      // Download source code from MinIO
      const sourceCode = await this.minio.getObjectAsString(
        'noj-submissions',
        submission.sourceKey,
      );

      // Prepare test cases (from real testdata or fallback to samples)
      const testCases = await this.prepareTestCases(submission.problem);

      if (testCases.length === 0) {
        throw new Error('No test cases available');
      }

      const sandboxJob = await this.sandbox.createJob(submissionId);

      try {
        await this.sandbox.writeSource(sandboxJob, submission.language, sourceCode);

        const compileResult = await this.sandbox.compile(
          sandboxJob,
          submission.language,
        );

        if (compileResult.status === SubmissionStatus.CE) {
          // Compilation error
          await this.prisma.submission.update({
            where: { id: submissionId },
            data: {
              status: SubmissionStatus.CE,
              compileLog: compileResult.log,
              judgedAt: new Date(),
            },
          });
          return;
        }

        // Run test cases
        const caseResults = [];
        let allAC = true;
        let firstError: SubmissionStatus | null = null;

        for (let i = 0; i < testCases.length; i++) {
          const testCase = testCases[i];
          const runResult = await this.sandbox.runCase(
            sandboxJob,
            submission.language,
            testCase.input,
            {
              timeLimitMs: testCase.timeLimitMs || 5000,
              memoryLimitKb: testCase.memoryLimitKb || 262144,
            },
            i,
          );

          const finalCaseStatus =
            runResult.status === SubmissionStatus.RUNNING
              ? this.compareOutput(runResult.stdout || '', testCase.expectedOutput)
              : runResult.status;

          caseResults.push({
            caseNo: i,
            name: testCase.name,
            status: finalCaseStatus,
            timeMs: runResult.timeMs,
            memoryKb: null,
            stdoutTrunc: runResult.stdout?.substring(0, 64 * 1024) || null,
            stderrTrunc: runResult.stderr?.substring(0, 64 * 1024) || null,
            points: testCase.points || null,
            isSample: testCase.isSample,
          });

          if (finalCaseStatus !== SubmissionStatus.AC) {
            allAC = false;
            if (!firstError) {
              firstError = finalCaseStatus;
            }
          }
        }

        // Determine overall status
        const finalStatus = allAC ? SubmissionStatus.AC : (firstError || SubmissionStatus.WA);

        // Save results to database
        await this.prisma.submission.update({
          where: { id: submissionId },
          data: {
            status: finalStatus,
            judgedAt: new Date(),
            compileLog: compileResult.log,
          },
        });

        // Create submission cases
        for (const caseResult of caseResults) {
          await this.prisma.submissionCase.create({
            data: {
              submissionId,
              ...caseResult,
            },
          });
        }

        this.logger.log(
          `Submission ${submissionId} judged: ${finalStatus} (${caseResults.length} cases)`,
        );
      } finally {
        await this.sandbox.cleanupJob(sandboxJob);
      }
    } catch (error) {
      this.logger.error(`Error judging submission ${submissionId}:`, error);

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

  private compareOutput(stdout: string, expectedOutput: string): SubmissionStatus {
    const userOutput = this.normalizeOutput(stdout);
    const expected = this.normalizeOutput(expectedOutput);
    return userOutput === expected ? SubmissionStatus.AC : SubmissionStatus.WA;
  }

  private normalizeOutput(output: string): string {
    return output
      .trim()
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');
  }

  /**
   * Prepare test cases from real testdata or fallback to sample data
   */
  private async prepareTestCases(problem: any): Promise<TestCase[]> {
    // Try to fetch real testdata
    const testdata = await this.fetchTestdata(problem.id);

    if (testdata) {
      // Use real testdata from manifest
      this.logger.log(`Using real testdata for problem ${problem.id} (${testdata.manifest.cases.length} cases)`);
      return testdata.manifest.cases.map((caseInfo) => ({
        input: testdata.zip.getEntry(caseInfo.inputFile)?.getData().toString('utf-8') || '',
        expectedOutput: testdata.zip.getEntry(caseInfo.outputFile)?.getData().toString('utf-8') || '',
        isSample: caseInfo.isSample,
        name: caseInfo.name,
        points: caseInfo.points,
        timeLimitMs: caseInfo.timeLimitMs || testdata.manifest.defaultTimeLimitMs,
        memoryLimitKb: caseInfo.memoryLimitKb || testdata.manifest.defaultMemoryLimitKb,
      }));
    }

    // Fallback to sample data
    this.logger.log(`Falling back to sample data for problem ${problem.id}`);
    const testCases: TestCase[] = [];
    for (let i = 0; i < problem.sampleInputs.length; i++) {
      testCases.push({
        input: problem.sampleInputs[i],
        expectedOutput: problem.sampleOutputs[i],
        isSample: true,
        name: `Sample ${i + 1}`,
      });
    }
    return testCases;
  }

  /**
   * Fetch testdata from cache or download from MinIO
   */
  private async fetchTestdata(problemId: string): Promise<CachedTestdata | null> {
    // Check cache first
    const cached = this.getTestdataFromCache(problemId);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const testdataRecord = await this.prisma.problemTestdata.findFirst({
      where: {
        problemId,
        isActive: true,
      },
    });

    if (!testdataRecord) {
      return null;
    }

    // Download ZIP from MinIO
    const zipBuffer = await this.minio.getObject('noj-testdata', testdataRecord.zipKey);
    const zip = new AdmZip(zipBuffer);

    // Extract manifest
    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) {
      this.logger.error(`Testdata ${testdataRecord.id} missing manifest.json`);
      return null;
    }

    const manifest = JSON.parse(manifestEntry.getData().toString('utf-8')) as TestdataManifest;

    const testdata: CachedTestdata = {
      zip,
      manifest,
      fetchedAt: Date.now(),
    };

    // Cache it
    this.cacheTestdata(problemId, testdata);

    return testdata;
  }

  /**
   * Get testdata from cache with TTL check
   */
  private getTestdataFromCache(problemId: string): CachedTestdata | null {
    const cached = this.testdataCache.get(problemId);
    if (!cached) {
      return null;
    }

    // Check TTL
    if (Date.now() - cached.fetchedAt > TESTDATA_CACHE_TTL) {
      this.testdataCache.delete(problemId);
      return null;
    }

    return cached;
  }

  /**
   * Store testdata in cache with LRU eviction
   */
  private cacheTestdata(problemId: string, testdata: CachedTestdata): void {
    // LRU eviction: remove oldest if cache is full
    if (this.testdataCache.size >= TESTDATA_CACHE_MAX_SIZE) {
      const oldestKey = this.testdataCache.keys().next().value;
      if (oldestKey) {
        this.testdataCache.delete(oldestKey);
      }
    }

    this.testdataCache.set(problemId, testdata);
  }
}
