"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const sandbox_module_1 = require("../sandbox/sandbox.module");
const minio_module_1 = require("../minio/minio.module");
const pipeline_executor_1 = require("./pipeline.executor");
const pipeline_registry_1 = require("./pipeline.registry");
const checker_service_1 = require("./checker/checker.service");
const template_service_1 = require("./template/template.service");
const artifacts_service_1 = require("./artifacts/artifacts.service");
const compile_stage_1 = require("./stages/compile.stage");
const execute_stage_1 = require("./stages/execute.stage");
const check_stage_1 = require("./stages/check.stage");
const static_analysis_stage_1 = require("./stages/static-analysis.stage");
const scoring_stage_1 = require("./stages/scoring.stage");
const interactive_stage_1 = require("./stages/interactive.stage");
let PipelineModule = class PipelineModule {
};
exports.PipelineModule = PipelineModule;
exports.PipelineModule = PipelineModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, sandbox_module_1.SandboxModule, minio_module_1.MinioModule],
        providers: [
            checker_service_1.CheckerService,
            template_service_1.TemplateService,
            artifacts_service_1.ArtifactsService,
            pipeline_registry_1.PipelineRegistry,
            pipeline_executor_1.PipelineExecutor,
            compile_stage_1.CompileStage,
            execute_stage_1.ExecuteStage,
            check_stage_1.CheckStage,
            static_analysis_stage_1.StaticAnalysisStage,
            scoring_stage_1.ScoringStage,
            interactive_stage_1.InteractiveStage,
        ],
        exports: [pipeline_executor_1.PipelineExecutor, pipeline_registry_1.PipelineRegistry, artifacts_service_1.ArtifactsService],
    })
], PipelineModule);
//# sourceMappingURL=pipeline.module.js.map