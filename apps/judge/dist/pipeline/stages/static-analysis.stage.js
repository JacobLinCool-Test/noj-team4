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
var StaticAnalysisStage_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticAnalysisStage = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let StaticAnalysisStage = StaticAnalysisStage_1 = class StaticAnalysisStage {
    constructor(sandbox) {
        this.sandbox = sandbox;
        this.logger = new common_1.Logger(StaticAnalysisStage_1.name);
        this.name = 'StaticAnalysis';
    }
    async execute(context) {
        const { pipeline, stageConfig } = context;
        const config = stageConfig;
        this.logger.log(`[${pipeline.submissionId}] 開始靜態分析階段 (規則數: ${config.rules.length})`);
        try {
            const violations = [];
            let hasError = false;
            for (const rule of config.rules) {
                const ruleViolations = await this.checkRule(rule, pipeline);
                if (ruleViolations.length > 0) {
                    violations.push(...ruleViolations);
                    if (rule.severity === 'error' || !rule.severity) {
                        hasError = true;
                    }
                }
            }
            const shouldFail = hasError && config.failOnError !== false;
            if (shouldFail) {
                this.logger.warn(`[${pipeline.submissionId}] 靜態分析發現 ${violations.filter((v) => v.severity === 'error').length} 個錯誤`);
            }
            const status = shouldFail ? client_1.SubmissionStatus.SA : client_1.SubmissionStatus.AC;
            return {
                status,
                details: {
                    violations,
                    errorCount: violations.filter((v) => v.severity === 'error').length,
                    warningCount: violations.filter((v) => v.severity === 'warning')
                        .length,
                },
                stderr: shouldFail ? this.formatViolations(violations) : undefined,
                shouldAbort: shouldFail,
                message: shouldFail
                    ? `靜態分析失敗 (${violations.filter((v) => v.severity === 'error').length} 個錯誤)`
                    : `靜態分析通過 (${violations.length} 個警告)`,
            };
        }
        catch (error) {
            this.logger.error(`[${pipeline.submissionId}] 靜態分析階段發生錯誤: ${error.message}`, error.stack);
            return {
                status: client_1.SubmissionStatus.JUDGE_ERROR,
                stderr: error.message,
                shouldAbort: true,
                message: '評測系統錯誤',
            };
        }
    }
    async checkRule(rule, pipeline) {
        switch (rule.type) {
            case 'forbidden-function':
                return this.checkForbiddenFunction(rule, pipeline);
            case 'forbidden-library':
                return this.checkForbiddenLibrary(rule, pipeline);
            case 'forbidden-syntax':
                return this.checkForbiddenSyntax(rule, pipeline);
            case 'forbidden-keyword':
                return this.checkForbiddenKeyword(rule, pipeline);
            case 'linter':
                return this.runLinter(rule, pipeline);
            default:
                this.logger.warn(`未知的規則類型: ${rule.type}`);
                return [];
        }
    }
    async checkForbiddenFunction(rule, pipeline) {
        const violations = [];
        const { forbiddenFunctions = [] } = rule.config;
        const sourceCode = pipeline.sourceCode || '';
        for (const func of forbiddenFunctions) {
            const pattern = new RegExp(`\\b${this.escapeRegex(func)}\\s*\\(`, 'g');
            let match;
            while ((match = pattern.exec(sourceCode)) !== null) {
                violations.push({
                    rule: rule.type,
                    severity: rule.severity,
                    message: `不允許使用函式: ${func}`,
                    line: this.getLineNumber(sourceCode, match.index),
                    column: match.index,
                });
            }
        }
        return violations;
    }
    async checkForbiddenLibrary(rule, pipeline) {
        const violations = [];
        const { forbiddenLibraries = [] } = rule.config;
        const sourceCode = pipeline.sourceCode || '';
        for (const lib of forbiddenLibraries) {
            const includePattern = new RegExp(`#include\\s*[<"]${this.escapeRegex(lib)}[>"]`, 'g');
            const importPattern = new RegExp(`^\\s*(?:import|from)\\s+${this.escapeRegex(lib)}\\b`, 'gm');
            let match;
            while ((match = includePattern.exec(sourceCode)) ||
                (match = importPattern.exec(sourceCode))) {
                violations.push({
                    rule: rule.type,
                    severity: rule.severity,
                    message: `不允許使用函式庫: ${lib}`,
                    line: this.getLineNumber(sourceCode, match.index),
                    column: match.index,
                });
            }
        }
        return violations;
    }
    async checkForbiddenSyntax(rule, pipeline) {
        const violations = [];
        const { forbiddenPatterns = [] } = rule.config;
        const sourceCode = pipeline.sourceCode || '';
        for (const pattern of forbiddenPatterns) {
            const regex = new RegExp(pattern.pattern, pattern.flags || 'g');
            let match;
            while ((match = regex.exec(sourceCode)) !== null) {
                violations.push({
                    rule: rule.type,
                    severity: rule.severity,
                    message: pattern.message || `不允許使用的語法: ${pattern.pattern}`,
                    line: this.getLineNumber(sourceCode, match.index),
                    column: match.index,
                });
            }
        }
        return violations;
    }
    async checkForbiddenKeyword(rule, pipeline) {
        const violations = [];
        const keywords = rule.keywords || [];
        const message = rule.message || '不允許使用的關鍵字';
        const sourceCode = pipeline.sourceCode || '';
        const codeWithoutStringsAndComments = this.removeStringsAndComments(sourceCode, pipeline.language);
        for (const keyword of keywords) {
            const pattern = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'g');
            let match;
            while ((match = pattern.exec(codeWithoutStringsAndComments)) !== null) {
                violations.push({
                    rule: rule.type,
                    severity: rule.severity || 'error',
                    message: `${message}: ${keyword}`,
                    line: this.getLineNumber(sourceCode, match.index),
                    column: match.index,
                });
            }
        }
        if (violations.length > 0) {
            this.logger.debug(`[${pipeline.submissionId}] 發現 ${violations.length} 個禁用關鍵字`);
        }
        return violations;
    }
    removeStringsAndComments(code, language) {
        let result = code;
        if (language === 'PYTHON') {
            result = result.replace(/'''[\s\S]*?'''/g, '');
            result = result.replace(/"""[\s\S]*?"""/g, '');
            result = result.replace(/'(?:[^'\\]|\\.)*'/g, '');
            result = result.replace(/"(?:[^"\\]|\\.)*"/g, '');
            result = result.replace(/#.*/g, '');
        }
        else if (language === 'C' || language === 'CPP' || language === 'JAVA') {
            result = result.replace(/"(?:[^"\\]|\\.)*"/g, '');
            result = result.replace(/'(?:[^'\\]|\\.)*'/g, '');
            result = result.replace(/\/\*[\s\S]*?\*\//g, '');
            result = result.replace(/\/\/.*/g, '');
        }
        return result;
    }
    async runLinter(rule, pipeline) {
        const violations = [];
        try {
            const lintResult = await this.sandbox.lint({
                submissionId: pipeline.submissionId,
                jobDir: pipeline.jobDir,
            }, pipeline.language);
            const lintOutput = lintResult.output;
            if (pipeline.language === 'PYTHON') {
                violations.push(...this.parsePylintOutput(lintOutput, rule.severity));
            }
            else if (pipeline.language === 'C' || pipeline.language === 'CPP') {
                violations.push(...this.parseClangTidyOutput(lintOutput, rule.severity));
            }
            this.logger.debug(`[${pipeline.submissionId}] Linter 發現 ${violations.length} 個問題`);
        }
        catch (error) {
            this.logger.warn(`[${pipeline.submissionId}] Linter 執行失敗: ${error.message}`);
        }
        return violations;
    }
    parsePylintOutput(output, defaultSeverity) {
        const violations = [];
        try {
            const results = JSON.parse(output);
            if (!Array.isArray(results))
                return [];
            for (const item of results) {
                violations.push({
                    rule: 'linter',
                    severity: item.type === 'error' || item.type === 'fatal' ? 'error' : defaultSeverity,
                    message: `[${item['message-id']}] ${item.message}`,
                    line: item.line,
                    column: item.column,
                    symbol: item.symbol,
                });
            }
        }
        catch (error) {
            this.logger.debug(`無法解析 pylint 輸出: ${error.message}`);
        }
        return violations;
    }
    parseClangTidyOutput(output, defaultSeverity) {
        const violations = [];
        const lines = output.split('\n');
        const pattern = /^(.+?):(\d+):(\d+):\s*(warning|error|note):\s*(.+)$/;
        for (const line of lines) {
            const match = line.match(pattern);
            if (match) {
                const [, , lineNum, column, severity, message] = match;
                violations.push({
                    rule: 'linter',
                    severity: severity === 'error' ? 'error' : defaultSeverity,
                    message: message,
                    line: parseInt(lineNum, 10),
                    column: parseInt(column, 10),
                });
            }
        }
        return violations;
    }
    formatViolations(violations) {
        return violations
            .map((v) => `[${v.severity.toUpperCase()}] Line ${v.line || '?'}: ${v.message}`)
            .join('\n');
    }
    getLineNumber(source, index) {
        return source.substring(0, index).split('\n').length;
    }
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    validateConfig(config) {
        const cfg = config;
        if (!cfg.rules || cfg.rules.length === 0) {
            return '必須提供至少一個規則';
        }
        return null;
    }
};
exports.StaticAnalysisStage = StaticAnalysisStage;
exports.StaticAnalysisStage = StaticAnalysisStage = StaticAnalysisStage_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('SANDBOX_RUNNER')),
    __metadata("design:paramtypes", [Object])
], StaticAnalysisStage);
//# sourceMappingURL=static-analysis.stage.js.map