"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JudgeModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const judge_processor_1 = require("./judge.processor");
const sandbox_module_1 = require("../sandbox/sandbox.module");
const pipeline_module_1 = require("../pipeline/pipeline.module");
const prisma_module_1 = require("../prisma/prisma.module");
const minio_module_1 = require("../minio/minio.module");
let JudgeModule = class JudgeModule {
};
exports.JudgeModule = JudgeModule;
exports.JudgeModule = JudgeModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'judge-submission',
            }),
            prisma_module_1.PrismaModule,
            minio_module_1.MinioModule,
            sandbox_module_1.SandboxModule,
            pipeline_module_1.PipelineModule,
        ],
        providers: [judge_processor_1.JudgeProcessor],
    })
], JudgeModule);
//# sourceMappingURL=judge.module.js.map