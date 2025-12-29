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
var ExecuteStage_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecuteStage = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
let ExecuteStage = ExecuteStage_1 = class ExecuteStage {
    constructor(sandbox) {
        this.sandbox = sandbox;
        this.logger = new common_1.Logger(ExecuteStage_1.name);
        this.name = 'Execute';
    }
    async execute(context) {
        const { pipeline, stageConfig } = context;
        const config = stageConfig;
        this.logger.log(`[${pipeline.submissionId}] 開始執行階段`);
        if (!pipeline.compiled) {
            return {
                status: client_1.SubmissionStatus.JUDGE_ERROR,
                stderr: '程式尚未編譯',
                shouldAbort: true,
                message: '評測系統錯誤',
            };
        }
        try {
            const testCases = await this.prepareTestCases(pipeline, config);
            const results = [];
            let totalTimeMs = 0;
            let maxMemoryKb = 0;
            let chaosInjected = false;
            const chaosConfig = pipeline.testdataManifest?.chaos;
            for (let i = 0; i < testCases.length; i++) {
                const testCase = testCases[i];
                if (chaosConfig?.enabled && !chaosInjected) {
                    const injectBeforeCase = chaosConfig.injectBeforeCase ?? 0;
                    if (i === injectBeforeCase) {
                        await this.injectChaosFiles(pipeline, chaosConfig);
                        chaosInjected = true;
                    }
                }
                this.logger.debug(`[${pipeline.submissionId}] 執行測試案例 ${i + 1}/${testCases.length}: ${testCase.name}`);
                const runResult = await this.sandbox.runCase({
                    submissionId: pipeline.submissionId,
                    jobDir: pipeline.jobDir,
                }, pipeline.language, testCase.input, {
                    timeLimitMs: testCase.timeLimitMs || config.timeLimitMs || 1000,
                    memoryLimitKb: testCase.memoryLimitKb || config.memoryLimitKb || 262144,
                    outputLimitBytes: 1048576,
                    networkConfig: pipeline.networkConfig,
                }, i);
                const result = {
                    caseNo: i,
                    name: testCase.name,
                    isSample: testCase.isSample,
                    status: runResult.status,
                    timeMs: runResult.timeMs,
                    memoryKb: runResult.memoryKb,
                    stdout: runResult.stdout,
                    stderr: this.sanitizeStderr(runResult.stderr, runResult.status),
                    inputFile: testCase.inputFile,
                    outputFile: testCase.outputFile,
                    expectedOutput: testCase.expectedOutput,
                    points: testCase.points,
                };
                results.push(result);
                if (runResult.timeMs) {
                    totalTimeMs += runResult.timeMs;
                }
                if (runResult.memoryKb && runResult.memoryKb > maxMemoryKb) {
                    maxMemoryKb = runResult.memoryKb;
                }
                if (runResult.status !== client_1.SubmissionStatus.AC &&
                    runResult.status !== client_1.SubmissionStatus.WA) {
                    this.logger.warn(`[${pipeline.submissionId}] 測試案例 ${i + 1} 執行失敗: ${runResult.status}`);
                }
            }
            pipeline.testCaseResults = results;
            const overallStatus = this.determineOverallStatus(results);
            this.logger.log(`[${pipeline.submissionId}] 執行階段完成 (狀態: ${overallStatus}, 總耗時: ${totalTimeMs}ms, 最大記憶體: ${maxMemoryKb}KB)`);
            return {
                status: overallStatus,
                timeMs: totalTimeMs,
                memoryKb: maxMemoryKb,
                details: {
                    testCaseCount: testCases.length,
                    passedCount: results.filter((r) => r.status === client_1.SubmissionStatus.AC)
                        .length,
                },
                message: `執行完成 (${results.filter((r) => r.status === client_1.SubmissionStatus.AC).length}/${testCases.length} 通過)`,
            };
        }
        catch (error) {
            this.logger.error(`[${pipeline.submissionId}] 執行階段發生錯誤: ${error.message}`, error.stack);
            return {
                status: client_1.SubmissionStatus.JUDGE_ERROR,
                stderr: error.message,
                shouldAbort: true,
                message: '評測系統錯誤',
            };
        }
    }
    async prepareTestCases(pipeline, config) {
        if (config.useTestdata !== false && pipeline.testdataManifest) {
            this.logger.debug(`[${pipeline.submissionId}] 使用測資 (${pipeline.testdataManifest.cases.length} 個測試案例)`);
            return this.loadTestdataCases(pipeline);
        }
        else if (config.customInputs) {
            this.logger.debug(`[${pipeline.submissionId}] 使用自訂輸入 (${config.customInputs.length} 個測試案例)`);
            return config.customInputs.map((input, i) => ({
                name: `Custom ${i + 1}`,
                input,
                isSample: false,
                timeLimitMs: config.timeLimitMs,
                memoryLimitKb: config.memoryLimitKb,
            }));
        }
        else if (pipeline.sampleCases && pipeline.sampleCases.length > 0) {
            this.logger.log(`[${pipeline.submissionId}] 使用範例測資作為備用 (${pipeline.sampleCases.length} 個測試案例)`);
            return pipeline.sampleCases.map((sampleCase, i) => ({
                name: `Sample ${i + 1}`,
                input: sampleCase.input,
                expectedOutput: sampleCase.output,
                isSample: true,
                timeLimitMs: config.timeLimitMs || 5000,
                memoryLimitKb: config.memoryLimitKb || 262144,
            }));
        }
        else {
            throw new Error('沒有可用的測試案例');
        }
    }
    async injectChaosFiles(pipeline, chaosConfig) {
        const { testdataDir, srcDir } = pipeline;
        const chaosDir = path.join(testdataDir, 'chaos');
        if (!(await fs.pathExists(chaosDir))) {
            this.logger.debug(`[${pipeline.submissionId}] Chaos 目錄不存在，跳過注入`);
            return;
        }
        const chaosStat = await fs.stat(chaosDir);
        if (!chaosStat.isDirectory()) {
            this.logger.warn(`[${pipeline.submissionId}] chaos 必須是目錄，跳過注入`);
            return;
        }
        let filesToInject;
        if (chaosConfig.files && chaosConfig.files.length > 0) {
            filesToInject = chaosConfig.files;
        }
        else {
            filesToInject = await fs.readdir(chaosDir);
        }
        for (const file of filesToInject) {
            const srcPath = path.join(chaosDir, file);
            const destPath = path.join(srcDir, file);
            if (!(await fs.pathExists(srcPath))) {
                this.logger.warn(`[${pipeline.submissionId}] Chaos 檔案不存在: ${file}，跳過`);
                continue;
            }
            await fs.copy(srcPath, destPath, { overwrite: true });
            this.logger.debug(`[${pipeline.submissionId}] 已注入 Chaos 檔案: ${file}`);
        }
        this.logger.log(`[${pipeline.submissionId}] 已注入 ${filesToInject.length} 個 Chaos 檔案`);
    }
    async loadTestdataCases(pipeline) {
        const { testdataManifest, testdataDir } = pipeline;
        const cases = [];
        for (const testCase of testdataManifest.cases) {
            const inputPath = path.join(testdataDir, testCase.inputFile);
            const outputPath = path.join(testdataDir, testCase.outputFile);
            const input = await fs.readFile(inputPath, 'utf-8');
            const expectedOutput = await fs.readFile(outputPath, 'utf-8');
            cases.push({
                name: testCase.name,
                input,
                expectedOutput,
                isSample: testCase.isSample,
                inputFile: testCase.inputFile,
                outputFile: testCase.outputFile,
                timeLimitMs: testCase.timeLimitMs || testdataManifest.defaultTimeLimitMs,
                memoryLimitKb: testCase.memoryLimitKb || testdataManifest.defaultMemoryLimitKb,
                points: testCase.points,
            });
        }
        return cases;
    }
    determineOverallStatus(results) {
        const executionErrors = ['TLE', 'MLE', 'RE', 'OLE', 'CE', 'JUDGE_ERROR'];
        for (const result of results) {
            if (executionErrors.includes(result.status)) {
                return result.status;
            }
        }
        const successStatuses = ['AC', 'RUNNING'];
        if (results.every((r) => successStatuses.includes(r.status))) {
            return client_1.SubmissionStatus.AC;
        }
        return client_1.SubmissionStatus.WA;
    }
    sanitizeStderr(stderr, status) {
        if (!stderr) {
            return undefined;
        }
        const sensitivePatterns = [
            /\/usr\/local\/bin\/noj-sandbox/gi,
            /ulimit\s+-[a-z]/gi,
            /timeout.*--signal/gi,
            /skip_memory_limit/gi,
            /memory_limit_kb/gi,
            /cpu_limit_s/gi,
            /nofile_limit/gi,
            /nproc_limit/gi,
            /line\s+\d+:/gi,
            /\(.*ulimit.*\)/gi,
        ];
        const containsSensitiveInfo = sensitivePatterns.some(pattern => pattern.test(stderr));
        if (containsSensitiveInfo) {
            switch (status) {
                case client_1.SubmissionStatus.TLE:
                    return '程式執行超時';
                case client_1.SubmissionStatus.MLE:
                    return '程式記憶體超出限制';
                case client_1.SubmissionStatus.OLE:
                    return '程式輸出超出限制';
                case client_1.SubmissionStatus.RE:
                    return '程式執行時發生錯誤';
                default:
                    return '執行發生錯誤';
            }
        }
        return stderr;
    }
    validateConfig(config) {
        const cfg = config;
        if (cfg.useTestdata === false && !cfg.customInputs) {
            return '必須提供 customInputs 或啟用 useTestdata';
        }
        return null;
    }
};
exports.ExecuteStage = ExecuteStage;
exports.ExecuteStage = ExecuteStage = ExecuteStage_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('SANDBOX_RUNNER')),
    __metadata("design:paramtypes", [Object])
], ExecuteStage);
//# sourceMappingURL=execute.stage.js.map