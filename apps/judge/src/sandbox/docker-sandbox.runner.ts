import { Injectable, Logger } from '@nestjs/common';
import { ProgrammingLanguage, SubmissionStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import {
  SandboxCompileResult,
  SandboxJobContext,
  SandboxLimits,
  SandboxNetworkConfig,
  SandboxRunResult,
  toSandboxLanguage,
} from './sandbox.types';
import { SandboxRunner, CompileOptions } from './sandbox.runner';
import { SandboxConfig } from './sandbox.config';

type ExecResult = { exitCode: number; stdout: string; stderr: string };

function sanitizeIdForPath(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function dockerMemoryFromKb(memoryLimitKb: number): string {
  const mib = Math.max(4, Math.ceil(memoryLimitKb / 1024));
  return `${mib}m`;
}

function truncateUtf8(text: string, maxBytes: number): string {
  const buf = Buffer.from(text, 'utf8');
  if (buf.length <= maxBytes) return text;
  return buf.subarray(0, maxBytes).toString('utf8');
}

@Injectable()
export class DockerSandboxRunner implements SandboxRunner {
  private readonly logger = new Logger(DockerSandboxRunner.name);

  constructor(private readonly config: SandboxConfig) {}

  async createJob(submissionId: string): Promise<SandboxJobContext> {
    const safeId = sanitizeIdForPath(submissionId);
    const jobDir = path.join(this.config.jobRootDir, safeId);

    // Use 0o777 permissions to allow Docker container (running as root) to write
    // Note: mkdir mode is affected by umask, so we chmod explicitly after creation
    await fs.mkdir(jobDir, { recursive: true });
    await fs.chmod(jobDir, 0o777);
    await fs.mkdir(path.join(jobDir, 'src'), { recursive: true });
    await fs.chmod(path.join(jobDir, 'src'), 0o777);
    await fs.mkdir(path.join(jobDir, 'build'), { recursive: true });
    await fs.chmod(path.join(jobDir, 'build'), 0o777);
    await fs.mkdir(path.join(jobDir, 'testdata'), { recursive: true });
    await fs.chmod(path.join(jobDir, 'testdata'), 0o777);
    await fs.mkdir(path.join(jobDir, 'out'), { recursive: true });
    await fs.chmod(path.join(jobDir, 'out'), 0o777);

    return { submissionId, jobDir };
  }

  async writeSource(
    job: SandboxJobContext,
    language: ProgrammingLanguage,
    sourceCode: string,
  ): Promise<void> {
    const sandboxLang = toSandboxLanguage(language);
    const srcFile = path.join(job.jobDir, 'src', this.getSourceFileName(sandboxLang));
    await fs.writeFile(srcFile, sourceCode, { mode: 0o644 });
  }

  async compile(job: SandboxJobContext, language: ProgrammingLanguage, options?: CompileOptions): Promise<SandboxCompileResult> {
    const sandboxLang = toSandboxLanguage(language);
    const containerName = this.makeContainerName('compile', job.submissionId);

    // 構建編譯命令參數
    const dockerArgsAfterImage = ['compile', sandboxLang];
    if (options?.compilerFlags) {
      dockerArgsAfterImage.push('--flags', options.compilerFlags);
    }

    const result = await this.execDockerRun({
      containerName,
      jobDir: job.jobDir,
      dockerArgsAfterImage,
      timeoutMs: 30_000 + this.config.dockerRunOverheadMs,
      maxOutputBytes: 256 * 1024,
      mountMode: 'compile', // build 目錄需要可寫
    });

    if (result.exitCode !== 0) {
      const combined = truncateUtf8(`${result.stdout}\n${result.stderr}`.trim(), 256 * 1024);
      return { status: SubmissionStatus.CE, log: combined };
    }

    const combined = truncateUtf8(`${result.stdout}\n${result.stderr}`.trim(), 256 * 1024);
    return { status: SubmissionStatus.RUNNING, log: combined };
  }

  async compileWithMakefile(job: SandboxJobContext, language: ProgrammingLanguage, options?: CompileOptions): Promise<SandboxCompileResult> {
    const sandboxLang = toSandboxLanguage(language);
    const containerName = this.makeContainerName('compile', job.submissionId);

    // 構建編譯命令參數
    const dockerArgsAfterImage = ['compile-make', sandboxLang];
    if (options?.compilerFlags) {
      dockerArgsAfterImage.push('--flags', options.compilerFlags);
    }

    const result = await this.execDockerRun({
      containerName,
      jobDir: job.jobDir,
      dockerArgsAfterImage,
      timeoutMs: 60_000 + this.config.dockerRunOverheadMs, // Allow more time for make
      maxOutputBytes: 256 * 1024,
      mountMode: 'compile', // build 目錄需要可寫
    });

    if (result.exitCode !== 0) {
      const combined = truncateUtf8(`${result.stdout}\n${result.stderr}`.trim(), 256 * 1024);
      return { status: SubmissionStatus.CE, log: combined };
    }

    const combined = truncateUtf8(`${result.stdout}\n${result.stderr}`.trim(), 256 * 1024);
    return { status: SubmissionStatus.RUNNING, log: combined };
  }

  async lint(job: SandboxJobContext, language: ProgrammingLanguage): Promise<{ output: string }> {
    const sandboxLang = toSandboxLanguage(language);
    const containerName = this.makeContainerName('lint', job.submissionId);
    const lintOutputFile = path.join(job.jobDir, 'out', 'lint.json');

    await this.execDockerRun({
      containerName,
      jobDir: job.jobDir,
      dockerArgsAfterImage: ['lint', sandboxLang],
      timeoutMs: 30_000 + this.config.dockerRunOverheadMs,
      maxOutputBytes: 256 * 1024,
    });

    const output = await this.safeReadText(lintOutputFile, 256 * 1024);
    return { output };
  }

  async runScript(job: SandboxJobContext, scriptCode: string, inputJson: string): Promise<{ output: string; stderr: string; exitCode: number }> {
    const containerName = this.makeContainerName('script', job.submissionId);

    // Write script and input files
    const scriptFile = path.join(job.jobDir, 'src', 'script.py');
    const inputFile = path.join(job.jobDir, 'src', 'input.json');
    const outputFile = path.join(job.jobDir, 'out', 'output.json');
    const stderrFile = path.join(job.jobDir, 'out', 'script-stderr.txt');

    await fs.writeFile(scriptFile, scriptCode, { mode: 0o644 });
    await fs.writeFile(inputFile, inputJson, { mode: 0o644 });

    this.logger.debug(`[runScript] jobDir: ${job.jobDir}`);
    this.logger.debug(`[runScript] containerName: ${containerName}`);

    const result = await this.execDockerRun({
      containerName,
      jobDir: job.jobDir,
      dockerArgsAfterImage: ['script', 'PYTHON'],
      timeoutMs: 30_000 + this.config.dockerRunOverheadMs,
      maxOutputBytes: 256 * 1024,
    });

    this.logger.debug(`[runScript] docker exitCode: ${result.exitCode}`);
    this.logger.debug(`[runScript] docker stdout: ${result.stdout.substring(0, 500)}`);
    this.logger.debug(`[runScript] docker stderr: ${result.stderr.substring(0, 500)}`);

    const output = await this.safeReadText(outputFile, 256 * 1024);
    const stderr = await this.safeReadText(stderrFile, 64 * 1024);

    this.logger.debug(`[runScript] output file content: "${output.substring(0, 500)}"`);
    this.logger.debug(`[runScript] stderr file content: "${stderr.substring(0, 500)}"`);

    return { output, stderr, exitCode: result.exitCode };
  }

  async runCase(
    job: SandboxJobContext,
    language: ProgrammingLanguage,
    input: string,
    limits: SandboxLimits,
    caseIndex: number,
  ): Promise<SandboxRunResult> {
    const sandboxLang = toSandboxLanguage(language);
    const startTime = Date.now();

    const stdoutFile = path.join(job.jobDir, 'out', `case-${caseIndex}-stdout.txt`);
    const stderrFile = path.join(job.jobDir, 'out', `case-${caseIndex}-stderr.txt`);

    const containerName = this.makeContainerName('run', job.submissionId);
    const timeoutMs = limits.timeLimitMs + this.config.dockerRunOverheadMs + 2000;

    const dockerArgsAfterImage = [
      'run',
      sandboxLang,
      '--time-limit-ms',
      String(limits.timeLimitMs),
      '--memory-limit-kb',
      String(limits.memoryLimitKb),
      '--stdout-file',
      '/work/out/' + path.basename(stdoutFile),
      '--stderr-file',
      '/work/out/' + path.basename(stderrFile),
    ];

    // Determine network mode based on networkConfig
    const networkMode = this.getNetworkMode(limits.networkConfig);

    try {
      const result = await this.execDockerRun({
        containerName,
        jobDir: job.jobDir,
        dockerArgsAfterImage,
        dockerMemoryLimit: dockerMemoryFromKb(limits.memoryLimitKb),
        timeoutMs,
        maxOutputBytes: 16 * 1024, // noj-sandbox writes program output to files; docker logs should be tiny.
        stdin: input,
        networkMode,
        networkConfig: limits.networkConfig,
      });

      const timeMs = Date.now() - startTime;
      const stdout = await this.safeReadText(stdoutFile, this.config.outputLimitBytes);
      const stderr = await this.safeReadText(stderrFile, this.config.outputLimitBytes);

      if (result.exitCode === 0) {
        return { status: SubmissionStatus.RUNNING, timeMs, stdout, stderr };
      }

      return {
        status: this.classifyNonZeroExit(result.exitCode, stderr),
        timeMs,
        stdout,
        stderr,
      };
    } catch (error) {
      const timeMs = Date.now() - startTime;
      this.logger.warn(`docker sandbox failed (case ${caseIndex}): ${String((error as Error).message || error)}`);
      return { status: SubmissionStatus.JUDGE_ERROR, timeMs, stderr: String((error as Error).message || error) };
    }
  }

  /**
   * Determine Docker network mode based on network config
   */
  private getNetworkMode(networkConfig?: SandboxNetworkConfig): string {
    if (!networkConfig || !networkConfig.enabled) {
      return 'none';
    }

    // Firewall mode: use a custom bridge network with iptables rules
    if (networkConfig.mode === 'firewall') {
      return 'noj-sandbox-net';
    }

    // Sidecar mode would use a different approach (not implemented yet)
    return 'none';
  }

  async cleanupJob(job: SandboxJobContext): Promise<void> {
    await fs.rm(job.jobDir, { recursive: true, force: true });
  }

  private classifyNonZeroExit(exitCode: number, stderr: string): SubmissionStatus {
    const lower = (stderr || '').toLowerCase();

    if (exitCode === 153 || lower.includes('file too large')) return SubmissionStatus.OLE;
    if (exitCode === 152 || lower.includes('time limit') || lower.includes('timeout')) return SubmissionStatus.TLE;
    if (exitCode === 137 && (lower.includes('time limit') || lower.includes('timeout'))) return SubmissionStatus.TLE;
    if (exitCode === 137 || lower.includes('out of memory') || lower.includes('oom')) return SubmissionStatus.MLE;

    return SubmissionStatus.RE;
  }

  private async safeReadText(filePath: string, maxBytes: number): Promise<string> {
    try {
      const data = await fs.readFile(filePath);
      if (data.length <= maxBytes) return data.toString('utf8');
      return data.subarray(0, maxBytes).toString('utf8');
    } catch {
      return '';
    }
  }

  private getSourceFileName(language: ReturnType<typeof toSandboxLanguage>): string {
    switch (language) {
      case 'C':
        return 'main.c';
      case 'CPP':
        return 'main.cpp';
      case 'JAVA':
        return 'Main.java';
      case 'PYTHON':
        return 'main.py';
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  private makeContainerName(kind: 'compile' | 'run' | 'lint' | 'script', submissionId: string): string {
    const safe = sanitizeIdForPath(submissionId).slice(0, 32);
    const rand = crypto.randomBytes(6).toString('hex');
    return `noj4-${kind}-${safe}-${rand}`.slice(0, 63);
  }

  private execDockerRun(params: {
    containerName: string;
    jobDir: string;
    dockerArgsAfterImage: string[];
    dockerMemoryLimit?: string;
    timeoutMs: number;
    maxOutputBytes: number;
    stdin?: string;
    networkMode?: string;
    networkConfig?: SandboxNetworkConfig;
    /** 掛載模式：compile 時 build 可寫，run 時 build 唯讀 */
    mountMode?: 'compile' | 'run';
  }): Promise<ExecResult> {
    const dockerMemoryLimit = params.dockerMemoryLimit || this.config.dockerMemoryLimit;
    const networkMode = params.networkMode || 'none';
    const mountMode = params.mountMode || 'run';

    const dockerArgs = [
      'run',
      '--rm',
      '--name',
      params.containerName,
      '--network',
      networkMode,
      '--read-only',
      '--tmpfs',
      `/tmp:rw,noexec,nosuid,size=${this.config.dockerTmpfsSize}`,
      '--cap-drop',
      'ALL',
      '--pids-limit',
      String(this.config.dockerPidsLimit),
      '--cpus',
      this.config.dockerCpuLimit,
      '--memory',
      dockerMemoryLimit,
      '--memory-swap',
      dockerMemoryLimit,
      '-e',
      `NOJ_SANDBOX_OUTPUT_LIMIT_BYTES=${this.config.outputLimitBytes}`,
      '-e',
      'PYTHONDONTWRITEBYTECODE=1',
    ];

    // 分離式掛載：根據操作模式設定不同權限
    // src 目錄永遠唯讀（防止惡意程式修改原始碼）
    // build 目錄：compile 時可寫，run 時唯讀
    // out 目錄永遠可寫（用於輸出）
    // testdata 目錄永遠唯讀
    dockerArgs.push(
      '-v', `${params.jobDir}/src:/work/src:ro`,
      '-v', `${params.jobDir}/build:/work/build:${mountMode === 'compile' ? 'rw' : 'ro'}`,
      '-v', `${params.jobDir}/out:/work/out:rw`,
      '-v', `${params.jobDir}/testdata:/work/testdata:ro`,
      '-w', '/work',
      '-i',
    );

    // Add network restriction labels for firewall mode
    if (params.networkConfig?.enabled && params.networkConfig?.mode === 'firewall') {
      // Pass allowed destinations as environment variables for iptables setup script
      if (params.networkConfig.allowedDomains?.length) {
        dockerArgs.push('-e', `NOJ_ALLOWED_DOMAINS=${params.networkConfig.allowedDomains.join(',')}`);
      }
      if (params.networkConfig.allowedIPs?.length) {
        dockerArgs.push('-e', `NOJ_ALLOWED_IPS=${params.networkConfig.allowedIPs.join(',')}`);
      }
      if (params.networkConfig.allowedPorts?.length) {
        dockerArgs.push('-e', `NOJ_ALLOWED_PORTS=${params.networkConfig.allowedPorts.join(',')}`);
      }
      // Add NET_ADMIN capability for iptables (within container namespace)
      // Note: The actual iptables rules should be set up by a sidecar or init container
      // For now, we rely on Docker network policy or external firewall
      dockerArgs.push('-l', 'noj.network.restricted=true');
    }

    dockerArgs.push(
      this.config.image,
      ...params.dockerArgsAfterImage,
    );

    return new Promise((resolve, reject) => {
      const proc = spawn('docker', dockerArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

      let stdout = '';
      let stderr = '';
      let finished = false;
      let killed = false;

      const killAndCleanup = async (reason: string) => {
        if (killed) return;
        killed = true;
        try {
          proc.kill('SIGKILL');
        } catch {}
        try {
          await this.execDockerRmForce(params.containerName);
        } catch {}
        reject(new Error(reason));
      };

      const maxBytes = params.maxOutputBytes;

      proc.stdout.on('data', (data) => {
        stdout += data.toString('utf8');
        if (Buffer.byteLength(stdout, 'utf8') > maxBytes) {
          void killAndCleanup('maxBuffer exceeded');
        }
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString('utf8');
        if (Buffer.byteLength(stderr, 'utf8') > maxBytes) {
          void killAndCleanup('maxBuffer exceeded');
        }
      });

      if (params.stdin !== undefined) {
        proc.stdin.write(params.stdin);
      }
      proc.stdin.end();

      const timeout = setTimeout(() => {
        void killAndCleanup('timeout');
      }, params.timeoutMs);

      proc.on('error', (err) => {
        clearTimeout(timeout);
        if (finished) return;
        finished = true;
        reject(err);
      });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (finished) return;
        finished = true;
        resolve({ exitCode: code ?? 0, stdout, stderr });
      });
    });
  }

  private execDockerRmForce(containerName: string): Promise<void> {
    return new Promise((resolve) => {
      const proc = spawn('docker', ['rm', '-f', containerName], {
        stdio: ['ignore', 'ignore', 'ignore'],
      });
      proc.on('close', () => resolve());
      proc.on('error', () => resolve());
    });
  }
}
