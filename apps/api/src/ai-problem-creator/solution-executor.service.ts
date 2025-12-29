import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProgrammingLanguage } from '@prisma/client';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

/**
 * Solution execution result
 */
export interface SolutionExecutionResult {
  success: boolean;
  output: string;
  stderr?: string;
  exitCode: number;
  timeMs: number;
  status: 'SUCCESS' | 'COMPILE_ERROR' | 'RUNTIME_ERROR' | 'TIMEOUT' | 'MEMORY_LIMIT';
  errorMessage?: string;
}

/**
 * Execution options
 */
export interface ExecutionOptions {
  timeLimitMs?: number;
  memoryLimitKb?: number;
  language: ProgrammingLanguage;
}

/**
 * Language configuration
 */
interface LanguageConfig {
  sourceFile: string;
  compileCommand?: (srcPath: string, buildPath: string) => string;
  runCommand: (buildPath: string) => string;
  needsCompile: boolean;
}

const LANGUAGE_CONFIGS: Record<ProgrammingLanguage, LanguageConfig> = {
  C: {
    sourceFile: 'main.c',
    compileCommand: (src, build) =>
      `gcc -O2 -std=c11 -o ${build}/main ${src}/main.c -lm`,
    runCommand: (build) => `${build}/main`,
    needsCompile: true,
  },
  CPP: {
    sourceFile: 'main.cpp',
    compileCommand: (src, build) =>
      `g++ -O2 -std=c++17 -o ${build}/main ${src}/main.cpp`,
    runCommand: (build) => `${build}/main`,
    needsCompile: true,
  },
  JAVA: {
    sourceFile: 'Main.java',
    compileCommand: (src, build) => `javac -d ${build} ${src}/Main.java`,
    runCommand: (build) => `java -cp ${build} Main`,
    needsCompile: true,
  },
  PYTHON: {
    sourceFile: 'main.py',
    runCommand: (build) => `python3 ${build}/../src/main.py`,
    needsCompile: false,
  },
};

@Injectable()
export class SolutionExecutorService implements OnModuleInit {
  private readonly logger = new Logger(SolutionExecutorService.name);
  private readonly sandboxImage: string;
  private readonly jobRootDir: string;
  private readonly defaultTimeLimitMs = 10000; // 10 seconds for AI solutions
  private readonly defaultMemoryLimitKb = 524288; // 512 MB
  private readonly dockerOverheadMs = 3000;
  private dockerAvailable = false;

  constructor(private readonly configService: ConfigService) {
    this.sandboxImage = this.configService.get<string>(
      'NOJ_SANDBOX_IMAGE',
      'noj4-sandbox:0.1',
    );
    this.jobRootDir = this.configService.get<string>(
      'NOJ_JUDGE_JOB_ROOT_DIR',
      path.join(os.tmpdir(), 'noj-ai-executor'),
    );
  }

  async onModuleInit(): Promise<void> {
    // Check if Docker is available
    try {
      await execAsync('docker info', { timeout: 5000 });
      this.dockerAvailable = true;
      this.logger.log('Docker is available for solution execution');
    } catch {
      this.dockerAvailable = false;
      this.logger.warn(
        'Docker is not available. Solution execution will be simulated.',
      );
    }

    // Ensure job root directory exists
    await fs.mkdir(this.jobRootDir, { recursive: true });
  }

  /**
   * Execute solution code with given input
   */
  async execute(
    code: string,
    input: string,
    options: ExecutionOptions,
  ): Promise<SolutionExecutionResult> {
    this.logger.log(`[Execute] Language: ${options.language}, Input length: ${input.length}, Code length: ${code.length}`);
    this.logger.debug(`[Execute] Code preview: ${code.substring(0, 200)}...`);
    this.logger.debug(`[Execute] Input preview: ${input.substring(0, 100)}...`);

    if (!this.dockerAvailable) {
      this.logger.warn('[Execute] Docker not available, using simulation');
      return this.simulateExecution(code, input, options);
    }

    const jobId = randomUUID();
    const jobDir = path.join(this.jobRootDir, jobId);

    try {
      // Create job directory structure
      await this.createJobDirectory(jobDir);

      // Write source code
      const langConfig = LANGUAGE_CONFIGS[options.language];
      const srcPath = path.join(jobDir, 'src', langConfig.sourceFile);
      await fs.writeFile(srcPath, code, 'utf-8');

      // Compile if needed
      if (langConfig.needsCompile) {
        const compileResult = await this.compile(jobDir, options.language);
        if (!compileResult.success) {
          return compileResult;
        }
      }

      // Execute with input
      return await this.run(jobDir, input, options);
    } finally {
      // Cleanup job directory
      await this.cleanup(jobDir);
    }
  }

