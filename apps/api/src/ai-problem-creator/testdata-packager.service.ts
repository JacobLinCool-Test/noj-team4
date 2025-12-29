import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { randomUUID } from 'crypto';
import { PassThrough } from 'stream';

/**
 * Test case data
 */
export interface TestCase {
  input: string;
  output: string;
  isSample?: boolean;
  score?: number;
  timeLimitMs?: number;
  memoryLimitKb?: number;
}

/**
 * Manifest file structure for testdata.zip
 */
interface TestdataManifest {
  version: number;
  createdAt: string;
  cases: Array<{
    name: string;
    isSample: boolean;
    points: number;
    inputFile: string;
    outputFile: string;
    timeLimitMs?: number;
    memoryLimitKb?: number;
  }>;
  totalScore: number;
}

/**
 * Package result
 */
export interface PackageResult {
  key: string;
  bucket: string;
  size: number;
  caseCount: number;
  manifest: TestdataManifest;
}

@Injectable()
export class TestdataPackagerService {
  private readonly logger = new Logger(TestdataPackagerService.name);
  private readonly bucketName = 'noj-testdata';

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  /**
   * Package test cases into a ZIP file and upload to MinIO
   */
  async packageTestdata(
    testCases: TestCase[],
    options?: {
      problemId?: string;
      defaultTimeLimitMs?: number;
      defaultMemoryLimitKb?: number;
    },
  ): Promise<PackageResult> {
    const key = `testdata-${randomUUID()}.zip`;
    const defaultTimeLimit = options?.defaultTimeLimitMs || 1000;
    const defaultMemoryLimit = options?.defaultMemoryLimitKb || 262144;

    // Separate samples and hidden test cases
    const samples = testCases.filter((tc) => tc.isSample === true);
    const hidden = testCases.filter((tc) => tc.isSample !== true);

    // Build manifest
    const manifest: TestdataManifest = {
      version: 1,
      createdAt: new Date().toISOString(),
      cases: [],
      totalScore: 0,
    };

    // Create archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    const passThrough = new PassThrough();

    // Pipe archive to passThrough stream
    archive.pipe(passThrough);

    // Add sample cases (naming: 0000.in, 0000.out, 0001.in, 0001.out, ...)
    let caseIndex = 0;
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const caseName = this.formatCaseName(caseIndex);
      const inputFile = `${caseName}.in`;
      const outputFile = `${caseName}.out`;

      archive.append(this.normalizeLineEndings(sample.input), {
        name: inputFile,
      });
      archive.append(this.normalizeLineEndings(sample.output), {
        name: outputFile,
      });

      manifest.cases.push({
        name: caseName,
        isSample: true,
        points: 0, // Samples don't contribute to score
        inputFile,
        outputFile,
        timeLimitMs: sample.timeLimitMs || defaultTimeLimit,
        memoryLimitKb: sample.memoryLimitKb || defaultMemoryLimit,
      });

      caseIndex++;
    }

    // Add hidden test cases (naming continues from samples, e.g., 0100.in for first hidden)
    // Start hidden cases at index 100 for clear separation
    caseIndex = 100;
    const scorePerCase = hidden.length > 0 ? Math.floor(100 / hidden.length) : 0;
    let remainingScore = 100;

    for (let i = 0; i < hidden.length; i++) {
      const testCase = hidden[i];
      const caseName = this.formatCaseName(caseIndex);
      const inputFile = `${caseName}.in`;
      const outputFile = `${caseName}.out`;

      // Last case gets any remaining score
      const points =
        i === hidden.length - 1
          ? remainingScore
          : testCase.score ?? scorePerCase;
      remainingScore -= points;

      archive.append(this.normalizeLineEndings(testCase.input), {
        name: inputFile,
      });
      archive.append(this.normalizeLineEndings(testCase.output), {
        name: outputFile,
      });

      manifest.cases.push({
        name: caseName,
        isSample: false,
        points,
        inputFile,
        outputFile,
        timeLimitMs: testCase.timeLimitMs || defaultTimeLimit,
        memoryLimitKb: testCase.memoryLimitKb || defaultMemoryLimit,
      });

      manifest.totalScore += points;
      caseIndex++;
    }

    // Add manifest.json
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    // Finalize archive
    await archive.finalize();

