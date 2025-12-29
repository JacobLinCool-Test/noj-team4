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
var CheckStage_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckStage = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const checker_service_1 = require("../checker/checker.service");
const path = __importStar(require("path"));
let CheckStage = CheckStage_1 = class CheckStage {
    constructor(checkerService) {
        this.checkerService = checkerService;
        this.logger = new common_1.Logger(CheckStage_1.name);
        this.name = 'Check';
    }
    async execute(context) {
        const { pipeline, stageConfig } = context;
        const config = stageConfig;
        this.logger.log(`[${pipeline.submissionId}] 開始檢查階段 (模式: ${config.mode})`);
        if (!pipeline.testCaseResults || pipeline.testCaseResults.length === 0) {
            return {
                status: client_1.SubmissionStatus.JUDGE_ERROR,
                stderr: '沒有測試案例結果需要檢查',
                shouldAbort: true,
                message: '評測系統錯誤',
            };
        }
        try {
            let totalPassed = 0;
            let totalScore = 0;
            let maxScore = 0;
            for (const testCase of pipeline.testCaseResults) {
                const failureStatuses = ['TLE', 'MLE', 'RE', 'CE', 'OLE', 'JUDGE_ERROR'];
                if (failureStatuses.includes(testCase.status)) {
                    this.logger.debug(`[${pipeline.submissionId}] 測試案例 ${testCase.name}: 跳過檢查 (狀態: ${testCase.status})`);
                    continue;
                }
                let checkResult;
                if (config.mode === 'custom-checker') {
                    checkResult = await this.runCustomChecker(testCase, config, pipeline);
                }
                else {
                    checkResult = this.diffCheck(testCase, config);
                }
                if (checkResult.passed) {
                    testCase.status = client_1.SubmissionStatus.AC;
                    totalPassed++;
                    if (testCase.points) {
                        totalScore += testCase.points;
                    }
                }
                else {
                    testCase.status = client_1.SubmissionStatus.WA;
                }
                if (testCase.points) {
                    maxScore += testCase.points;
                }
                this.logger.debug(`[${pipeline.submissionId}] 測試案例 ${testCase.name}: ${testCase.status}`);
            }
            const totalCount = pipeline.testCaseResults.length;
            let overallStatus;
            if (totalPassed === totalCount) {
                overallStatus = client_1.SubmissionStatus.AC;
            }
            else if (totalPassed > 0) {
                overallStatus = client_1.SubmissionStatus.PA;
            }
            else {
                overallStatus = client_1.SubmissionStatus.WA;
                const statusPriority = {
                    JUDGE_ERROR: 6,
                    TLE: 5,
                    MLE: 4,
                    RE: 3,
                    OLE: 2,
                    WA: 1,
                    AC: 0,
                };
                for (const testCase of pipeline.testCaseResults) {
                    const currentPriority = statusPriority[overallStatus] ?? 0;
                    const casePriority = statusPriority[testCase.status] ?? 0;
                    if (casePriority > currentPriority) {
                        overallStatus = testCase.status;
                    }
                }
            }
            pipeline.stageData.set('rawScore', totalScore);
            pipeline.stageData.set('finalScore', totalScore);
            pipeline.stageData.set('maxScore', maxScore);
            this.logger.log(`[${pipeline.submissionId}] 檢查階段完成 (狀態: ${overallStatus}, 通過: ${totalPassed}/${totalCount}, 分數: ${totalScore}/${maxScore})`);
            return {
                status: overallStatus,
                details: {
                    passedCount: totalPassed,
                    totalCount: totalCount,
                    score: totalScore,
                    maxScore: maxScore,
                },
                message: `檢查完成 (${totalPassed}/${totalCount} 通過)`,
            };
        }
        catch (error) {
            this.logger.error(`[${pipeline.submissionId}] 檢查階段發生錯誤: ${error.message}`, error.stack);
            return {
                status: client_1.SubmissionStatus.JUDGE_ERROR,
                stderr: error.message,
                shouldAbort: true,
                message: '評測系統錯誤',
            };
        }
    }
    diffCheck(testCase, config) {
        let actual = testCase.stdout || '';
        let expected = testCase.expectedOutput || '';
        if (config.ignoreWhitespace !== false) {
            actual = this.normalizeWhitespace(actual);
            expected = this.normalizeWhitespace(expected);
        }
        if (config.caseSensitive === false) {
            actual = actual.toLowerCase();
            expected = expected.toLowerCase();
        }
        const passed = actual === expected;
        if (!passed) {
            this.logger.debug(`輸出不符:\n期望: ${this.truncate(expected, 200)}\n實際: ${this.truncate(actual, 200)}`);
        }
        return { passed };
    }
    async runCustomChecker(testCase, config, pipeline) {
        const checkerKey = config.checkerKey || pipeline.checkerKey;
        const checkerLanguage = config.checkerLanguage || pipeline.checkerLanguage;
        if (!checkerKey || !checkerLanguage) {
            this.logger.warn('自訂 Checker 配置不完整，使用 diff 檢查');
            return this.diffCheck(testCase, config);
        }
        try {
            const inputFile = path.join(pipeline.testdataDir, testCase.inputFile || 'input.txt');
            const outputFile = path.join(pipeline.outDir, `case_${testCase.caseNo}_output.txt`);
            const answerFile = path.join(pipeline.testdataDir, testCase.outputFile || 'output.txt');
            const fs = require('fs-extra');
            await fs.ensureDir(pipeline.outDir);
            await fs.writeFile(outputFile, testCase.stdout || '', 'utf-8');
            const result = await this.checkerService.runChecker(checkerKey, checkerLanguage, { inputFile, outputFile, answerFile }, pipeline.jobDir);
            return {
                passed: result.passed,
                message: result.message,
            };
        }
        catch (error) {
            this.logger.error(`自訂 Checker 執行失敗: ${error.message}`, error.stack);
            return this.diffCheck(testCase, config);
        }
    }
    normalizeWhitespace(str) {
        return str
            .split('\n')
            .map((line) => line.trimEnd())
            .join('\n')
            .replace(/\n+$/, '');
    }
    truncate(str, maxLength) {
        if (str.length <= maxLength) {
            return str;
        }
        return str.substring(0, maxLength) + '...';
    }
    validateConfig(config) {
        const cfg = config;
        if (!cfg.mode) {
            return '必須指定 mode (diff 或 custom-checker)';
        }
        return null;
    }
};
exports.CheckStage = CheckStage;
exports.CheckStage = CheckStage = CheckStage_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [checker_service_1.CheckerService])
], CheckStage);
//# sourceMappingURL=check.stage.js.map