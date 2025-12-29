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
var CheckerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckerService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const minio_service_1 = require("../../minio/minio.service");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
let CheckerService = CheckerService_1 = class CheckerService {
    constructor(minio, sandbox) {
        this.minio = minio;
        this.sandbox = sandbox;
        this.logger = new common_1.Logger(CheckerService_1.name);
    }
    async runChecker(checkerKey, checkerLanguage, input, jobDir) {
        this.logger.debug(`執行 Checker: ${checkerKey} (語言: ${checkerLanguage})`);
        try {
            const checkerCode = await this.minio.getObjectAsString('noj-checkers', checkerKey);
            const checkerDir = path.join(jobDir, 'checker');
            await fs.ensureDir(checkerDir);
            await fs.chmod(checkerDir, 0o777);
            await fs.ensureDir(path.join(checkerDir, 'src'));
            await fs.chmod(path.join(checkerDir, 'src'), 0o777);
            await fs.ensureDir(path.join(checkerDir, 'build'));
            await fs.chmod(path.join(checkerDir, 'build'), 0o777);
            await fs.ensureDir(path.join(checkerDir, 'out'));
            await fs.chmod(path.join(checkerDir, 'out'), 0o777);
            await fs.ensureDir(path.join(checkerDir, 'testdata'));
            await fs.chmod(path.join(checkerDir, 'testdata'), 0o777);
            this.logger.debug(`複製檔案: ${input.inputFile} -> ${path.join(checkerDir, 'src', 'input.txt')}`);
            this.logger.debug(`複製檔案: ${input.outputFile} -> ${path.join(checkerDir, 'src', 'output.txt')}`);
            this.logger.debug(`複製檔案: ${input.answerFile} -> ${path.join(checkerDir, 'src', 'answer.txt')}`);
            const inputExists = await fs.pathExists(input.inputFile);
            const outputExists = await fs.pathExists(input.outputFile);
            const answerExists = await fs.pathExists(input.answerFile);
            this.logger.debug(`檔案存在檢查: input=${inputExists}, output=${outputExists}, answer=${answerExists}`);
            if (!outputExists) {
                const outputContent = await fs.readFile(input.outputFile, 'utf-8').catch(() => '<read error>');
                this.logger.warn(`output file 不存在或內容為: ${outputContent.substring(0, 100)}`);
            }
            await fs.copy(input.inputFile, path.join(checkerDir, 'src', 'input.txt'));
            await fs.copy(input.outputFile, path.join(checkerDir, 'src', 'output.txt'));
            await fs.copy(input.answerFile, path.join(checkerDir, 'src', 'answer.txt'));
            const copiedOutput = await fs.readFile(path.join(checkerDir, 'src', 'output.txt'), 'utf-8').catch(() => '<read error>');
            this.logger.debug(`複製後的 output.txt 內容: "${copiedOutput.substring(0, 200)}"`);
            const sandboxJob = {
                submissionId: `checker-${Date.now()}`,
                jobDir: checkerDir,
            };
            if (checkerLanguage === client_1.ProgrammingLanguage.PYTHON) {
                return await this.runPythonChecker(sandboxJob, checkerCode);
            }
            else {
                return await this.runCompiledChecker(sandboxJob, checkerCode, checkerLanguage);
            }
        }
        catch (error) {
            this.logger.error(`Checker 執行失敗: ${error.message}`, error.stack);
            return {
                passed: false,
                message: `Checker 執行錯誤: ${error.message}`,
                exitCode: -1,
            };
        }
    }
    async runPythonChecker(job, checkerCode) {
        await fs.writeFile(path.join(job.jobDir, 'src', 'checker.py'), checkerCode, 'utf-8');
        const wrapperScript = `
import sys
import os
import json

# 切換到 src 目錄
os.chdir('/work/src')

# 設定 argv 給 checker
sys.argv = ['checker.py', 'input.txt', 'output.txt', 'answer.txt']

# 執行 checker
try:
    exec(compile(open('checker.py').read(), 'checker.py', 'exec'))
    # 如果 checker 沒有明確退出，視為成功
    result = {'exitCode': 0, 'message': 'OK'}
except SystemExit as e:
    # checker 呼叫了 exit()
    code = e.code if isinstance(e.code, int) else (0 if e.code is None else 1)
    result = {'exitCode': code, 'message': str(e.code) if e.code else 'OK'}
except Exception as e:
    result = {'exitCode': 1, 'message': str(e)}

# 輸出結果為 JSON
print(json.dumps(result))
`;
        const scriptResult = await this.sandbox.runScript(job, wrapperScript, '{}');
        return this.parseScriptResult(scriptResult);
    }
    async runCompiledChecker(job, checkerCode, language) {
        const filename = this.getSourceFilename(language);
        await fs.writeFile(path.join(job.jobDir, 'src', filename), checkerCode, 'utf-8');
        this.logger.debug(`[${job.submissionId}] 編譯 Checker (${language})`);
        const compileResult = await this.sandbox.compile(job, language);
        if (compileResult.status === client_1.SubmissionStatus.CE) {
            return {
                passed: false,
                message: `Checker 編譯失敗: ${compileResult.log}`,
                exitCode: 1,
            };
        }
        const runCommand = this.getRunCommand(language);
        const wrapperScript = `
import subprocess
import json
import os

os.chdir('/work/src')

try:
    result = subprocess.run(
        ${JSON.stringify(runCommand)},
        capture_output=True,
        timeout=10,
        cwd='/work/src'
    )
    output = {
        'exitCode': result.returncode,
        'message': result.stdout.decode('utf-8', errors='replace').strip() or
                   result.stderr.decode('utf-8', errors='replace').strip() or
                   ('OK' if result.returncode == 0 else 'Failed')
    }
except subprocess.TimeoutExpired:
    output = {'exitCode': 152, 'message': 'Checker timeout'}
except Exception as e:
    output = {'exitCode': 1, 'message': str(e)}

print(json.dumps(output))
`;
        const scriptResult = await this.sandbox.runScript(job, wrapperScript, '{}');
        return this.parseScriptResult(scriptResult);
    }
    parseScriptResult(result) {
        this.logger.debug(`Checker script output: ${JSON.stringify(result.output)}`);
        this.logger.debug(`Checker script stderr: ${JSON.stringify(result.stderr)}`);
        this.logger.debug(`Checker script exitCode: ${result.exitCode}`);
        if (result.exitCode !== 0 && !result.output) {
            return {
                passed: false,
                message: result.stderr || `Checker 執行失敗 (exitCode: ${result.exitCode})`,
                exitCode: result.exitCode,
            };
        }
        const lines = result.output.trim().split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('{') && line.endsWith('}')) {
                try {
                    const output = JSON.parse(line);
                    if (typeof output.exitCode === 'number') {
                        return {
                            passed: output.exitCode === 0,
                            message: output.message || (output.exitCode === 0 ? 'OK' : 'Failed'),
                            exitCode: output.exitCode,
                        };
                    }
                }
                catch {
                }
            }
        }
        return {
            passed: result.exitCode === 0,
            message: result.output.trim() || result.stderr.trim() || 'Unknown result',
            exitCode: result.exitCode,
        };
    }
    getSourceFilename(language) {
        switch (language) {
            case client_1.ProgrammingLanguage.C:
                return 'main.c';
            case client_1.ProgrammingLanguage.CPP:
                return 'main.cpp';
            case client_1.ProgrammingLanguage.JAVA:
                return 'Main.java';
            case client_1.ProgrammingLanguage.PYTHON:
                return 'main.py';
            default:
                throw new Error(`不支援的 Checker 語言: ${language}`);
        }
    }
    getRunCommand(language) {
        switch (language) {
            case client_1.ProgrammingLanguage.C:
            case client_1.ProgrammingLanguage.CPP:
                return ['/work/build/main', 'input.txt', 'output.txt', 'answer.txt'];
            case client_1.ProgrammingLanguage.JAVA:
                return ['java', '-cp', '/work/build', 'Main', 'input.txt', 'output.txt', 'answer.txt'];
            default:
                throw new Error(`不支援的 Checker 語言: ${language}`);
        }
    }
};
exports.CheckerService = CheckerService;
exports.CheckerService = CheckerService = CheckerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)('SANDBOX_RUNNER')),
    __metadata("design:paramtypes", [minio_service_1.MinioService, Object])
], CheckerService);
//# sourceMappingURL=checker.service.js.map