"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DockerSandboxRunner_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerSandboxRunner = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const sandbox_types_1 = require("./sandbox.types");
function sanitizeIdForPath(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}
function dockerMemoryFromKb(memoryLimitKb) {
    const mib = Math.max(4, Math.ceil(memoryLimitKb / 1024));
    return `${mib}m`;
}
function truncateUtf8(text, maxBytes) {
    const buf = Buffer.from(text, 'utf8');
    if (buf.length <= maxBytes)
        return text;
    return buf.subarray(0, maxBytes).toString('utf8');
}
let DockerSandboxRunner = DockerSandboxRunner_1 = class DockerSandboxRunner {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(DockerSandboxRunner_1.name);
    }
    async createJob(submissionId) {
        const safeId = sanitizeIdForPath(submissionId);
        const jobDir = path.join(this.config.jobRootDir, safeId);
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
    async writeSource(job, language, sourceCode) {
        const sandboxLang = (0, sandbox_types_1.toSandboxLanguage)(language);
        const srcFile = path.join(job.jobDir, 'src', this.getSourceFileName(sandboxLang));
        await fs.writeFile(srcFile, sourceCode, { mode: 0o644 });
    }
    async compile(job, language, options) {
        const sandboxLang = (0, sandbox_types_1.toSandboxLanguage)(language);
        const containerName = this.makeContainerName('compile', job.submissionId);
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
            mountMode: 'compile',
        });
        if (result.exitCode !== 0) {
            const combined = truncateUtf8(`${result.stdout}\n${result.stderr}`.trim(), 256 * 1024);
            return { status: client_1.SubmissionStatus.CE, log: combined };
        }
        const combined = truncateUtf8(`${result.stdout}\n${result.stderr}`.trim(), 256 * 1024);
        return { status: client_1.SubmissionStatus.RUNNING, log: combined };
    }
    async compileWithMakefile(job, language, options) {
        const sandboxLang = (0, sandbox_types_1.toSandboxLanguage)(language);
        const containerName = this.makeContainerName('compile', job.submissionId);
        const dockerArgsAfterImage = ['compile-make', sandboxLang];
        if (options?.compilerFlags) {
            dockerArgsAfterImage.push('--flags', options.compilerFlags);
        }
        const result = await this.execDockerRun({
            containerName,
            jobDir: job.jobDir,
            dockerArgsAfterImage,
            timeoutMs: 60_000 + this.config.dockerRunOverheadMs,
            maxOutputBytes: 256 * 1024,
            mountMode: 'compile',
        });
        if (result.exitCode !== 0) {
            const combined = truncateUtf8(`${result.stdout}\n${result.stderr}`.trim(), 256 * 1024);
            return { status: client_1.SubmissionStatus.CE, log: combined };
        }
        const combined = truncateUtf8(`${result.stdout}\n${result.stderr}`.trim(), 256 * 1024);
        return { status: client_1.SubmissionStatus.RUNNING, log: combined };
    }
    async lint(job, language) {
        const sandboxLang = (0, sandbox_types_1.toSandboxLanguage)(language);
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
    async runScript(job, scriptCode, inputJson) {
        const containerName = this.makeContainerName('script', job.submissionId);
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
    async runCase(job, language, input, limits, caseIndex) {
        const sandboxLang = (0, sandbox_types_1.toSandboxLanguage)(language);
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
        const networkMode = this.getNetworkMode(limits.networkConfig);
        try {
            const result = await this.execDockerRun({
                containerName,
                jobDir: job.jobDir,
                dockerArgsAfterImage,
                dockerMemoryLimit: dockerMemoryFromKb(limits.memoryLimitKb),
                timeoutMs,
                maxOutputBytes: 16 * 1024,
                stdin: input,
                networkMode,
                networkConfig: limits.networkConfig,
            });
            const timeMs = Date.now() - startTime;
            const stdout = await this.safeReadText(stdoutFile, this.config.outputLimitBytes);
            const stderr = await this.safeReadText(stderrFile, this.config.outputLimitBytes);
            if (result.exitCode === 0) {
                return { status: client_1.SubmissionStatus.RUNNING, timeMs, stdout, stderr };
            }
            return {
                status: this.classifyNonZeroExit(result.exitCode, stderr),
                timeMs,
                stdout,
                stderr,
            };
        }
        catch (error) {
            const timeMs = Date.now() - startTime;
            this.logger.warn(`docker sandbox failed (case ${caseIndex}): ${String(error.message || error)}`);
            return { status: client_1.SubmissionStatus.JUDGE_ERROR, timeMs, stderr: String(error.message || error) };
        }
    }
    getNetworkMode(networkConfig) {
        if (!networkConfig || !networkConfig.enabled) {
            return 'none';
        }
        if (networkConfig.mode === 'firewall') {
            return 'noj-sandbox-net';
        }
        return 'none';
    }
    async cleanupJob(job) {
        await fs.rm(job.jobDir, { recursive: true, force: true });
    }
    classifyNonZeroExit(exitCode, stderr) {
        const lower = (stderr || '').toLowerCase();
        if (exitCode === 153 || lower.includes('file too large'))
            return client_1.SubmissionStatus.OLE;
        if (exitCode === 152 || lower.includes('time limit') || lower.includes('timeout'))
            return client_1.SubmissionStatus.TLE;
        if (exitCode === 137 && (lower.includes('time limit') || lower.includes('timeout')))
            return client_1.SubmissionStatus.TLE;
        if (exitCode === 137 || lower.includes('out of memory') || lower.includes('oom'))
            return client_1.SubmissionStatus.MLE;
        return client_1.SubmissionStatus.RE;
    }
    async safeReadText(filePath, maxBytes) {
        try {
            const data = await fs.readFile(filePath);
            if (data.length <= maxBytes)
                return data.toString('utf8');
            return data.subarray(0, maxBytes).toString('utf8');
        }
        catch {
            return '';
        }
    }
    getSourceFileName(language) {
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
    makeContainerName(kind, submissionId) {
        const safe = sanitizeIdForPath(submissionId).slice(0, 32);
        const rand = crypto.randomBytes(6).toString('hex');
        return `noj4-${kind}-${safe}-${rand}`.slice(0, 63);
    }
    execDockerRun(params) {
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
        dockerArgs.push('-v', `${params.jobDir}/src:/work/src:ro`, '-v', `${params.jobDir}/build:/work/build:${mountMode === 'compile' ? 'rw' : 'ro'}`, '-v', `${params.jobDir}/out:/work/out:rw`, '-v', `${params.jobDir}/testdata:/work/testdata:ro`, '-w', '/work', '-i');
        if (params.networkConfig?.enabled && params.networkConfig?.mode === 'firewall') {
            if (params.networkConfig.allowedDomains?.length) {
                dockerArgs.push('-e', `NOJ_ALLOWED_DOMAINS=${params.networkConfig.allowedDomains.join(',')}`);
            }
            if (params.networkConfig.allowedIPs?.length) {
                dockerArgs.push('-e', `NOJ_ALLOWED_IPS=${params.networkConfig.allowedIPs.join(',')}`);
            }
            if (params.networkConfig.allowedPorts?.length) {
                dockerArgs.push('-e', `NOJ_ALLOWED_PORTS=${params.networkConfig.allowedPorts.join(',')}`);
            }
            dockerArgs.push('-l', 'noj.network.restricted=true');
        }
        dockerArgs.push(this.config.image, ...params.dockerArgsAfterImage);
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)('docker', dockerArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
            let stdout = '';
            let stderr = '';
            let finished = false;
            let killed = false;
            const killAndCleanup = async (reason) => {
                if (killed)
                    return;
                killed = true;
                try {
                    proc.kill('SIGKILL');
                }
                catch { }
                try {
                    await this.execDockerRmForce(params.containerName);
                }
                catch { }
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
                if (finished)
                    return;
                finished = true;
                reject(err);
            });
            proc.on('close', (code) => {
                clearTimeout(timeout);
                if (finished)
                    return;
                finished = true;
                resolve({ exitCode: code ?? 0, stdout, stderr });
            });
        });
    }
    execDockerRmForce(containerName) {
        return new Promise((resolve) => {
            const proc = (0, child_process_1.spawn)('docker', ['rm', '-f', containerName], {
                stdio: ['ignore', 'ignore', 'ignore'],
            });
            proc.on('close', () => resolve());
            proc.on('error', () => resolve());
        });
    }
};
exports.DockerSandboxRunner = DockerSandboxRunner;
exports.DockerSandboxRunner = DockerSandboxRunner = DockerSandboxRunner_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], DockerSandboxRunner);
//# sourceMappingURL=docker-sandbox.runner.js.map