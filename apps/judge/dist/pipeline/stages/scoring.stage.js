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
var ScoringStage_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringStage = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const minio_service_1 = require("../../minio/minio.service");
let ScoringStage = ScoringStage_1 = class ScoringStage {
    constructor(sandbox, minio) {
        this.sandbox = sandbox;
        this.minio = minio;
        this.logger = new common_1.Logger(ScoringStage_1.name);
        this.name = 'Scoring';
    }
    async execute(context) {
        const { pipeline, stageConfig } = context;
        const config = stageConfig;
        this.logger.log(`[${pipeline.submissionId}] 開始計分階段 (模式: ${config.mode})`);
        try {
            let rawScore = 0;
            let finalScore = 0;
            switch (config.mode) {
                case 'sum':
                    rawScore = this.calculateSumScore(pipeline);
                    break;
                case 'weighted':
                    rawScore = this.calculateWeightedScore(pipeline, config);
                    break;
                case 'custom-script':
                    rawScore = await this.runCustomScoringScript(pipeline, config);
                    break;
                default:
                    rawScore = this.calculateSumScore(pipeline);
            }
            finalScore = rawScore;
            if (config.penaltyRules && config.penaltyRules.length > 0) {
                finalScore = await this.applyPenalties(rawScore, config.penaltyRules, pipeline);
            }
            pipeline.stageData.set('rawScore', rawScore);
            pipeline.stageData.set('finalScore', finalScore);
            this.logger.log(`[${pipeline.submissionId}] 計分完成 (原始分數: ${rawScore}, 最終分數: ${finalScore})`);
            return {
                status: client_1.SubmissionStatus.AC,
                details: {
                    rawScore,
                    finalScore,
                    penaltyApplied: rawScore !== finalScore,
                },
                message: `計分完成 (${finalScore} 分)`,
            };
        }
        catch (error) {
            this.logger.error(`[${pipeline.submissionId}] 計分階段發生錯誤: ${error.message}`, error.stack);
            return {
                status: client_1.SubmissionStatus.JUDGE_ERROR,
                stderr: error.message,
                shouldAbort: true,
                message: '評測系統錯誤',
            };
        }
    }
    calculateSumScore(pipeline) {
        const { testCaseResults } = pipeline;
        if (!testCaseResults || testCaseResults.length === 0) {
            return 0;
        }
        let totalScore = 0;
        for (const result of testCaseResults) {
            if (result.status === client_1.SubmissionStatus.AC && result.points) {
                totalScore += result.points;
            }
        }
        return totalScore;
    }
    calculateWeightedScore(pipeline, config) {
        const { testCaseResults } = pipeline;
        if (!testCaseResults || testCaseResults.length === 0) {
            return 0;
        }
        const weights = config.weights || {};
        const subtaskWeights = config.subtaskWeights || [];
        const defaultWeight = config.defaultWeight || 1;
        let totalWeightedScore = 0;
        let totalWeight = 0;
        if (subtaskWeights.length > 0) {
            const subtaskGroups = new Map();
            for (const result of testCaseResults) {
                const subtaskId = result.subtaskId || 0;
                if (!subtaskGroups.has(subtaskId)) {
                    subtaskGroups.set(subtaskId, []);
                }
                subtaskGroups.get(subtaskId).push(result);
            }
            for (let i = 0; i < subtaskWeights.length; i++) {
                const subtaskWeight = subtaskWeights[i];
                const subtaskCases = subtaskGroups.get(i) || [];
                if (subtaskCases.length === 0)
                    continue;
                const allPassed = subtaskCases.every((r) => r.status === client_1.SubmissionStatus.AC);
                if (allPassed) {
                    totalWeightedScore += subtaskWeight || 0;
                }
                totalWeight += subtaskWeight || 0;
            }
        }
        else {
            for (const result of testCaseResults) {
                const caseName = result.name || `case-${result.caseNo}`;
                const weight = weights[caseName] || defaultWeight;
                if (result.status === client_1.SubmissionStatus.AC) {
                    totalWeightedScore += (result.points || 0) * weight;
                }
                totalWeight += (result.points || 0) * weight;
            }
        }
        if (config.normalizeToTotal && totalWeight > 0) {
            const normalizedScore = (totalWeightedScore / totalWeight) * config.normalizeToTotal;
            return Math.round(normalizedScore * 100) / 100;
        }
        return totalWeightedScore;
    }
    async runCustomScoringScript(pipeline, config) {
        if (!config.scriptKey) {
            this.logger.warn(`[${pipeline.submissionId}] 未提供 scriptKey，使用累加計分`);
            return this.calculateSumScore(pipeline);
        }
        try {
            const scriptCode = await this.minio.getObjectAsString('noj-problems', config.scriptKey);
            const inputData = {
                submissionId: pipeline.submissionId,
                problemId: pipeline.problemId,
                language: pipeline.language,
                testCaseResults: pipeline.testCaseResults || [],
                submittedAt: new Date().toISOString(),
                totalPoints: (pipeline.testCaseResults || []).reduce((sum, r) => sum + (r.points || 0), 0),
            };
            const result = await this.sandbox.runScript({
                submissionId: pipeline.submissionId,
                jobDir: pipeline.jobDir,
            }, scriptCode, JSON.stringify(inputData));
            if (result.exitCode !== 0) {
                this.logger.warn(`[${pipeline.submissionId}] 計分腳本執行失敗 (exitCode: ${result.exitCode}): ${result.stderr}`);
                return this.calculateSumScore(pipeline);
            }
            try {
                const outputData = JSON.parse(result.output);
                if (typeof outputData.score === 'number') {
                    return outputData.score;
                }
                if (typeof outputData === 'number') {
                    return outputData;
                }
                this.logger.warn(`[${pipeline.submissionId}] 計分腳本輸出格式無效，使用累加計分`);
                return this.calculateSumScore(pipeline);
            }
            catch (parseError) {
                const score = parseFloat(result.output.trim());
                if (!isNaN(score)) {
                    return score;
                }
                this.logger.warn(`[${pipeline.submissionId}] 無法解析計分腳本輸出: ${result.output}`);
                return this.calculateSumScore(pipeline);
            }
        }
        catch (error) {
            this.logger.error(`[${pipeline.submissionId}] 自訂計分腳本執行錯誤: ${error.message}`);
            return this.calculateSumScore(pipeline);
        }
    }
    async applyPenalties(rawScore, rules, pipeline) {
        let finalScore = rawScore;
        for (const rule of rules) {
            const penalty = await this.calculatePenalty(rule, pipeline);
            finalScore = Math.max(0, finalScore - penalty);
            this.logger.debug(`[${pipeline.submissionId}] 應用懲罰規則 ${rule.type}: -${penalty} 分`);
        }
        return finalScore;
    }
    async calculatePenalty(rule, pipeline) {
        switch (rule.type) {
            case 'late-submission':
                return this.calculateLateSubmissionPenalty(rule.config, pipeline);
            case 'memory-usage':
                return this.calculateMemoryUsagePenalty(rule.config, pipeline);
            case 'time-usage':
                return this.calculateTimeUsagePenalty(rule.config, pipeline);
            default:
                this.logger.warn(`未知的懲罰規則類型: ${rule.type}`);
                return 0;
        }
    }
    calculateLateSubmissionPenalty(config, pipeline) {
        const deadline = pipeline.stageData.get('deadline');
        const submittedAt = pipeline.stageData.get('submittedAt');
        if (!deadline || !submittedAt) {
            return 0;
        }
        const deadlineDate = new Date(deadline);
        const submittedDate = new Date(submittedAt);
        if (submittedDate <= deadlineDate) {
            return 0;
        }
        const lateMs = submittedDate.getTime() - deadlineDate.getTime();
        const lateDays = lateMs / (1000 * 60 * 60 * 24);
        const penaltyMode = config.mode || 'per-day';
        const penaltyRate = config.rate || 10;
        const maxPenalty = config.maxPenalty || 100;
        const gracePeriodHours = config.gracePeriodHours || 0;
        const effectiveLateHours = Math.max(0, (lateMs / (1000 * 60 * 60)) - gracePeriodHours);
        const effectiveLateDays = effectiveLateHours / 24;
        let penalty = 0;
        switch (penaltyMode) {
            case 'per-day':
                penalty = Math.ceil(effectiveLateDays) * penaltyRate;
                break;
            case 'per-hour':
                penalty = Math.ceil(effectiveLateHours) * penaltyRate;
                break;
            case 'percentage-per-day':
                penalty = Math.ceil(effectiveLateDays) * penaltyRate;
                break;
            case 'exponential':
                penalty = Math.pow(2, effectiveLateDays) * penaltyRate;
                break;
            default:
                penalty = Math.ceil(effectiveLateDays) * penaltyRate;
        }
        penalty = Math.min(penalty, maxPenalty);
        this.logger.debug(`[${pipeline.submissionId}] 遲交懲罰: ${penalty} 分 (遲交 ${lateDays.toFixed(2)} 天)`);
        return penalty;
    }
    calculateMemoryUsagePenalty(config, pipeline) {
        const { testCaseResults } = pipeline;
        if (!testCaseResults || testCaseResults.length === 0) {
            return 0;
        }
        const maxMemoryKb = Math.max(...testCaseResults.map((r) => r.memoryKb || 0));
        const maxMemoryMb = maxMemoryKb / 1024;
        const threshold = config.thresholdMb || 64;
        const penaltyRate = config.penaltyRate || 1;
        if (maxMemoryMb > threshold) {
            return (maxMemoryMb - threshold) * penaltyRate;
        }
        return 0;
    }
    calculateTimeUsagePenalty(config, pipeline) {
        const { testCaseResults } = pipeline;
        if (!testCaseResults || testCaseResults.length === 0) {
            return 0;
        }
        const totalTimeMs = testCaseResults.reduce((sum, r) => sum + (r.timeMs || 0), 0);
        const thresholdMs = config.thresholdMs || 10000;
        const penaltyRate = config.penaltyRate || 0.01;
        if (totalTimeMs > thresholdMs) {
            return (totalTimeMs - thresholdMs) * penaltyRate;
        }
        return 0;
    }
    validateConfig(config) {
        const cfg = config;
        if (!cfg.mode) {
            return '必須指定 mode (sum, weighted, 或 custom-script)';
        }
        if (cfg.mode === 'custom-script' && !cfg.scriptKey) {
            return 'custom-script 模式必須提供 scriptKey';
        }
        return null;
    }
};
exports.ScoringStage = ScoringStage;
exports.ScoringStage = ScoringStage = ScoringStage_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('SANDBOX_RUNNER')),
    __metadata("design:paramtypes", [Object, minio_service_1.MinioService])
], ScoringStage);
//# sourceMappingURL=scoring.stage.js.map