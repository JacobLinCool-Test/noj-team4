import { Injectable, Logger } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PipelineStage } from './pipeline-stage.interface';
import { StageContext } from '../types/stage-context.interface';
import { StageResult } from '../types/stage-result.interface';
import { CheckStageConfig } from '../types/pipeline-config.interface';
import { TestCaseResult } from '../types/stage-context.interface';
import { CheckerService } from '../checker/checker.service';
import * as path from 'path';

/**
 * 檢查階段
 * 負責比對程式輸出和預期輸出
 * 支援兩種模式：
 * 1. diff: 傳統字串比對
 * 2. custom-checker: 自訂檢查腳本
 */
@Injectable()
export class CheckStage implements PipelineStage {
  private readonly logger = new Logger(CheckStage.name);
  readonly name = 'Check';

  constructor(private readonly checkerService: CheckerService) {}

  async execute(context: StageContext): Promise<StageResult> {
    const { pipeline, stageConfig } = context;
    const config = stageConfig as CheckStageConfig;

    this.logger.log(
      `[${pipeline.submissionId}] 開始檢查階段 (模式: ${config.mode})`,
    );

    if (!pipeline.testCaseResults || pipeline.testCaseResults.length === 0) {
      return {
        status: SubmissionStatus.JUDGE_ERROR,
        stderr: '沒有測試案例結果需要檢查',
        shouldAbort: true,
        message: '評測系統錯誤',
      };
    }

    try {
      let totalPassed = 0;
      let totalScore = 0;
      let maxScore = 0;

      // 檢查每個測試案例的輸出
      for (const testCase of pipeline.testCaseResults) {
        // 如果執行階段已經失敗（TLE, MLE, RE等），不需要再檢查輸出
        // RUNNING 和 AC 狀態的案例需要檢查輸出
        const failureStatuses: string[] = ['TLE', 'MLE', 'RE', 'CE', 'OLE', 'JUDGE_ERROR'];
        if (failureStatuses.includes(testCase.status)) {
          this.logger.debug(
            `[${pipeline.submissionId}] 測試案例 ${testCase.name}: 跳過檢查 (狀態: ${testCase.status})`,
          );
          continue;
        }

        // 執行檢查
        let checkResult: { passed: boolean; message?: string };
        if (config.mode === 'custom-checker') {
          checkResult = await this.runCustomChecker(testCase, config, pipeline);
        } else {
          checkResult = this.diffCheck(testCase, config);
        }

        // 更新測試案例狀態
        if (checkResult.passed) {
          testCase.status = SubmissionStatus.AC;
          totalPassed++;
          if (testCase.points) {
            totalScore += testCase.points;
          }
        } else {
          testCase.status = SubmissionStatus.WA;
        }

        if (testCase.points) {
          maxScore += testCase.points;
        }

        this.logger.debug(
          `[${pipeline.submissionId}] 測試案例 ${testCase.name}: ${testCase.status}`,
        );
      }

      // 判斷整體狀態
      // 規則：
      // 1. 全部 AC → AC
      // 2. 有部分 AC → PA (Partially Accepted)
      // 3. 全部失敗 → 最嚴重的錯誤狀態
      const totalCount = pipeline.testCaseResults.length;
      let overallStatus: SubmissionStatus;

      if (totalPassed === totalCount) {
        // 全部通過
        overallStatus = SubmissionStatus.AC;
      } else if (totalPassed > 0) {
        // 部分通過 → PA
        overallStatus = SubmissionStatus.PA;
      } else {
        // 全部失敗，找出最嚴重的錯誤
        // 優先級：JUDGE_ERROR > TLE > MLE > RE > OLE > WA
        overallStatus = SubmissionStatus.WA;
        const statusPriority: Record<string, number> = {
          JUDGE_ERROR: 6,
          TLE: 5,
          MLE: 4,
          RE: 3,
          OLE: 2,
          WA: 1,
          AC: 0,
        };

        for (const testCase of pipeline.testCaseResults) {
          const currentPriority = statusPriority[overallStatus] ?? 0;
          const casePriority = statusPriority[testCase.status] ?? 0;
          if (casePriority > currentPriority) {
            overallStatus = testCase.status as SubmissionStatus;
          }
        }
      }

      // 將分數存入 stageData，供 pipeline.executor 讀取
      pipeline.stageData.set('rawScore', totalScore);
      pipeline.stageData.set('finalScore', totalScore);
      pipeline.stageData.set('maxScore', maxScore);

      this.logger.log(
        `[${pipeline.submissionId}] 檢查階段完成 (狀態: ${overallStatus}, 通過: ${totalPassed}/${totalCount}, 分數: ${totalScore}/${maxScore})`,
      );

      return {
        status: overallStatus,
        details: {
          passedCount: totalPassed,
          totalCount: totalCount,
          score: totalScore,
          maxScore: maxScore,
        },
        message: `檢查完成 (${totalPassed}/${totalCount} 通過)`,
      };
    } catch (error) {
      this.logger.error(
        `[${pipeline.submissionId}] 檢查階段發生錯誤: ${error.message}`,
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
   * Diff 檢查（字串比對）
   */
  private diffCheck(
    testCase: TestCaseResult,
    config: CheckStageConfig,
  ): { passed: boolean; message?: string } {
    let actual = testCase.stdout || '';
    let expected = testCase.expectedOutput || '';

    // 處理空白字元
    if (config.ignoreWhitespace !== false) {
      // 預設忽略行尾空白和多餘換行
      actual = this.normalizeWhitespace(actual);
      expected = this.normalizeWhitespace(expected);
    }

    // 處理大小寫
    if (config.caseSensitive === false) {
      actual = actual.toLowerCase();
      expected = expected.toLowerCase();
    }

    const passed = actual === expected;

    if (!passed) {
      this.logger.debug(
        `輸出不符:\n期望: ${this.truncate(expected, 200)}\n實際: ${this.truncate(actual, 200)}`,
      );
    }

    return { passed };
  }

  /**
   * 自訂 Checker 檢查
   * checkerKey 和 checkerLanguage 可來自：
   * 1. stage config (優先) - pipelineConfig.stages[].config.checkerKey
   * 2. pipeline context (fallback) - 從 problem 記錄注入
   */
  private async runCustomChecker(
    testCase: TestCaseResult,
    config: CheckStageConfig,
    pipeline: any,
  ): Promise<{ passed: boolean; message?: string }> {
    // 優先使用 config 中的設定，否則使用 pipeline context 中的設定
    const checkerKey = config.checkerKey || pipeline.checkerKey;
    const checkerLanguage = config.checkerLanguage || pipeline.checkerLanguage;

    if (!checkerKey || !checkerLanguage) {
      this.logger.warn('自訂 Checker 配置不完整，使用 diff 檢查');
      return this.diffCheck(testCase, config);
    }

    try {
      // 準備輸入檔案
      const inputFile = path.join(
        pipeline.testdataDir,
        testCase.inputFile || 'input.txt',
      );
      const outputFile = path.join(pipeline.outDir, `case_${testCase.caseNo}_output.txt`);
      const answerFile = path.join(
        pipeline.testdataDir,
        testCase.outputFile || 'output.txt',
      );

      // 確保 outDir 存在（修復 ENOENT 錯誤）
      const fs = require('fs-extra');
      await fs.ensureDir(pipeline.outDir);

      // 寫入學生輸出到檔案
      await fs.writeFile(outputFile, testCase.stdout || '', 'utf-8');

      // 執行 Checker
      const result = await this.checkerService.runChecker(
        checkerKey,
        checkerLanguage,
        { inputFile, outputFile, answerFile },
        pipeline.jobDir,
      );

      return {
        passed: result.passed,
        message: result.message,
      };
    } catch (error) {
      this.logger.error(`自訂 Checker 執行失敗: ${error.message}`, error.stack);
      // 回退到 diff 檢查
      return this.diffCheck(testCase, config);
    }
  }

  /**
   * 正規化空白字元
   * 與舊系統行為一致：
   * 1. 每行去除行尾空白 (trailing spaces)
   * 2. 移除結尾多餘空行 (extra trailing newlines)
   * 注意：不處理開頭空白，與舊系統 strip() 行為一致
   */
  private normalizeWhitespace(str: string): string {
    return str
      .split('\n')
      .map((line) => line.trimEnd())  // 去除每行行尾空白
      .join('\n')
      .replace(/\n+$/, '');           // 只移除結尾多餘空行，不動開頭
  }

  /**
   * 截斷字串（用於日誌）
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength) + '...';
  }

  validateConfig(config: Record<string, any>): string | null {
    const cfg = config as CheckStageConfig;
    if (!cfg.mode) {
      return '必須指定 mode (diff 或 custom-checker)';
    }
    // 注意：checkerKey 和 checkerLanguage 可以來自 pipeline context
    // 所以在 validateConfig 階段不強制要求，執行時再檢查
    return null;
  }
}