    // Upload to MinIO
    const chunks: Buffer[] = [];
    for await (const chunk of passThrough) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);

    await this.minio.putObject(this.bucketName, key, buffer, {
      'Content-Type': 'application/zip',
    });

    this.logger.log(
      `Packaged ${testCases.length} test cases to ${key} (${buffer.length} bytes)`,
    );

    return {
      key,
      bucket: this.bucketName,
      size: buffer.length,
      caseCount: testCases.length,
      manifest,
    };
  }

  /**
   * Create or update ProblemTestdata record
   */
  async createTestdataRecord(
    problemId: string,
    packageResult: PackageResult,
    createdById: number,
  ): Promise<{ id: string }> {
    // Get the next version number
    const latestTestdata = await this.prisma.problemTestdata.findFirst({
      where: { problemId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latestTestdata?.version ?? 0) + 1;

    // Set all existing testdata for this problem as inactive
    await this.prisma.problemTestdata.updateMany({
      where: { problemId, isActive: true },
      data: { isActive: false },
    });

    // Create new testdata record
    const testdata = await this.prisma.problemTestdata.create({
      data: {
        problemId,
        version: nextVersion,
        zipKey: packageResult.key,
        manifest: packageResult.manifest as any,
        isActive: true,
        uploadedById: createdById,
      },
    });

    return { id: testdata.id };
  }

  /**
   * Read manifest from a testdata ZIP in MinIO
   */
  async readManifestFromZip(testdataKey: string): Promise<TestdataManifest | null> {
    try {
      const zipBuffer = await this.minio.getObject(this.bucketName, testdataKey);
      const zip = new AdmZip(zipBuffer);
      const manifestEntry = zip.getEntry('manifest.json');

      if (!manifestEntry) {
        this.logger.warn(`No manifest.json found in testdata ZIP: ${testdataKey}`);
        return null;
      }

      const manifestContent = manifestEntry.getData().toString('utf-8');
      const manifest = JSON.parse(manifestContent) as TestdataManifest;
      return manifest;
    } catch (error) {
      this.logger.error(`Failed to read manifest from ZIP: ${testdataKey}`, error);
      return null;
    }
  }

  /**
   * Format case name with zero-padding
   */
  private formatCaseName(index: number): string {
    return index.toString().padStart(4, '0');
  }

  /**
   * Normalize line endings to Unix style
   */
  private normalizeLineEndings(text: string): string {
    // Convert all line endings to \n
    let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Ensure file ends with newline
    if (!normalized.endsWith('\n')) {
      normalized += '\n';
    }
    return normalized;
  }

  /**
   * Generate test data from AI suggestions and solution code
   */
  async generateFromSolution(params: {
    testInputs: string[];
    sampleCases: Array<{ input: string; output: string }>;
    solutionCode: string;
    solutionLanguage: string;
    timeLimitMs: number;
    memoryLimitKb: number;
    executor: {
      executeBatch: (
        code: string,
        inputs: string[],
        options: any,
      ) => Promise<
        Array<{
          success: boolean;
          output: string;
          status: string;
          errorMessage?: string;
        }>
      >;
    };
  }): Promise<{
    testCases: TestCase[];
    errors: Array<{ index: number; error: string }>;
  }> {
    const { testInputs, sampleCases, solutionCode, solutionLanguage, executor } =
      params;

    const testCases: TestCase[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    // Add sample cases first
    for (const sample of sampleCases) {
      testCases.push({
        input: sample.input,
        output: sample.output,
        isSample: true,
      });
    }

    // Execute solution for each test input
    const results = await executor.executeBatch(solutionCode, testInputs, {
      language: solutionLanguage,
      timeLimitMs: params.timeLimitMs,
      memoryLimitKb: params.memoryLimitKb,
    });

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.success) {
        // Treat empty output as an error - the solution should always produce output
        if (!result.output || result.output.trim() === '') {
          errors.push({
            index: i,
            error: 'EMPTY_OUTPUT',
          });
        } else {
          testCases.push({
            input: testInputs[i],
            output: result.output,
            isSample: false,
          });
        }
      } else {
        errors.push({
          index: i,
          error: result.errorMessage || result.status,
        });
      }
    }

    return { testCases, errors };
  }
}
