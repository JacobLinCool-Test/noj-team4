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
var CompileStage_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompileStage = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const template_service_1 = require("../template/template.service");
const minio_service_1 = require("../../minio/minio.service");
const source_validation_1 = require("../../utils/source-validation");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
let CompileStage = CompileStage_1 = class CompileStage {
    constructor(sandbox, templateService, minio) {
        this.sandbox = sandbox;
        this.templateService = templateService;
        this.minio = minio;
        this.logger = new common_1.Logger(CompileStage_1.name);
        this.name = 'Compile';
    }
    async execute(context) {
        const { pipeline, stageConfig } = context;
        const config = stageConfig;
        this.logger.log(`[${pipeline.submissionId}] 開始編譯階段 (語言: ${pipeline.language}, 類型: ${pipeline.submissionType})`);
        try {
            await this.prepareSource(pipeline);
            const useMakefile = await this.shouldUseMakefile(pipeline);
            const startTime = Date.now();
            let compileResult;
            const compileOptions = config.compilerFlags
                ? { compilerFlags: config.compilerFlags }
                : undefined;
            if (useMakefile) {
                this.logger.log(`[${pipeline.submissionId}] 使用 Makefile 編譯`);
                compileResult = await this.sandbox.compileWithMakefile({
                    submissionId: pipeline.submissionId,
                    jobDir: pipeline.jobDir,
                }, pipeline.language, compileOptions);
            }
            else {
                compileResult = await this.sandbox.compile({
                    submissionId: pipeline.submissionId,
                    jobDir: pipeline.jobDir,
                }, pipeline.language, compileOptions);
            }
            const timeMs = Date.now() - startTime;
            pipeline.compileLog = compileResult.log || '';
            if (compileResult.status === client_1.SubmissionStatus.CE) {
                this.logger.warn(`[${pipeline.submissionId}] 編譯失敗: ${compileResult.status}`);
                return {
                    status: compileResult.status,
                    timeMs,
                    stderr: compileResult.log,
                    shouldAbort: true,
                    message: '編譯失敗',
                };
            }
            const executablePath = this.getExecutablePath(pipeline);
            if (!(await fs.pathExists(executablePath))) {
                this.logger.error(`[${pipeline.submissionId}] 可執行檔不存在: ${executablePath}`);
                return {
                    status: client_1.SubmissionStatus.CE,
                    timeMs,
                    stderr: '編譯完成但找不到可執行檔',
                    shouldAbort: true,
                    message: '編譯錯誤',
                };
            }
            pipeline.compiled = true;
            pipeline.executablePath = executablePath;
            this.logger.log(`[${pipeline.submissionId}] 編譯成功 (耗時: ${timeMs}ms)`);
            return {
                status: client_1.SubmissionStatus.AC,
                timeMs,
                message: '編譯成功',
            };
        }
        catch (error) {
            this.logger.error(`[${pipeline.submissionId}] 編譯階段發生錯誤: ${error.message}`, error.stack);
            return {
                status: client_1.SubmissionStatus.JUDGE_ERROR,
                stderr: error.message,
                shouldAbort: true,
                message: '評測系統錯誤',
            };
        }
    }
    async prepareSource(pipeline) {
        const { submissionType, srcDir, sourceCode, language } = pipeline;
        await fs.ensureDir(srcDir);
        switch (submissionType) {
            case client_1.SubmissionType.SINGLE_FILE:
                try {
                    (0, source_validation_1.validateSingleFileSource)(sourceCode, language, this.getSourceFilename(language), { maxSourceSize: 1024 * 1024 });
                }
                catch (error) {
                    if (error instanceof source_validation_1.SourceValidationError) {
                        this.logger.warn(`[${pipeline.submissionId}] 原始碼驗證失敗: ${error.code} - ${error.message}`);
                        throw new Error(`原始碼驗證失敗: ${error.message}`);
                    }
                    throw error;
                }
                await this.writeSingleFile(pipeline);
                break;
            case client_1.SubmissionType.MULTI_FILE:
                try {
                    const files = await fs.readdir(srcDir);
                    (0, source_validation_1.validateMultiFileNames)(files, language, {
                        skipMainFileCheck: !!pipeline.makefileKey,
                    });
                }
                catch (error) {
                    if (error instanceof source_validation_1.SourceValidationError) {
                        this.logger.warn(`[${pipeline.submissionId}] 多檔案驗證失敗: ${error.code} - ${error.message}`);
                        throw new Error(`多檔案驗證失敗: ${error.message}`);
                    }
                    throw error;
                }
                if (pipeline.makefileKey) {
                    await this.downloadTeacherMakefile(pipeline);
                }
                break;
            case client_1.SubmissionType.FUNCTION_ONLY:
                try {
                    (0, source_validation_1.validateSingleFileSource)(sourceCode, language, undefined, { maxSourceSize: 512 * 1024, allowEmpty: false });
                }
                catch (error) {
                    if (error instanceof source_validation_1.SourceValidationError) {
                        this.logger.warn(`[${pipeline.submissionId}] 函式碼驗證失敗: ${error.code} - ${error.message}`);
                        throw new Error(`函式碼驗證失敗: ${error.message}`);
                    }
                    throw error;
                }
                await this.mergeFunctionTemplate(pipeline);
                break;
        }
    }
    async shouldUseMakefile(pipeline) {
        if (pipeline.submissionType !== client_1.SubmissionType.MULTI_FILE) {
            return false;
        }
        const makefilePath = path.join(pipeline.srcDir, 'Makefile');
        const makefileLower = path.join(pipeline.srcDir, 'makefile');
        const hasMakefile = (await fs.pathExists(makefilePath)) ||
            (await fs.pathExists(makefileLower));
        if (hasMakefile) {
            this.logger.debug(`[${pipeline.submissionId}] 找到 Makefile，將使用 make 編譯`);
        }
        return hasMakefile;
    }
    async downloadTeacherMakefile(pipeline) {
        if (!pipeline.makefileKey) {
            return;
        }
        this.logger.debug(`[${pipeline.submissionId}] 下載老師提供的 Makefile: ${pipeline.makefileKey}`);
        try {
            const makefileContent = await this.minio.getObjectAsString('noj-makefiles', pipeline.makefileKey);
            const makefilePath = path.join(pipeline.srcDir, 'Makefile');
            await fs.writeFile(makefilePath, makefileContent, 'utf-8');
            this.logger.debug(`[${pipeline.submissionId}] 老師 Makefile 已寫入: ${makefilePath}`);
        }
        catch (error) {
            this.logger.error(`[${pipeline.submissionId}] 下載老師 Makefile 失敗: ${error.message}`);
            throw new Error(`無法下載老師提供的 Makefile: ${error.message}`);
        }
    }
    async writeSingleFile(pipeline) {
        const filename = this.getSourceFilename(pipeline.language);
        const filepath = path.join(pipeline.srcDir, filename);
        await fs.writeFile(filepath, pipeline.sourceCode, 'utf-8');
        this.logger.debug(`[${pipeline.submissionId}] 寫入原始碼: ${filepath}`);
    }
    async mergeFunctionTemplate(pipeline) {
        if (!pipeline.templateKey) {
            throw new Error('FUNCTION_ONLY 模式需要提供 templateKey');
        }
        const mergedCode = await this.templateService.mergeTemplate(pipeline.templateKey, pipeline.sourceCode);
        const filename = this.getSourceFilename(pipeline.language);
        const filepath = path.join(pipeline.srcDir, filename);
        await fs.writeFile(filepath, mergedCode, 'utf-8');
        this.logger.debug(`[${pipeline.submissionId}] 模板合併完成: ${filepath}`);
    }
    getSourceFilename(language) {
        const filenameMap = {
            C: 'main.c',
            CPP: 'main.cpp',
            JAVA: 'Main.java',
            PYTHON: 'main.py',
        };
        return filenameMap[language] || 'main.txt';
    }
    getExecutablePath(pipeline) {
        const { buildDir, language } = pipeline;
        if (language === 'JAVA') {
            return path.join(buildDir, 'Main.class');
        }
        if (language === 'PYTHON') {
            return path.join(pipeline.srcDir, 'main.py');
        }
        return path.join(buildDir, 'main');
    }
    validateConfig(config) {
        return null;
    }
};
exports.CompileStage = CompileStage;
exports.CompileStage = CompileStage = CompileStage_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('SANDBOX_RUNNER')),
    __metadata("design:paramtypes", [Object, template_service_1.TemplateService,
        minio_service_1.MinioService])
], CompileStage);
//# sourceMappingURL=compile.stage.js.map