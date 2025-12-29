import { Injectable, Logger, Inject } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PipelineStage } from './pipeline-stage.interface';
import { StageContext } from '../types/stage-context.interface';
import { StageResult } from '../types/stage-result.interface';
import { StaticAnalysisStageConfig } from '../types/pipeline-config.interface';
import { SandboxRunner } from '../../sandbox/sandbox.runner';

/**
 * 靜態分析階段
 * 負責在程式執行前進行靜態分析
 * 包括：禁用函式/函式庫檢查、語法檢查、Linter 等
 */
@Injectable()
export class StaticAnalysisStage implements PipelineStage {
  private readonly logger = new Logger(StaticAnalysisStage.name);
  readonly name = 'StaticAnalysis';

  constructor(
    @Inject('SANDBOX_RUNNER') private readonly sandbox: SandboxRunner,
  ) {}

  async execute(context: StageContext): Promise<StageResult> {
    const { pipeline, stageConfig } = context;
    const config = stageConfig as StaticAnalysisStageConfig;

    this.logger.log(
      `[${pipeline.submissionId}] 開始靜態分析階段 (規則數: ${config.rules.length})`,
    );

    try {
      const violations: any[] = [];
      let hasError = false;

      // 執行所有規則
      for (const rule of config.rules) {
        const ruleViolations = await this.checkRule(rule, pipeline);

        if (ruleViolations.length > 0) {
          violations.push(...ruleViolations);

          // 如果規則的 severity 是 'error' 或未指定（預設為 error），則標記有錯誤
          if (rule.severity === 'error' || !rule.severity) {
            hasError = true;
          }
        }
      }

      // 判斷是否應該失敗
      const shouldFail = hasError && config.failOnError !== false;

      if (shouldFail) {
        this.logger.warn(
          `[${pipeline.submissionId}] 靜態分析發現 ${violations.filter((v) => v.severity === 'error').length} 個錯誤`,
        );
      }

      const status = shouldFail ? SubmissionStatus.SA : SubmissionStatus.AC;

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
    } catch (error) {
      this.logger.error(
        `[${pipeline.submissionId}] 靜態分析階段發生錯誤: ${error.message}`,
        error.stack,
      );
      return {
        status: SubmissionStatus.JUDGE_ERROR,
        stderr: error.message,
        shouldAbort: true,
        message: '評測系統錯誤',
      };
    }
  }

