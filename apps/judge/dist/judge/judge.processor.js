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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var JudgeProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JudgeProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const minio_service_1 = require("../minio/minio.service");
const redis_lock_service_1 = require("../redis/redis-lock.service");
const client_1 = require("@prisma/client");
const adm_zip_1 = __importDefault(require("adm-zip"));
const pipeline_executor_1 = require("../pipeline/pipeline.executor");
const path = __importStar(require("path"));
const zip_security_1 = require("../utils/zip-security");
const TESTDATA_CACHE_TTL = 10 * 60 * 1000;
const TESTDATA_CACHE_MAX_SIZE = 50;
let JudgeProcessor = JudgeProcessor_1 = class JudgeProcessor extends bullmq_1.WorkerHost {
    constructor(prisma, minio, redisLock, sandbox, pipelineExecutor) {
        super();
        this.prisma = prisma;
        this.minio = minio;
        this.redisLock = redisLock;
        this.sandbox = sandbox;
        this.pipelineExecutor = pipelineExecutor;
        this.logger = new common_1.Logger(JudgeProcessor_1.name);
        this.testdataCache = new Map();
    }
    async process(job) {
        const { submissionId } = job.data;
        this.logger.log(`[Pipeline] Processing submission ${submissionId}`);
        try {
            const submission = await this.prisma.submission.findUnique({
                where: { id: submissionId },
                include: { problem: true },
            });
            if (!submission) {
                throw new Error(`Submission ${submissionId} not found`);
            }
            await this.prisma.submission.update({
                where: { id: submissionId },
                data: { status: client_1.SubmissionStatus.RUNNING },
            });
            const pipelineConfig = this.preparePipelineConfig(submission.problem);
            const pipelineContext = await this.createPipelineContext(submission);
            try {
                const result = await this.pipelineExecutor.execute(pipelineContext, pipelineConfig);
                await this.saveResults(submissionId, result);
                this.logger.log(`[Pipeline] Submission ${submissionId} judged: ${result.finalStatus} (分數: ${result.score})`);
            }
            finally {
                await this.cleanup(pipelineContext);
            }
        }
        catch (error) {
            this.logger.error(`[Pipeline] Error judging submission ${submissionId}:`, error);
            await this.prisma.submission.update({
                where: { id: submissionId },
                data: {
                    status: client_1.SubmissionStatus.JUDGE_ERROR,
                    judgedAt: new Date(),
                    summary: { error: error.message },
                },
            });
            throw error;
        }
    }
    preparePipelineConfig(problem) {
        if (problem.pipelineConfig) {
            const config = problem.pipelineConfig;
            if (Array.isArray(config)) {
                return { stages: config };
            }
            if (config.stages && Array.isArray(config.stages)) {
                return config;
            }
            this.logger.warn(`[Pipeline] 題目 ${problem.displayId} 的 pipelineConfig 格式不正確，使用預設配置`);
        }
        return {
            stages: [
                {
                    type: client_1.PipelineStageType.COMPILE,
                    config: {},
                },
                {
                    type: client_1.PipelineStageType.EXECUTE,
                    config: {
                        useTestdata: true,
                    },
                },
                {
                    type: client_1.PipelineStageType.CHECK,
                    config: {
                        mode: 'diff',
                        ignoreWhitespace: true,
                        caseSensitive: true,
                    },
                },
            ],
        };
    }
    async createPipelineContext(submission) {
        const { problem } = submission;
        const sandboxJob = await this.sandbox.createJob(submission.id);
        const jobDir = sandboxJob.jobDir;
        const sourceCode = await this.minio.getObjectAsString('noj-submissions', submission.sourceKey);
        if (problem.submissionType === client_1.SubmissionType.MULTI_FILE) {
            await this.extractMultiFileSubmission(sourceCode, path.join(jobDir, 'src'));
        }
        else if (problem.submissionType === client_1.SubmissionType.SINGLE_FILE) {
        }
        let testdataManifest;
        const testdata = await this.fetchTestdata(problem.id);
        if (testdata) {
            testdataManifest = testdata.manifest;
            await this.extractTestdata(testdata.zip, path.join(jobDir, 'testdata'));
        }
        const sampleCases = (problem.sampleInputs || []).map((input, i) => ({
            input,
            output: problem.sampleOutputs?.[i] || '',
        }));
        const context = {
            submissionId: submission.id,
            userId: submission.userId,
            problemId: problem.id,
            language: submission.language,
            submissionType: problem.submissionType || client_1.SubmissionType.SINGLE_FILE,
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
    async extractMultiFileSubmission(zipContent, targetDir) {
        try {
            const extractedFiles = await (0, zip_security_1.extractBase64Securely)(zipContent, targetDir, {
                checkDangerousFiles: true,
                maxUncompressedSize: 50 * 1024 * 1024,
            });
            this.logger.debug(`安全解壓縮多檔案提交到 ${targetDir}，共 ${extractedFiles.length} 個檔案`);
        }
        catch (error) {
            if (error instanceof zip_security_1.ZipSecurityError) {
                this.logger.warn(`多檔案提交安全檢查失敗: ${error.code} - ${error.message}`);
                throw new Error(`提交檔案安全檢查失敗: ${error.code}`);
            }
            throw error;
        }
    }
    async extractTestdata(zip, targetDir) {
        try {
            const extractedFiles = await (0, zip_security_1.extractZipSecurely)(zip, targetDir, {
                checkDangerousFiles: false,
                maxUncompressedSize: 100 * 1024 * 1024,
            });
            this.logger.debug(`安全解壓縮測資到 ${targetDir}，共 ${extractedFiles.length} 個檔案`);
        }
        catch (error) {
            if (error instanceof zip_security_1.ZipSecurityError) {
                this.logger.error(`測資安全檢查失敗: ${error.code} - ${error.message}`);
                throw new Error(`測資安全檢查失敗: ${error.code}`);
            }
            throw error;
        }
    }
    async saveResults(submissionId, result) {
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
    async cleanup(context) {
        try {
            await this.sandbox.cleanupJob({ jobDir: context.jobDir });
        }
        catch (error) {
            this.logger.warn(`[${context.submissionId}] 清理工作目錄失敗: ${error.message}`);
        }
    }
    async fetchTestdata(problemId) {
        const cached = this.testdataCache.get(problemId);
        if (cached && Date.now() - cached.fetchedAt < TESTDATA_CACHE_TTL) {
            this.logger.debug(`[Testdata] 使用本地快取: ${problemId}`);
            return cached;
        }
        const lockKey = `testdata:${problemId}`;
        const lockToken = await this.redisLock.acquireLock(lockKey, 60000, 30, 500);
        if (!lockToken) {
            this.logger.debug(`[Testdata] 等待其他 worker 刷新測資: ${problemId}`);
            await this.delay(1000);
            const cachedAfterWait = this.testdataCache.get(problemId);
            if (cachedAfterWait && Date.now() - cachedAfterWait.fetchedAt < TESTDATA_CACHE_TTL) {
                return cachedAfterWait;
            }
            return this.fetchTestdataWithLock(problemId);
        }
        try {
            return await this.fetchTestdataInternal(problemId);
        }
        finally {
            await this.redisLock.releaseLock(lockKey, lockToken);
        }
    }
    async fetchTestdataWithLock(problemId) {
        return this.redisLock.withLock(`testdata:${problemId}`, async () => {
            const cached = this.testdataCache.get(problemId);
            if (cached && Date.now() - cached.fetchedAt < TESTDATA_CACHE_TTL) {
                return cached;
            }
            return this.fetchTestdataInternal(problemId);
        }, 60000);
    }
    async fetchTestdataInternal(problemId) {
        const cached = this.testdataCache.get(problemId);
        if (cached && Date.now() - cached.fetchedAt < TESTDATA_CACHE_TTL) {
            return cached;
        }
        const testdataRecord = await this.prisma.problemTestdata.findFirst({
            where: { problemId, isActive: true },
            orderBy: { version: 'desc' },
        });
        if (!testdataRecord) {
            return null;
        }
        this.logger.debug(`[Testdata] 從 MinIO 下載測資: ${problemId} v${testdataRecord.version}`);
        const zipBuffer = await this.minio.getObject('noj-testdata', testdataRecord.zipKey);
        const zip = new adm_zip_1.default(zipBuffer);
        const manifest = testdataRecord.manifest;
        const testdata = {
            zip,
            manifest,
            fetchedAt: Date.now(),
        };
        this.testdataCache.set(problemId, testdata);
        if (this.testdataCache.size > TESTDATA_CACHE_MAX_SIZE) {
            const oldestKey = Array.from(this.testdataCache.entries()).sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)[0][0];
            this.testdataCache.delete(oldestKey);
        }
        this.logger.log(`[Testdata] 測資已更新: ${problemId} v${testdataRecord.version}`);
        return testdata;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.JudgeProcessor = JudgeProcessor;
exports.JudgeProcessor = JudgeProcessor = JudgeProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('judge-submission', {
        concurrency: Number.parseInt(process.env.NOJ_JUDGE_CONCURRENCY || '1', 10) || 1,
    }),
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)('SANDBOX_RUNNER')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        minio_service_1.MinioService,
        redis_lock_service_1.RedisLockService, Object, pipeline_executor_1.PipelineExecutor])
], JudgeProcessor);
//# sourceMappingURL=judge.processor.js.map