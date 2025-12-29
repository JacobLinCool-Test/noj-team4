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
var InteractiveStage_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractiveStage = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const minio_service_1 = require("../../minio/minio.service");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
let InteractiveStage = InteractiveStage_1 = class InteractiveStage {
    constructor(sandbox, minio) {
        this.sandbox = sandbox;
        this.minio = minio;
        this.logger = new common_1.Logger(InteractiveStage_1.name);
        this.name = 'Interactive';
    }
    async execute(context) {
        const { pipeline, stageConfig } = context;
        const config = stageConfig;
        this.logger.log(`[${pipeline.submissionId}] 開始互動式評測階段`);
        if (!pipeline.compiled) {
            return {
                status: client_1.SubmissionStatus.JUDGE_ERROR,
                stderr: '程式尚未編譯',
                shouldAbort: true,
                message: '評測系統錯誤',
            };
        }
        try {
            const interactorReady = await this.prepareInteractor(pipeline, config);
            if (!interactorReady) {
                return {
                    status: client_1.SubmissionStatus.JUDGE_ERROR,
                    stderr: '無法準備互動器',
                    shouldAbort: true,
                    message: '評測系統錯誤',
                };
            }
            const testCases = await this.prepareTestCases(pipeline, config);
            const results = [];
            let totalTimeMs = 0;
            let maxMemoryKb = 0;
            for (let i = 0; i < testCases.length; i++) {
                const testCase = testCases[i];
                this.logger.debug(`[${pipeline.submissionId}] 執行互動式測試案例 ${i + 1}/${testCases.length}: ${testCase.name}`);
                const runResult = await this.runInteractiveCase(pipeline, config, testCase, i);
                const result = {
                    caseNo: i,
                    name: testCase.name,
                    isSample: testCase.isSample,
                    status: runResult.status,
                    timeMs: runResult.timeMs,
                    memoryKb: runResult.memoryKb,
                    stdout: runResult.stdout,
                    stderr: runResult.stderr,
                    points: testCase.points,
                };
                results.push(result);
                if (runResult.timeMs) {
                    totalTimeMs += runResult.timeMs;
                }
                if (runResult.memoryKb && runResult.memoryKb > maxMemoryKb) {
                    maxMemoryKb = runResult.memoryKb;
                }
                if (runResult.status !== client_1.SubmissionStatus.AC) {
                    this.logger.warn(`[${pipeline.submissionId}] 互動式測試案例 ${i + 1} 結果: ${runResult.status}`);
                }
            }
            pipeline.testCaseResults = results;
            const overallStatus = this.determineOverallStatus(results);
            this.logger.log(`[${pipeline.submissionId}] 互動式評測完成 (狀態: ${overallStatus}, 總耗時: ${totalTimeMs}ms)`);
            return {
                status: overallStatus,
                timeMs: totalTimeMs,
                memoryKb: maxMemoryKb,
                details: {
                    testCaseCount: testCases.length,
                    passedCount: results.filter((r) => r.status === client_1.SubmissionStatus.AC)
                        .length,
                },
                message: `互動式評測完成 (${results.filter((r) => r.status === client_1.SubmissionStatus.AC).length}/${testCases.length} 通過)`,
            };
        }
        catch (error) {
            this.logger.error(`[${pipeline.submissionId}] 互動式評測階段發生錯誤: ${error.message}`, error.stack);
            return {
                status: client_1.SubmissionStatus.JUDGE_ERROR,
                stderr: error.message,
                shouldAbort: true,
                message: '評測系統錯誤',
            };
        }
    }
    async prepareInteractor(pipeline, config) {
        if (!config.interactorKey) {
            this.logger.error(`[${pipeline.submissionId}] 未提供互動器腳本`);
            return false;
        }
        try {
            const interactorCode = await this.minio.getObjectAsString('noj-problems', config.interactorKey);
            const interactorDir = path.join(pipeline.jobDir, 'src', 'interactor');
            await fs.ensureDir(interactorDir);
            const srcFileName = this.getSourceFileName(config.interactorLanguage);
            const srcPath = path.join(interactorDir, srcFileName);
            await fs.writeFile(srcPath, interactorCode);
            if (this.needsCompilation(config.interactorLanguage)) {
                const compileResult = await this.compileInteractor(pipeline, config.interactorLanguage, interactorDir);
                if (!compileResult) {
                    return false;
                }
            }
            pipeline.stageData.set('interactorDir', interactorDir);
            pipeline.stageData.set('interactorLanguage', config.interactorLanguage);
            return true;
        }
        catch (error) {
            this.logger.error(`[${pipeline.submissionId}] 準備互動器失敗: ${error.message}`);
            return false;
        }
    }
    async compileInteractor(pipeline, language, interactorDir) {
        const srcDir = interactorDir;
        const buildDir = path.join(interactorDir, 'build');
        await fs.ensureDir(buildDir);
        try {
            const job = {
                submissionId: `${pipeline.submissionId}-interactor`,
                jobDir: interactorDir,
            };
            await fs.ensureDir(path.join(interactorDir, 'src'));
            await fs.ensureDir(path.join(interactorDir, 'build'));
            await fs.ensureDir(path.join(interactorDir, 'out'));
            const srcFileName = this.getSourceFileName(language);
            const srcPath = path.join(interactorDir, srcFileName);
            const destPath = path.join(interactorDir, 'src', srcFileName);
            await fs.copy(srcPath, destPath);
            const result = await this.sandbox.compile(job, language);
            if (result.status === client_1.SubmissionStatus.CE) {
                this.logger.error(`[${pipeline.submissionId}] 互動器編譯失敗: ${result.log}`);
                return false;
            }
            return true;
        }
        catch (error) {
            this.logger.error(`[${pipeline.submissionId}] 互動器編譯錯誤: ${error.message}`);
            return false;
        }
    }
    async prepareTestCases(pipeline, config) {
        if (pipeline.testdataManifest) {
            return this.loadTestdataCases(pipeline, config);
        }
        if (pipeline.sampleCases && pipeline.sampleCases.length > 0) {
            return pipeline.sampleCases.map((sampleCase, i) => ({
                name: `Sample ${i + 1}`,
                input: sampleCase.input,
                expectedOutput: sampleCase.output,
                isSample: true,
                timeLimitMs: config.timeLimitMs || 5000,
                memoryLimitKb: config.memoryLimitKb || 262144,
            }));
        }
        throw new Error('沒有可用的測試案例');
    }
    async loadTestdataCases(pipeline, config) {
        const { testdataManifest, testdataDir } = pipeline;
        const cases = [];
        for (const testCase of testdataManifest.cases) {
            const inputPath = path.join(testdataDir, testCase.inputFile);
            const input = await fs.readFile(inputPath, 'utf-8');
            let expectedOutput = '';
            if (testCase.outputFile) {
                const outputPath = path.join(testdataDir, testCase.outputFile);
                try {
                    expectedOutput = await fs.readFile(outputPath, 'utf-8');
                }
                catch {
                }
            }
            cases.push({
                name: testCase.name,
                input,
                expectedOutput,
                isSample: testCase.isSample,
                timeLimitMs: testCase.timeLimitMs || testdataManifest.defaultTimeLimitMs || config.timeLimitMs || 5000,
                memoryLimitKb: testCase.memoryLimitKb || testdataManifest.defaultMemoryLimitKb || config.memoryLimitKb || 262144,
                points: testCase.points,
            });
        }
        return cases;
    }
    async runInteractiveCase(pipeline, config, testCase, caseIndex) {
        const interactorDir = pipeline.stageData.get('interactorDir');
        const interactorLanguage = pipeline.stageData.get('interactorLanguage');
        const interactionInput = {
            testCase: testCase.input,
            expectedOutput: testCase.expectedOutput,
            submissionId: pipeline.submissionId,
            caseIndex,
            timeLimitMs: testCase.timeLimitMs,
        };
        try {
            const result = await this.sandbox.runScript({
                submissionId: `${pipeline.submissionId}-interactive-${caseIndex}`,
                jobDir: pipeline.jobDir,
            }, this.generateInteractiveWrapperScript(pipeline, interactorDir, interactorLanguage, testCase), JSON.stringify(interactionInput));
            return this.parseInteractorResult(result);
        }
        catch (error) {
            this.logger.error(`[${pipeline.submissionId}] 互動式測試案例 ${caseIndex} 執行失敗: ${error.message}`);
            return {
                status: client_1.SubmissionStatus.JUDGE_ERROR,
                stderr: error.message,
            };
        }
    }
    generateInteractiveWrapperScript(pipeline, interactorDir, interactorLanguage, testCase) {
        return `
import subprocess
import sys
import json
import threading
import queue
import time
import os
import signal

def run_interactive():
    input_data = json.load(sys.stdin)
    test_case = input_data.get('testCase', '')
    time_limit_ms = input_data.get('timeLimitMs', 5000)
    time_limit_s = time_limit_ms / 1000.0

    # 啟動學生程式
    student_cmd = ${this.getStudentCommand(pipeline)}

    # 啟動互動器
    interactor_cmd = ${this.getInteractorCommand(interactorDir, interactorLanguage)}

    try:
        # 啟動兩個程序
        # Discard student stderr to prevent JVM warnings from interfering
        student = subprocess.Popen(
            student_cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            shell=True,
        )

        interactor = subprocess.Popen(
            interactor_cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
        )

        # 發送測試資料給互動器
        interactor.stdin.write(test_case.encode())
        interactor.stdin.flush()

        # 雙向連接互動器和學生程式
        start_time = time.time()

        def forward_io(src, dst, name):
            try:
                while True:
                    data = src.read(1)
                    if not data:
                        break
                    dst.write(data)
                    dst.flush()
            except:
                pass

        # 建立雙向通道
        t1 = threading.Thread(target=forward_io, args=(interactor.stdout, student.stdin, 'i->s'))
        t2 = threading.Thread(target=forward_io, args=(student.stdout, interactor.stdin, 's->i'))
        t1.daemon = True
        t2.daemon = True
        t1.start()
        t2.start()

        # 等待互動器完成（它會決定結果）
        try:
            interactor.wait(timeout=time_limit_s)
        except subprocess.TimeoutExpired:
            student.kill()
            interactor.kill()
            print(json.dumps({
                'status': 'TLE',
                'message': 'Time limit exceeded'
            }))
            return

        elapsed = time.time() - start_time

        # 讀取互動器的 stderr（包含評測結果）
        interactor_stderr = interactor.stderr.read().decode('utf-8', errors='replace')
        # student stderr is discarded (DEVNULL) to prevent JVM warnings from interfering
        student_stderr = ''

        # 解析互動器結果
        result = {
            'status': 'AC' if interactor.returncode == 0 else 'WA',
            'timeMs': int(elapsed * 1000),
            'interactorOutput': interactor_stderr,
            'studentStderr': student_stderr,
        }

        # 如果互動器返回非零值，可能是 WA 或其他錯誤
        if interactor.returncode == 1:
            result['status'] = 'WA'
        elif interactor.returncode == 2:
            result['status'] = 'PE'  # Presentation Error
        elif interactor.returncode != 0:
            result['status'] = 'JUDGE_ERROR'

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            'status': 'JUDGE_ERROR',
            'message': str(e)
        }))

if __name__ == '__main__':
    run_interactive()
`;
    }
    getStudentCommand(pipeline) {
        const buildDir = '/work/build';
        const srcDir = '/work/src';
        switch (pipeline.language) {
            case 'PYTHON':
                return `'python3 ${srcDir}/main.py'`;
            case 'C':
            case 'CPP':
                return `'${buildDir}/main'`;
            case 'JAVA':
                return `'java -Xlog:gc=off -cp ${buildDir} Main'`;
            default:
                return `'echo "Unsupported language"'`;
        }
    }
    getInteractorCommand(interactorDir, language) {
        const interactorSrcDir = '/work/src/interactor';
        const interactorBuildDir = '/work/build/interactor';
        switch (language) {
            case 'PYTHON':
                return `'python3 ${interactorSrcDir}/main.py'`;
            case 'C':
            case 'CPP':
                return `'${interactorBuildDir}/main'`;
            case 'JAVA':
                return `'java -cp ${interactorBuildDir} Main'`;
            default:
                return `'echo "Unsupported language"'`;
        }
    }
    parseInteractorResult(result) {
        try {
            const parsed = JSON.parse(result.output);
            const statusMap = {
                AC: client_1.SubmissionStatus.AC,
                WA: client_1.SubmissionStatus.WA,
                TLE: client_1.SubmissionStatus.TLE,
                MLE: client_1.SubmissionStatus.MLE,
                RE: client_1.SubmissionStatus.RE,
                PE: client_1.SubmissionStatus.WA,
                JUDGE_ERROR: client_1.SubmissionStatus.JUDGE_ERROR,
            };
            return {
                status: statusMap[parsed.status] || client_1.SubmissionStatus.JUDGE_ERROR,
                timeMs: parsed.timeMs,
                stdout: parsed.interactorOutput,
                stderr: parsed.studentStderr || result.stderr,
            };
        }
        catch (error) {
            return {
                status: client_1.SubmissionStatus.JUDGE_ERROR,
                stderr: `無法解析互動器結果: ${result.output}`,
            };
        }
    }
    determineOverallStatus(results) {
        const executionErrors = ['TLE', 'MLE', 'RE', 'OLE', 'CE', 'JUDGE_ERROR'];
        for (const result of results) {
            if (executionErrors.includes(result.status)) {
                return result.status;
            }
        }
        if (results.every((r) => r.status === client_1.SubmissionStatus.AC)) {
            return client_1.SubmissionStatus.AC;
        }
        return client_1.SubmissionStatus.WA;
    }
    getSourceFileName(language) {
        switch (language) {
            case 'C':
                return 'main.c';
            case 'CPP':
                return 'main.cpp';
            case 'JAVA':
                return 'Main.java';
            case 'PYTHON':
                return 'main.py';
            default:
                throw new Error(`Unsupported language: ${language}`);
        }
    }
    needsCompilation(language) {
        return ['C', 'CPP', 'JAVA'].includes(language);
    }
    validateConfig(config) {
        const cfg = config;
        if (!cfg.interactorKey) {
            return '必須提供互動器腳本 (interactorKey)';
        }
        if (!cfg.interactorLanguage) {
            return '必須指定互動器語言 (interactorLanguage)';
        }
        return null;
    }
};
exports.InteractiveStage = InteractiveStage;
exports.InteractiveStage = InteractiveStage = InteractiveStage_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('SANDBOX_RUNNER')),
    __metadata("design:paramtypes", [Object, minio_service_1.MinioService])
], InteractiveStage);
//# sourceMappingURL=interactive.stage.js.map