  /**
   * 檢查單一規則
   */
  private async checkRule(rule: any, pipeline: any): Promise<any[]> {
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

  /**
   * 檢查禁用函式
   */
  private async checkForbiddenFunction(
    rule: any,
    pipeline: any,
  ): Promise<any[]> {
    const violations: any[] = [];
    const { forbiddenFunctions = [] } = rule.config;

    // TODO: 實作更精確的 AST 分析
    // 目前使用簡單的字串搜尋
    const sourceCode = pipeline.sourceCode || '';

    for (const func of forbiddenFunctions) {
      // 使用正規表達式搜尋函式呼叫
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

  /**
   * 檢查禁用函式庫
   */
  private async checkForbiddenLibrary(
    rule: any,
    pipeline: any,
  ): Promise<any[]> {
    const violations: any[] = [];
    const { forbiddenLibraries = [] } = rule.config;

    const sourceCode = pipeline.sourceCode || '';

    for (const lib of forbiddenLibraries) {
      // 檢查 C/C++ #include
      const includePattern = new RegExp(
        `#include\\s*[<"]${this.escapeRegex(lib)}[>"]`,
        'g',
      );

      // 檢查 Python import
      const importPattern = new RegExp(
        `^\\s*(?:import|from)\\s+${this.escapeRegex(lib)}\\b`,
        'gm',
      );

      let match;
      while (
        (match = includePattern.exec(sourceCode)) ||
        (match = importPattern.exec(sourceCode))
      ) {
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

  /**
   * 檢查禁用語法
   */
  private async checkForbiddenSyntax(
    rule: any,
    pipeline: any,
  ): Promise<any[]> {
    const violations: any[] = [];
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

  /**
   * 檢查禁用關鍵字
   * 用於禁止使用特定語言關鍵字（如 for, while, do 等）
   */
  private async checkForbiddenKeyword(
    rule: any,
    pipeline: any,
  ): Promise<any[]> {
    const violations: any[] = [];
    const keywords: string[] = rule.keywords || [];
    const message = rule.message || '不允許使用的關鍵字';

    const sourceCode = pipeline.sourceCode || '';

    // 移除字串和註解以避免誤判
    const codeWithoutStringsAndComments = this.removeStringsAndComments(sourceCode, pipeline.language);

    for (const keyword of keywords) {
      // 使用 word boundary 確保是完整的關鍵字，不是變數名稱的一部分
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
      this.logger.debug(
        `[${pipeline.submissionId}] 發現 ${violations.length} 個禁用關鍵字`,
      );
    }

    return violations;
  }

  /**
   * 移除字串和註解（避免在字串或註解中誤判關鍵字）
   */
  private removeStringsAndComments(code: string, language: string): string {
    let result = code;

    if (language === 'PYTHON') {
      // 移除 Python 字串（單引號、雙引號、三引號）
      result = result.replace(/'''[\s\S]*?'''/g, '');
      result = result.replace(/"""[\s\S]*?"""/g, '');
      result = result.replace(/'(?:[^'\\]|\\.)*'/g, '');
      result = result.replace(/"(?:[^"\\]|\\.)*"/g, '');
      // 移除 Python 註解
      result = result.replace(/#.*/g, '');
    } else if (language === 'C' || language === 'CPP' || language === 'JAVA') {
      // 移除 C/C++/Java 字串
      result = result.replace(/"(?:[^"\\]|\\.)*"/g, '');
      result = result.replace(/'(?:[^'\\]|\\.)*'/g, '');
      // 移除多行註解
      result = result.replace(/\/\*[\s\S]*?\*\//g, '');
      // 移除單行註解
      result = result.replace(/\/\/.*/g, '');
    }

    return result;
  }

  /**
   * 執行 Linter
   */
  private async runLinter(rule: any, pipeline: any): Promise<any[]> {
    const violations: any[] = [];

    try {
      // 使用沙箱執行 linter
      const lintResult = await this.sandbox.lint(
        {
          submissionId: pipeline.submissionId,
          jobDir: pipeline.jobDir,
        },
        pipeline.language,
      );

      // 解析 linter 輸出
      const lintOutput = lintResult.output;

      if (pipeline.language === 'PYTHON') {
        // 解析 pylint JSON 輸出
        violations.push(...this.parsePylintOutput(lintOutput, rule.severity));
      } else if (pipeline.language === 'C' || pipeline.language === 'CPP') {
        // 解析 clang-tidy 輸出
        violations.push(...this.parseClangTidyOutput(lintOutput, rule.severity));
      }

      this.logger.debug(
        `[${pipeline.submissionId}] Linter 發現 ${violations.length} 個問題`,
      );
    } catch (error) {
      this.logger.warn(
        `[${pipeline.submissionId}] Linter 執行失敗: ${error.message}`,
      );
      // Linter 執行失敗不應該阻止評測流程
    }

    return violations;
  }

  /**
   * 解析 pylint JSON 輸出
   */
  private parsePylintOutput(output: string, defaultSeverity: string): any[] {
    const violations: any[] = [];

    try {
      const results = JSON.parse(output);
      if (!Array.isArray(results)) return [];

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
    } catch (error) {
      // JSON 解析失敗，可能輸出不是 JSON 格式
      this.logger.debug(`無法解析 pylint 輸出: ${error.message}`);
    }

    return violations;
  }

  /**
   * 解析 clang-tidy 輸出
   */
  private parseClangTidyOutput(output: string, defaultSeverity: string): any[] {
    const violations: any[] = [];

    // clang-tidy 輸出格式：filename:line:column: severity: message
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

  /**
   * 格式化違規資訊
   */
  private formatViolations(violations: any[]): string {
    return violations
      .map(
        (v) =>
          `[${v.severity.toUpperCase()}] Line ${v.line || '?'}: ${v.message}`,
      )
      .join('\n');
  }

  /**
   * 取得行號
   */
  private getLineNumber(source: string, index: number): number {
    return source.substring(0, index).split('\n').length;
  }

  /**
   * 跳脫正規表達式特殊字元
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  validateConfig(config: Record<string, any>): string | null {
    const cfg = config as StaticAnalysisStageConfig;
    if (!cfg.rules || cfg.rules.length === 0) {
      return '必須提供至少一個規則';
    }
    return null;
  }
}
