"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
const client_1 = require("@prisma/client");
const adm_zip_1 = __importDefault(require("adm-zip"));
const TESTDATA_CACHE_TTL = 10 * 60 * 1000;
const TESTDATA_CACHE_MAX_SIZE = 50;
let JudgeProcessor = JudgeProcessor_1 = class JudgeProcessor extends bullmq_1.WorkerHost {
    constructor(prisma, minio, sandbox) {
        super();
        this.prisma = prisma;
        this.minio = minio;
        this.sandbox = sandbox;
        this.logger = new common_1.Logger(JudgeProcessor_1.name);
        this.testdataCache = new Map();
    }
    async process(job) {
        const { submissionId } = job.data;
        this.logger.log(`Processing submission ${submissionId}`);
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
            const sourceCode = await this.minio.getObjectAsString('noj-submissions', submission.sourceKey);
            const testCases = await this.prepareTestCases(submission.problem);
            if (testCases.length === 0) {
                throw new Error('No test cases available');
            }
            const sandboxJob = await this.sandbox.createJob(submissionId);
            try {
                await this.sandbox.writeSource(sandboxJob, submission.language, sourceCode);
                const compileResult = await this.sandbox.compile(sandboxJob, submission.language);
                if (compileResult.status === client_1.SubmissionStatus.CE) {
                    await this.prisma.submission.update({
                        where: { id: submissionId },
                        data: {
                            status: client_1.SubmissionStatus.CE,
                            compileLog: compileResult.log,
                            judgedAt: new Date(),
                        },
                    });
                    return;
                }
                const caseResults = [];
                let allAC = true;
                let firstError = null;
                for (let i = 0; i < testCases.length; i++) {
                    const testCase = testCases[i];
                    const runResult = await this.sandbox.runCase(sandboxJob, submission.language, testCase.input, {
                        timeLimitMs: testCase.timeLimitMs || 5000,
                        memoryLimitKb: testCase.memoryLimitKb || 262144,
                    }, i);
                    const finalCaseStatus = runResult.status === client_1.SubmissionStatus.RUNNING
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
                    if (finalCaseStatus !== client_1.SubmissionStatus.AC) {
                        allAC = false;
                        if (!firstError) {
                            firstError = finalCaseStatus;
                        }
                    }
                }
                const finalStatus = allAC ? client_1.SubmissionStatus.AC : (firstError || client_1.SubmissionStatus.WA);
                await this.prisma.submission.update({
                    where: { id: submissionId },
                    data: {
                        status: finalStatus,
                        judgedAt: new Date(),
                        compileLog: compileResult.log,
                    },
                });
                for (const caseResult of caseResults) {
                    await this.prisma.submissionCase.create({
                        data: {
                            submissionId,
                            ...caseResult,
                        },
                    });
                }
                this.logger.log(`Submission ${submissionId} judged: ${finalStatus} (${caseResults.length} cases)`);
            }
            finally {
                await this.sandbox.cleanupJob(sandboxJob);
            }
        }
        catch (error) {
            this.logger.error(`Error judging submission ${submissionId}:`, error);
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
    compareOutput(stdout, expectedOutput) {
        const userOutput = this.normalizeOutput(stdout);
        const expected = this.normalizeOutput(expectedOutput);
        return userOutput === expected ? client_1.SubmissionStatus.AC : client_1.SubmissionStatus.WA;
    }
    normalizeOutput(output) {
        return output
            .trim()
            .split('\n')
            .map((line) => line.trimEnd())
            .join('\n');
    }
    async prepareTestCases(problem) {
        const testdata = await this.fetchTestdata(problem.id);
        if (testdata) {
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
        this.logger.log(`Falling back to sample data for problem ${problem.id}`);
        const testCases = [];
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
    async fetchTestdata(problemId) {
        const cached = this.getTestdataFromCache(problemId);
        if (cached) {
            return cached;
        }
        const testdataRecord = await this.prisma.problemTestdata.findFirst({
            where: {
                problemId,
                isActive: true,
            },
        });
        if (!testdataRecord) {
            return null;
        }
        const zipBuffer = await this.minio.getObject('noj-testdata', testdataRecord.zipKey);
        const zip = new adm_zip_1.default(zipBuffer);
        const manifestEntry = zip.getEntry('manifest.json');
        if (!manifestEntry) {
            this.logger.error(`Testdata ${testdataRecord.id} missing manifest.json`);
            return null;
        }
        const manifest = JSON.parse(manifestEntry.getData().toString('utf-8'));
        const testdata = {
            zip,
            manifest,
            fetchedAt: Date.now(),
        };
        this.cacheTestdata(problemId, testdata);
        return testdata;
    }
    getTestdataFromCache(problemId) {
        const cached = this.testdataCache.get(problemId);
        if (!cached) {
            return null;
        }
        if (Date.now() - cached.fetchedAt > TESTDATA_CACHE_TTL) {
            this.testdataCache.delete(problemId);
            return null;
        }
        return cached;
    }
    cacheTestdata(problemId, testdata) {
        if (this.testdataCache.size >= TESTDATA_CACHE_MAX_SIZE) {
            const oldestKey = this.testdataCache.keys().next().value;
            if (oldestKey) {
                this.testdataCache.delete(oldestKey);
            }
        }
        this.testdataCache.set(problemId, testdata);
    }
};
exports.JudgeProcessor = JudgeProcessor;
exports.JudgeProcessor = JudgeProcessor = JudgeProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('judge-submission', {
        concurrency: Number.parseInt(process.env.NOJ_JUDGE_CONCURRENCY || '1', 10) || 1,
    }),
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)('SANDBOX_RUNNER')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        minio_service_1.MinioService, Object])
], JudgeProcessor);
//# sourceMappingURL=judge.processor.legacy.js.map