  /**
   * Execute solution code with multiple inputs (batch)
   */
  async executeBatch(
    code: string,
    inputs: string[],
    options: ExecutionOptions,
  ): Promise<SolutionExecutionResult[]> {
    this.logger.log(`[ExecuteBatch] Language: ${options.language}, Inputs count: ${inputs.length}, Code length: ${code.length}`);
    this.logger.log(`[ExecuteBatch] Docker available: ${this.dockerAvailable}`);

    if (!this.dockerAvailable) {
      this.logger.warn('[ExecuteBatch] Docker not available, using simulation for all inputs');
      return Promise.all(
        inputs.map((input) => this.simulateExecution(code, input, options)),
      );
    }

    const jobId = randomUUID();
    const jobDir = path.join(this.jobRootDir, jobId);
    const results: SolutionExecutionResult[] = [];

    try {
      // Create job directory structure
      await this.createJobDirectory(jobDir);

      // Write source code
      const langConfig = LANGUAGE_CONFIGS[options.language];
      const srcPath = path.join(jobDir, 'src', langConfig.sourceFile);
      await fs.writeFile(srcPath, code, 'utf-8');

      // Compile if needed (once for all inputs)
      if (langConfig.needsCompile) {
        this.logger.log(`[ExecuteBatch] Compiling ${options.language} code...`);
        const compileResult = await this.compile(jobDir, options.language);
        if (!compileResult.success) {
          this.logger.error(`[ExecuteBatch] Compilation failed: ${compileResult.errorMessage}`);
          // Return compile error for all inputs
          return inputs.map(() => compileResult);
        }
        this.logger.log(`[ExecuteBatch] Compilation successful`);
      }

      // Execute each input
      this.logger.log(`[ExecuteBatch] Running ${inputs.length} test cases...`);
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        this.logger.log(`[ExecuteBatch] Running test case ${i + 1}/${inputs.length}`);
        const result = await this.run(jobDir, input, options);
        results.push(result);

        if (!result.success || !result.output) {
          this.logger.warn(`[ExecuteBatch] Test case ${i + 1} issue - success: ${result.success}, output empty: ${!result.output}`);
        }
      }

      this.logger.log(`[ExecuteBatch] Completed all ${inputs.length} test cases`);
      const successCount = results.filter(r => r.success && r.output).length;
      const emptyCount = results.filter(r => r.success && !r.output).length;
      const failCount = results.filter(r => !r.success).length;
      this.logger.log(`[ExecuteBatch] Results: ${successCount} success, ${emptyCount} empty output, ${failCount} failed`);

      return results;
    } finally {
      // Cleanup job directory
      await this.cleanup(jobDir);
    }
  }

  /**
   * Create job directory structure with proper permissions
   * The sandbox runs as a non-root user, so directories need 0o777 permissions
   */
  private async createJobDirectory(jobDir: string): Promise<void> {
    await fs.mkdir(jobDir, { recursive: true });
    await fs.chmod(jobDir, 0o777);
    await fs.mkdir(path.join(jobDir, 'src'), { recursive: true });
    await fs.chmod(path.join(jobDir, 'src'), 0o777);
    await fs.mkdir(path.join(jobDir, 'build'), { recursive: true });
    await fs.chmod(path.join(jobDir, 'build'), 0o777);
    await fs.mkdir(path.join(jobDir, 'out'), { recursive: true });
    await fs.chmod(path.join(jobDir, 'out'), 0o777);
    await fs.mkdir(path.join(jobDir, 'testdata'), { recursive: true });
    await fs.chmod(path.join(jobDir, 'testdata'), 0o777);
  }

  /**
   * Compile source code
   */
  private async compile(
    jobDir: string,
    language: ProgrammingLanguage,
  ): Promise<SolutionExecutionResult> {
    const startTime = Date.now();
    const containerName = `noj-ai-compile-${randomUUID().slice(0, 8)}`;

    const dockerArgs = [
      'run',
      '--rm',
      '--name',
      containerName,
      '--network',
      'none',
      '--read-only',
      '--tmpfs',
      '/tmp:rw,noexec,nosuid,size=128m',
      '--cap-drop',
      'ALL',
      '--pids-limit',
      '64',
      '--cpus',
      '1',
      '--memory',
      '512m',
      '--memory-swap',
      '512m',
      '-v',
      `${jobDir}/src:/work/src:ro`,
      '-v',
      `${jobDir}/build:/work/build:rw`,
      '-v',
      `${jobDir}/out:/work/out:rw`,
      this.sandboxImage,
      'compile',
      language,
    ];

    try {
      const result = await this.runDocker(dockerArgs, {
        timeout: 30000,
        input: '',
      });

      if (result.exitCode !== 0) {
        return {
          success: false,
          output: '',
          stderr: result.stderr,
          exitCode: result.exitCode,
          timeMs: Date.now() - startTime,
          status: 'COMPILE_ERROR',
          errorMessage: result.stderr || 'Compilation failed',
        };
      }

      return {
        success: true,
        output: '',
        exitCode: 0,
        timeMs: Date.now() - startTime,
        status: 'SUCCESS',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Compile error';
      return {
        success: false,
        output: '',
        stderr: message,
        exitCode: 1,
        timeMs: Date.now() - startTime,
        status: 'COMPILE_ERROR',
        errorMessage: message,
      };
    }
  }

  /**
   * Run compiled code with input
   */
  private async run(
    jobDir: string,
    input: string,
    options: ExecutionOptions,
  ): Promise<SolutionExecutionResult> {
    const startTime = Date.now();
    const containerName = `noj-ai-run-${randomUUID().slice(0, 8)}`;
    const timeLimitMs = options.timeLimitMs || this.defaultTimeLimitMs;
    const memoryLimitKb = options.memoryLimitKb || this.defaultMemoryLimitKb;
    const memoryMb = Math.ceil(memoryLimitKb / 1024);

    // Sandbox writes output to files, not stdout
    const stdoutFile = path.join(jobDir, 'out', 'stdout.txt');
    const stderrFile = path.join(jobDir, 'out', 'stderr.txt');

    const dockerArgs = [
      'run',
      '--rm',
      '-i',
      '--name',
      containerName,
      '--network',
      'none',
      '--read-only',
      '--tmpfs',
      '/tmp:rw,noexec,nosuid,size=128m',
      '--cap-drop',
      'ALL',
      '--pids-limit',
      '32',
      '--cpus',
      '1',
      '--memory',
      `${memoryMb}m`,
      '--memory-swap',
      `${memoryMb}m`,
      '-v',
      `${jobDir}/src:/work/src:ro`,
      '-v',
      `${jobDir}/build:/work/build:ro`,
      '-v',
      `${jobDir}/out:/work/out:rw`,
      this.sandboxImage,
      'run',
      options.language,
      '--time-limit-ms',
      String(timeLimitMs),
      '--memory-limit-kb',
      String(memoryLimitKb),
    ];

    try {
      const timeout = timeLimitMs + this.dockerOverheadMs;
      const result = await this.runDocker(dockerArgs, { timeout, input });

      // Read output from files (sandbox writes to /work/out/stdout.txt and stderr.txt)
      let fileStdout = '';
      let fileStderr = '';
      try {
        fileStdout = await fs.readFile(stdoutFile, 'utf-8');
      } catch {
        // File may not exist if program crashed before writing
      }
      try {
        fileStderr = await fs.readFile(stderrFile, 'utf-8');
      } catch {
        // File may not exist
      }

      this.logger.log(`[Run] Docker result - exitCode: ${result.exitCode}, file stdout length: ${fileStdout.length}, file stderr length: ${fileStderr.length}`);
      this.logger.debug(`[Run] stdout: "${fileStdout.substring(0, 500)}"`);
      if (fileStderr) {
        this.logger.debug(`[Run] stderr: "${fileStderr.substring(0, 500)}"`);
      }

      if (result.exitCode === 0) {
        const trimmedOutput = fileStdout.trim();
        if (!trimmedOutput) {
          this.logger.warn(`[Run] WARNING: Execution succeeded but output is empty! Input was: "${input.substring(0, 100)}..."`);
        }
        return {
          success: true,
          output: trimmedOutput,
          stderr: fileStderr,
          exitCode: 0,
          timeMs: Date.now() - startTime,
          status: 'SUCCESS',
        };
      }

      // Classify error based on exit code and stderr
      const status = this.classifyError(result.exitCode, fileStderr || result.stderr);
      this.logger.warn(`[Run] Execution failed - status: ${status}, exitCode: ${result.exitCode}`);
      return {
        success: false,
        output: fileStdout,
        stderr: fileStderr || result.stderr,
        exitCode: result.exitCode,
        timeMs: Date.now() - startTime,
        status,
        errorMessage: fileStderr || result.stderr || `Exit code: ${result.exitCode}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Runtime error';
      const isTimeout = message.includes('timeout') || message.includes('TIMEOUT');
      return {
        success: false,
        output: '',
        stderr: message,
        exitCode: isTimeout ? 152 : 1,
        timeMs: Date.now() - startTime,
        status: isTimeout ? 'TIMEOUT' : 'RUNTIME_ERROR',
        errorMessage: message,
      };
    }
  }

  /**
   * Run Docker command
   */
  private runDocker(
    args: string[],
    options: { timeout: number; input: string },
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const child = spawn('docker', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

      const timeoutId = setTimeout(() => {
        killed = true;
        child.kill('SIGKILL');
      }, options.timeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        // Limit output size
        if (stdout.length > 1024 * 256) {
          stdout = stdout.slice(0, 1024 * 256);
        }
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > 1024 * 64) {
          stderr = stderr.slice(0, 1024 * 64);
        }
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          stdout,
          stderr,
          exitCode: killed ? 152 : (code ?? 1),
        });
      });

      child.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          stdout,
          stderr: err.message,
          exitCode: 1,
        });
      });

      // Send input
      if (options.input) {
        child.stdin.write(options.input);
      }
      child.stdin.end();
    });
  }

  /**
   * Classify error based on exit code and stderr
   */
  private classifyError(
    exitCode: number,
    stderr: string,
  ): 'RUNTIME_ERROR' | 'TIMEOUT' | 'MEMORY_LIMIT' {
    const stderrLower = stderr.toLowerCase();

    if (exitCode === 152 || stderrLower.includes('time limit')) {
      return 'TIMEOUT';
    }
    if (
      exitCode === 137 ||
      stderrLower.includes('out of memory') ||
      stderrLower.includes('memory limit')
    ) {
      return 'MEMORY_LIMIT';
    }
    return 'RUNTIME_ERROR';
  }

  /**
   * Cleanup job directory
   */
  private async cleanup(jobDir: string): Promise<void> {
    try {
      await fs.rm(jobDir, { recursive: true, force: true });
    } catch {
      this.logger.warn(`Failed to cleanup job directory: ${jobDir}`);
    }
  }

  /**
   * Simulate execution when Docker is not available (for development/testing)
   */
  private async simulateExecution(
    code: string,
    input: string,
    options: ExecutionOptions,
  ): Promise<SolutionExecutionResult> {
    this.logger.warn('[SimulateExecution] Docker sandbox not available - returning error');
    this.logger.warn('[SimulateExecution] To enable real execution, ensure Docker is running and noj4-sandbox image is available');

    // Don't simulate success - return an error so we don't create invalid test data
    return {
      success: false,
      output: '',
      stderr: 'Docker sandbox not available. Please ensure Docker is running and the noj4-sandbox image is installed.',
      exitCode: 1,
      timeMs: 0,
      status: 'RUNTIME_ERROR',
      errorMessage: 'DOCKER_NOT_AVAILABLE',
    };
  }

  /**
   * Check if Docker sandbox is available
   */
  isAvailable(): boolean {
    return this.dockerAvailable;
  }
}
