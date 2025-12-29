import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProgrammingLanguage, SubmissionStatus, SubmissionType } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import { ConfigService } from '@nestjs/config';
import { ProblemService } from '../problem/problem.service';
import { MinioService } from '../minio/minio.service';
import { PrismaService } from '../prisma/prisma.service';
import AdmZip from 'adm-zip';

interface TestCase {
  name: string;
  input: string;
  expectedOutput?: string;
}

interface TestResult {
  name: string;
  status: SubmissionStatus;
  stdout?: string;
  stderr?: string;
  timeMs?: number;
  passed?: boolean;
}

export interface CodeTestResponse {
  compileStatus: SubmissionStatus;
  compileLog?: string;
  results: TestResult[];
}

@Injectable()
export class TestRunnerService {
  private readonly logger = new Logger(TestRunnerService.name);
  private readonly jobRootDir: string;
  private readonly sandboxImage: string;

  constructor(
    private readonly config: ConfigService,
    private readonly problemService: ProblemService,
    private readonly minio: MinioService,
    private readonly prisma: PrismaService,
  ) {
    this.jobRootDir =
      this.config.get<string>('TEST_JOB_ROOT_DIR') || '/tmp/noj-test-jobs';
    this.sandboxImage =
      this.config.get<string>('NOJ_SANDBOX_IMAGE') || 'noj4-sandbox:0.1';
  }

