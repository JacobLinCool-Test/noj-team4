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
var PipelineExecutor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineExecutor = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pipeline_registry_1 = require("./pipeline.registry");
const client_1 = require("@prisma/client");
const artifacts_service_1 = require("./artifacts/artifacts.service");
let PipelineExecutor = PipelineExecutor_1 = class PipelineExecutor {
    constructor(prisma, registry, artifactsService) {
        this.prisma = prisma;
        this.registry = registry;
        this.artifactsService = artifactsService;
        this.logger = new common_1.Logger(PipelineExecutor_1.name);
    }
    async execute(pipelineContext, pipelineConfig) {
        const { submissionId } = pipelineContext;
        this.logger.log(`[${submissionId}] 開始執行 Pipeline (共 ${pipelineConfig.stages.length} 個階段)`);
        const stageResults = [];
        let currentStatus = client_1.SubmissionStatus.PENDING;
        let shouldAbort = false;
        if (!pipelineContext.stageData) {
            pipelineContext.stageData = new Map();
        }
        for (let i = 0; i < pipelineConfig.stages.length; i++) {
            const stageConfig = pipelineConfig.stages[i];
            if (stageConfig.enabled === false) {
                this.logger.debug(`[${submissionId}] 跳過階段 ${i + 1}: ${stageConfig.type} (已停用)`);
                continue;
            }
            if (shouldAbort) {
                this.logger.warn(`[${submissionId}] 前一階段要求中止，停止執行後續階段`);
                break;
            }
            const stage = this.registry.getStage(stageConfig.type);
            if (!stage) {
                this.logger.error(`[${submissionId}] Stage ${stageConfig.type} 未註冊`);
                stageResults.push({
                    status: client_1.SubmissionStatus.JUDGE_ERROR,
                    stderr: `Stage ${stageConfig.type} 未註冊`,
                    shouldAbort: true,
                    message: '評測系統錯誤',
                });
                currentStatus = client_1.SubmissionStatus.JUDGE_ERROR;
                shouldAbort = true;
                break;
            }
            const configError = this.registry.validateStageConfig(stageConfig.type, stageConfig.config);
            if (configError) {
                this.logger.error(`[${submissionId}] Stage ${stageConfig.type} 配置錯誤: ${configError}`);
                stageResults.push({
                    status: client_1.SubmissionStatus.JUDGE_ERROR,
                    stderr: `配置錯誤: ${configError}`,
                    shouldAbort: true,
                    message: '評測系統錯誤',
                });
                currentStatus = client_1.SubmissionStatus.JUDGE_ERROR;
                shouldAbort = true;
                break;
            }
            this.logger.log(`[${submissionId}] 執行階段 ${i + 1}/${pipelineConfig.stages.length}: ${stageConfig.type}`);
            const stageContext = {
                pipeline: pipelineContext,
                stageConfig: stageConfig.config,
                stageOrder: i,
            };
            try {
                const startTime = Date.now();
                const result = await stage.execute(stageContext);
                const duration = Date.now() - startTime;
                this.logger.log(`[${submissionId}] 階段 ${i + 1} 完成: ${stageConfig.type} (狀態: ${result.status}, 耗時: ${duration}ms)`);
                stageResults.push(result);
                await this.saveStageResult(submissionId, stageConfig.type, i, result);
                if (result.status !== client_1.SubmissionStatus.AC) {
                    currentStatus = result.status;
                }
                if (result.shouldAbort) {
                    shouldAbort = true;
                }
                if (stage.cleanup) {
                    await stage.cleanup(stageContext);
                }
            }
            catch (error) {
                this.logger.error(`[${submissionId}] 階段 ${stageConfig.type} 執行失敗: ${error.message}`, error.stack);
                const errorResult = {
                    status: client_1.SubmissionStatus.JUDGE_ERROR,
                    stderr: error.message,
                    shouldAbort: true,
                    message: '評測系統錯誤',
                };
                stageResults.push(errorResult);
                await this.saveStageResult(submissionId, stageConfig.type, i, errorResult);
                currentStatus = client_1.SubmissionStatus.JUDGE_ERROR;
                shouldAbort = true;
                break;
            }
        }
        const rawScore = pipelineContext.stageData.get('rawScore') || 0;
        const finalScore = pipelineContext.stageData.get('finalScore') || rawScore;
        if ((currentStatus === client_1.SubmissionStatus.PENDING ||
            currentStatus === client_1.SubmissionStatus.RUNNING) &&
            stageResults.every((r) => r.status === client_1.SubmissionStatus.AC)) {
            currentStatus = client_1.SubmissionStatus.AC;
        }
        const testCaseResults = pipelineContext.testCaseResults || [];
        let artifactsKey;
        if (pipelineContext.artifactPaths && pipelineContext.artifactPaths.length > 0) {
            try {
                const artifacts = await this.artifactsService.collectArtifacts(pipelineContext.jobDir, pipelineContext.artifactPaths);
                if (artifacts.size > 0) {
                    artifactsKey = await this.artifactsService.uploadArtifacts(submissionId, artifacts);
                }
            }
            catch (error) {
                this.logger.warn(`[${submissionId}] 收集產物失敗: ${error.message}`);
            }
        }
        const executionResult = {
            finalStatus: currentStatus,
            score: finalScore,
            rawScore,
            stageResults,
            testCaseResults,
            compileLog: pipelineContext.compileLog,
            summary: {
                totalStages: pipelineConfig.stages.length,
                completedStages: stageResults.length,
                aborted: shouldAbort,
            },
            artifactsKey,
        };
        this.logger.log(`[${submissionId}] Pipeline 執行完成 (最終狀態: ${currentStatus}, 分數: ${finalScore})`);
        return executionResult;
    }
    async saveStageResult(submissionId, stageType, order, result) {
        try {
            await this.prisma.pipelineStageResult.create({
                data: {
                    submissionId,
                    stageType,
                    order,
                    status: result.status,
                    timeMs: result.timeMs,
                    memoryKb: result.memoryKb,
                    stdoutTrunc: result.stdout?.substring(0, 10000),
                    stderrTrunc: result.stderr?.substring(0, 10000),
                    details: result.details || {},
                },
            });
        }
        catch (error) {
            this.logger.error(`[${submissionId}] 儲存階段結果失敗: ${error.message}`, error.stack);
        }
    }
    async uploadArtifacts(submissionId, artifacts) {
        if (!artifacts || artifacts.size === 0) {
            return undefined;
        }
        try {
            return await this.artifactsService.uploadArtifacts(submissionId, artifacts);
        }
        catch (error) {
            this.logger.error(`[${submissionId}] 上傳產物失敗: ${error.message}`, error.stack);
            return undefined;
        }
    }
};
exports.PipelineExecutor = PipelineExecutor;
exports.PipelineExecutor = PipelineExecutor = PipelineExecutor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        pipeline_registry_1.PipelineRegistry,
        artifacts_service_1.ArtifactsService])
], PipelineExecutor);
//# sourceMappingURL=pipeline.executor.js.map