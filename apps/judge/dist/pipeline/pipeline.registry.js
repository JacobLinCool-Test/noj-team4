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
var PipelineRegistry_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineRegistry = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const compile_stage_1 = require("./stages/compile.stage");
const execute_stage_1 = require("./stages/execute.stage");
const check_stage_1 = require("./stages/check.stage");
const static_analysis_stage_1 = require("./stages/static-analysis.stage");
const scoring_stage_1 = require("./stages/scoring.stage");
const interactive_stage_1 = require("./stages/interactive.stage");
let PipelineRegistry = PipelineRegistry_1 = class PipelineRegistry {
    constructor(compileStage, executeStage, checkStage, staticAnalysisStage, scoringStage, interactiveStage) {
        this.compileStage = compileStage;
        this.executeStage = executeStage;
        this.checkStage = checkStage;
        this.staticAnalysisStage = staticAnalysisStage;
        this.scoringStage = scoringStage;
        this.interactiveStage = interactiveStage;
        this.logger = new common_1.Logger(PipelineRegistry_1.name);
        this.stages = new Map();
    }
    onModuleInit() {
        this.registerStage(client_1.PipelineStageType.COMPILE, this.compileStage);
        this.registerStage(client_1.PipelineStageType.EXECUTE, this.executeStage);
        this.registerStage(client_1.PipelineStageType.CHECK, this.checkStage);
        this.registerStage(client_1.PipelineStageType.STATIC_ANALYSIS, this.staticAnalysisStage);
        this.registerStage(client_1.PipelineStageType.SCORING, this.scoringStage);
        this.registerStage(client_1.PipelineStageType.INTERACTIVE, this.interactiveStage);
        this.logger.log(`Pipeline Registry 初始化完成，已註冊 ${this.stages.size} 個 Stage`);
    }
    registerStage(type, stage) {
        if (this.stages.has(type)) {
            this.logger.warn(`Stage ${type} 已經註冊，將被覆蓋`);
        }
        this.stages.set(type, stage);
        this.logger.debug(`註冊 Stage: ${type} (${stage.name})`);
    }
    getStage(type) {
        return this.stages.get(type);
    }
    hasStage(type) {
        return this.stages.has(type);
    }
    getAllStageTypes() {
        return Array.from(this.stages.keys());
    }
    validateStageConfig(type, config) {
        const stage = this.getStage(type);
        if (!stage) {
            return `Stage ${type} 未註冊`;
        }
        if (stage.validateConfig) {
            return stage.validateConfig(config);
        }
        return null;
    }
};
exports.PipelineRegistry = PipelineRegistry;
exports.PipelineRegistry = PipelineRegistry = PipelineRegistry_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [compile_stage_1.CompileStage,
        execute_stage_1.ExecuteStage,
        check_stage_1.CheckStage,
        static_analysis_stage_1.StaticAnalysisStage,
        scoring_stage_1.ScoringStage,
        interactive_stage_1.InteractiveStage])
], PipelineRegistry);
//# sourceMappingURL=pipeline.registry.js.map