  async testCode(
    userId: number,
    problemDisplayId: string,
    language: ProgrammingLanguage,
    source: string,
    customInput?: string,
    homeworkId?: string,
  ): Promise<CodeTestResponse> {
    // First check access via problemService
    const problemBasic = await this.problemService.getProblemById(
      problemDisplayId,
      userId,
      homeworkId,
    );

    if (!problemBasic.allowedLanguages.includes(language)) {
      throw new BadRequestException('SUBMISSION_LANGUAGE_NOT_ALLOWED');
    }

    // Fetch additional fields needed for testing
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemBasic.id },
      select: {
        id: true,
        submissionType: true,
        templateKey: true,
        makefileKey: true,
        sampleInputs: true,
        sampleOutputs: true,
      },
    });

    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    // Map sampleCases for compatibility
    const sampleCases = (problem.sampleInputs || []).map((input, idx) => ({
      input,
      output: problem.sampleOutputs?.[idx] ?? '',
    }));

    const problemWithSamples = { ...problem, sampleCases };

    // 根據提交類型處理
    switch (problem.submissionType) {
      case SubmissionType.SINGLE_FILE:
        return this.testSingleFile(problemWithSamples, language, source, customInput);

      case SubmissionType.FUNCTION_ONLY:
        return this.testFunctionOnly(problemWithSamples, language, source, customInput);

      case SubmissionType.MULTI_FILE:
        // 單一檔案測試模式下，多檔案題目也允許測試單一檔案
        // 真正的 ZIP 測試會透過 testMultiFile 方法
        return this.testSingleFile(problemWithSamples, language, source, customInput);

      default:
        throw new BadRequestException(`不支援的提交類型: ${problem.submissionType}`);
    }
  }

  /**
   * 測試多檔案提交（ZIP 檔案）
   */
  async testMultiFile(
    userId: number,
    problemDisplayId: string,
    language: ProgrammingLanguage,
    zipFile: Express.Multer.File,
    customInput?: string,
    homeworkId?: string,
  ): Promise<CodeTestResponse> {
    // First check access via problemService
    const problemBasic = await this.problemService.getProblemById(
      problemDisplayId,
      userId,
      homeworkId,
    );

    if (!problemBasic.allowedLanguages.includes(language)) {
      throw new BadRequestException('SUBMISSION_LANGUAGE_NOT_ALLOWED');
    }

    // Fetch additional fields needed for testing
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemBasic.id },
      select: {
        id: true,
        submissionType: true,
        makefileKey: true,
        sampleInputs: true,
        sampleOutputs: true,
      },
    });

    if (!problem) {
      throw new NotFoundException('Problem not found');
    }

    if (problem.submissionType !== SubmissionType.MULTI_FILE) {
      throw new BadRequestException('此題目不支援多檔案提交');
    }

    // Map sampleCases for compatibility
    const sampleCases = (problem.sampleInputs || []).map((input, idx) => ({
      input,
      output: problem.sampleOutputs?.[idx] ?? '',
    }));

    const problemWithSamples = { ...problem, sampleCases };

    // Prepare test cases
    const testCases = this.prepareTestCases(problemWithSamples, customInput);

    // Create job directory
    const jobId = `test-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const jobDir = path.join(this.jobRootDir, jobId);

    try {
      await this.createJobDirectory(jobDir);

      // 解壓縮 ZIP 到 src 目錄
      await this.extractZipToSrc(zipFile.buffer, path.join(jobDir, 'src'));

      // 如果老師提供了 Makefile，下載並覆蓋
      if (problem.makefileKey) {
        const makefileContent = await this.minio.getObjectAsString('noj-makefiles', problem.makefileKey);
        await fs.writeFile(path.join(jobDir, 'src', 'Makefile'), makefileContent);
      }

      // 判斷是否使用 Makefile 編譯
      const useMakefile = await this.hasMakefile(path.join(jobDir, 'src'));

      // Compile
      const compileResult = useMakefile
        ? await this.compileWithMakefile(jobDir, language, jobId)
        : await this.compile(jobDir, language, jobId);

      if (compileResult.status !== SubmissionStatus.RUNNING) {
        return {
          compileStatus: compileResult.status,
          compileLog: compileResult.log,
          results: [],
        };
      }

      // Run test cases
      const results = await this.runAllTestCases(jobDir, language, testCases, jobId);

      return {
        compileStatus: SubmissionStatus.RUNNING,
        compileLog: compileResult.log,
        results,
      };
    } finally {
      await this.cleanup(jobDir);
    }
  }

  /**
   * 測試函式模式（需要合併模板）
   */
  private async testFunctionOnly(
    problem: any,
    language: ProgrammingLanguage,
    source: string,
    customInput?: string,
  ): Promise<CodeTestResponse> {
    if (!problem.templateKey) {
      throw new BadRequestException('函式模式題目缺少模板設定');
    }

    // 下載模板並合併
    const templateCode = await this.minio.getObjectAsString('noj-templates', problem.templateKey);
    const mergedCode = this.mergeTemplate(templateCode, source);

    return this.testSingleFile(problem, language, mergedCode, customInput);
  }

  /**
   * 合併模板與學生程式碼
   */
  private mergeTemplate(templateCode: string, studentCode: string): string {
    // 支援多種標記格式
    const markers = [
      '// STUDENT_CODE_HERE',
      '# STUDENT_CODE_HERE',
      '/* STUDENT_CODE_HERE */',
      '// YOUR CODE HERE',
      '# YOUR CODE HERE',
    ];

    for (const marker of markers) {
      if (templateCode.includes(marker)) {
        return templateCode.replace(marker, studentCode);
      }
    }

    // 如果沒有標記，預設附加在模板後面
    return templateCode + '\n' + studentCode;
  }

  /**
   * 測試單一檔案
   */
  private async testSingleFile(
    problem: any,
    language: ProgrammingLanguage,
    source: string,
    customInput?: string,
  ): Promise<CodeTestResponse> {
    // Prepare test cases
    const testCases = this.prepareTestCases(problem, customInput);

    // Create job directory
    const jobId = `test-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const jobDir = path.join(this.jobRootDir, jobId);

    try {
      await this.createJobDirectory(jobDir);
      await this.writeSourceFile(jobDir, language, source);

      // Compile
      const compileResult = await this.compile(jobDir, language, jobId);
      if (compileResult.status !== SubmissionStatus.RUNNING) {
        return {
          compileStatus: compileResult.status,
          compileLog: compileResult.log,
          results: [],
        };
      }

      // Run test cases
      const results = await this.runAllTestCases(jobDir, language, testCases, jobId);

      return {
        compileStatus: SubmissionStatus.RUNNING,
        compileLog: compileResult.log,
        results,
      };
    } finally {
      await this.cleanup(jobDir);
    }
  }

  /**
   * 準備測試案例
   */
  private prepareTestCases(problem: any, customInput?: string): TestCase[] {
    const normalizedCustomInput =
      customInput !== undefined && customInput.length > 0
        ? customInput
        : undefined;

    if (normalizedCustomInput !== undefined) {
      return [
        {
          name: 'Custom Input',
          input: normalizedCustomInput,
        },
      ];
    }

    return problem.sampleCases.map((sample: any, index: number) => ({
      name: `Sample ${index + 1}`,
      input: sample.input,
      expectedOutput: sample.output,
    }));
  }

  /**
   * 執行所有測試案例
   */
  private async runAllTestCases(
    jobDir: string,
    language: ProgrammingLanguage,
    testCases: TestCase[],
    jobId: string,
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const runResult = await this.runTestCase(
        jobDir,
        language,
        testCase.input,
        i,
        jobId,
      );

      const passed =
        testCase.expectedOutput !== undefined &&
        runResult.status === SubmissionStatus.RUNNING
          ? this.compareOutput(runResult.stdout || '', testCase.expectedOutput)
          : undefined;

      const status =
        runResult.status === SubmissionStatus.RUNNING
          ? passed === false
            ? SubmissionStatus.WA
            : SubmissionStatus.AC
          : runResult.status;

      results.push({
        name: testCase.name,
        status,
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        timeMs: runResult.timeMs,
        passed,
      });
    }

    return results;
  }

  /**
   * 解壓縮 ZIP 檔案到目標目錄
   */
  private async extractZipToSrc(zipBuffer: Buffer, destDir: string): Promise<void> {
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      // 安全性檢查：防止路徑穿越
      const entryName = entry.entryName;
      if (entryName.includes('..') || entryName.startsWith('/')) {
        throw new BadRequestException(`不安全的檔案路徑: ${entryName}`);
      }

      const destPath = path.join(destDir, entryName);
      const destDirPath = path.dirname(destPath);

      await fs.mkdir(destDirPath, { recursive: true });
      await fs.writeFile(destPath, entry.getData());
    }
  }

  /**
   * 檢查目錄是否有 Makefile
   */
  private async hasMakefile(srcDir: string): Promise<boolean> {
    try {
      await fs.access(path.join(srcDir, 'Makefile'));
      return true;
    } catch {
      try {
        await fs.access(path.join(srcDir, 'makefile'));
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * 使用 Makefile 編譯
   */
  private async compileWithMakefile(
    jobDir: string,
    language: ProgrammingLanguage,
    jobId: string,
  ): Promise<{ status: SubmissionStatus; log?: string }> {
    const containerName = `noj-test-compile-${jobId}`;
    const langArg = this.toSandboxLanguage(language);

    try {
      const result = await this.execDockerRun({
        containerName,
        jobDir,
        args: ['compile-make', langArg],
        timeoutMs: 60000, // Allow more time for make
      });

      if (result.exitCode !== 0) {
        return {
          status: SubmissionStatus.CE,
          log: `${result.stdout}\n${result.stderr}`.trim(),
        };
      }

      return {
        status: SubmissionStatus.RUNNING,
        log: `${result.stdout}\n${result.stderr}`.trim(),
      };
    } catch (error) {
      this.logger.error(`Compile with Makefile failed: ${error}`);
      return {
        status: SubmissionStatus.JUDGE_ERROR,
        log: String(error),
      };
    }
  }

  private async createJobDirectory(jobDir: string): Promise<void> {
    await fs.mkdir(jobDir, { recursive: true });
    await fs.chmod(jobDir, 0o777);
    await fs.mkdir(path.join(jobDir, 'src'), { recursive: true });
    await fs.chmod(path.join(jobDir, 'src'), 0o777);
    await fs.mkdir(path.join(jobDir, 'build'), { recursive: true });
    await fs.chmod(path.join(jobDir, 'build'), 0o777);
    await fs.mkdir(path.join(jobDir, 'out'), { recursive: true });
    await fs.chmod(path.join(jobDir, 'out'), 0o777);
  }

  private async writeSourceFile(
    jobDir: string,
    language: ProgrammingLanguage,
    source: string,
  ): Promise<void> {
    const fileName = this.getSourceFileName(language);
    const srcFile = path.join(jobDir, 'src', fileName);
    await fs.writeFile(srcFile, source, { mode: 0o644 });
  }

  private async compile(
    jobDir: string,
    language: ProgrammingLanguage,
    jobId: string,
  ): Promise<{ status: SubmissionStatus; log?: string }> {
    const containerName = `noj-test-compile-${jobId}`;
    const langArg = this.toSandboxLanguage(language);

    try {
      const result = await this.execDockerRun({
        containerName,
        jobDir,
        args: ['compile', langArg],
        timeoutMs: 30000,
      });

      if (result.exitCode !== 0) {
        return {
          status: SubmissionStatus.CE,
          log: `${result.stdout}\n${result.stderr}`.trim(),
        };
      }

      return {
        status: SubmissionStatus.RUNNING,
        log: `${result.stdout}\n${result.stderr}`.trim(),
      };
    } catch (error) {
      this.logger.error(`Compile failed: ${error}`);
      return {
        status: SubmissionStatus.JUDGE_ERROR,
        log: String(error),
      };
    }
  }

  private async runTestCase(
    jobDir: string,
    language: ProgrammingLanguage,
    input: string,
    caseIndex: number,
    jobId: string,
  ): Promise<{
    status: SubmissionStatus;
    stdout?: string;
    stderr?: string;
    timeMs: number;
  }> {
    const containerName = `noj-test-run-${jobId}-${caseIndex}`;
    const langArg = this.toSandboxLanguage(language);
    const startTime = Date.now();

    const stdoutFile = `case-${caseIndex}-stdout.txt`;
    const stderrFile = `case-${caseIndex}-stderr.txt`;

    const args = [
      'run',
      langArg,
      '--time-limit-ms',
      '5000',
      '--memory-limit-kb',
      '262144',
      '--stdout-file',
      `/work/out/${stdoutFile}`,
      '--stderr-file',
      `/work/out/${stderrFile}`,
    ];

    try {
      const result = await this.execDockerRun({
        containerName,
        jobDir,
        args,
        stdin: input,
        timeoutMs: 10000,
        memoryLimitMb: 256,
      });

      const timeMs = Date.now() - startTime;
      const stdout = await this.safeReadFile(
        path.join(jobDir, 'out', stdoutFile),
      );
      const stderr = await this.safeReadFile(
        path.join(jobDir, 'out', stderrFile),
      );

      if (result.exitCode === 0) {
        return { status: SubmissionStatus.RUNNING, stdout, stderr, timeMs };
      }

      return {
        status: this.classifyNonZeroExit(result.exitCode, stderr),
        stdout,
        stderr,
        timeMs,
      };
    } catch (error) {
      const timeMs = Date.now() - startTime;
      this.logger.error(`Run test case failed: ${error}`);
      return {
        status: SubmissionStatus.JUDGE_ERROR,
        stderr: String(error),
        timeMs,
      };
    }
  }

  private async execDockerRun(params: {
    containerName: string;
    jobDir: string;
    args: string[];
    stdin?: string;
    timeoutMs: number;
    memoryLimitMb?: number;
  }): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const dockerArgs = [
      'run',
      ...(params.stdin !== undefined ? ['-i'] : []),
      '--rm',
      '--name',
      params.containerName,
      '--network',
      'none',
      '--read-only',
      '--cap-drop',
      'ALL',
      '--pids-limit',
      '512',
      '-v',
      `${params.jobDir}:/work`,
      '-w',
      '/work',
    ];

    if (params.memoryLimitMb) {
      dockerArgs.push('--memory', `${params.memoryLimitMb}m`);
    }

    dockerArgs.push(this.sandboxImage, ...params.args);

    return new Promise((resolve, reject) => {
      const proc = spawn('docker', dockerArgs, {
        timeout: params.timeoutMs,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      if (params.stdin) {
        proc.stdin?.write(params.stdin);
        proc.stdin?.end();
      }

      proc.on('close', (code) => {
        resolve({ exitCode: code || 0, stdout, stderr });
      });

      proc.on('error', (err) => {
        reject(err);
      });

      // Handle timeout
      setTimeout(() => {
        proc.kill();
      }, params.timeoutMs);
    });
  }

  private async safeReadFile(filePath: string): Promise<string> {
    try {
      const data = await fs.readFile(filePath);
      return data.toString('utf8');
    } catch {
      return '';
    }
  }

  private compareOutput(stdout: string, expectedOutput: string): boolean {
    const normalize = (s: string) =>
      s
        .trim()
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n');

    return normalize(stdout) === normalize(expectedOutput);
  }

  private classifyNonZeroExit(
    exitCode: number,
    stderr: string,
  ): SubmissionStatus {
    const lower = (stderr || '').toLowerCase();

    if (exitCode === 153 || lower.includes('file too large'))
      return SubmissionStatus.OLE;
    if (
      exitCode === 152 ||
      lower.includes('time limit') ||
      lower.includes('timeout')
    )
      return SubmissionStatus.TLE;
    if (
      exitCode === 137 &&
      (lower.includes('time limit') || lower.includes('timeout'))
    )
      return SubmissionStatus.TLE;
    if (
      exitCode === 137 ||
      lower.includes('out of memory') ||
      lower.includes('oom')
    )
      return SubmissionStatus.MLE;

    return SubmissionStatus.RE;
  }

  private async cleanup(jobDir: string): Promise<void> {
    try {
      await fs.rm(jobDir, { recursive: true, force: true });
    } catch (error) {
      this.logger.warn(`Failed to cleanup job directory: ${error}`);
    }
  }

  private getSourceFileName(language: ProgrammingLanguage): string {
    switch (language) {
      case ProgrammingLanguage.C:
        return 'main.c';
      case ProgrammingLanguage.CPP:
        return 'main.cpp';
      case ProgrammingLanguage.JAVA:
        return 'Main.java';
      case ProgrammingLanguage.PYTHON:
        return 'main.py';
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  private toSandboxLanguage(language: ProgrammingLanguage): string {
    switch (language) {
      case ProgrammingLanguage.C:
        return 'C';
      case ProgrammingLanguage.CPP:
        return 'CPP';
      case ProgrammingLanguage.JAVA:
        return 'JAVA';
      case ProgrammingLanguage.PYTHON:
        return 'PYTHON';
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }
}
