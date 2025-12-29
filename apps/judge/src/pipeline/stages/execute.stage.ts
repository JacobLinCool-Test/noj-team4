import { Injectable, Logger, Inject } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PipelineStage } from './pipeline-stage.interface';
import { StageContext } from '../types/stage-context.interface';
import { StageResult } from '../types/stage-result.interface';
import { TestCaseResult } from '../types/stage-context.interface';
import { SandboxRunner } from '../../sandbox/sandbox.runner';
import { ExecuteStageConfig } from '../types/pipeline-config.interface';
import { ChaosConfig } from '../../testdata/testdata.types';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * 執行階段
 * 負責執行測試案例
 */
@Injectable()
export class ExecuteStage implements PipelineStage {
  private readonly logger = new Logger(ExecuteStage.name);
  readonly name = 'Execute';

  constructor(@Inject('SANDBOX_RUNNER') private readonly sandbox: SandboxRunner) {}

  async execute(context: StageContext): Promise<StageResult> {
    const { pipeline, stageConfig } = context;
    const config = stageConfig as ExecuteStageConfig;

    this.logger.log(
      `[${pipeline.submissionId}] 開始執行階段`,
    );

    if (!pipeline.compiled) {
      return {
        status: SubmissionStatus.JUDGE_ERROR,
        stderr: '程式尚未編譯',
        shouldAbort: true,
        message: '評測系統錯誤',
      };
    }

    try {
      const testCases = await this.prepareTestCases(pipeline, config);
      const results: TestCaseResult[] = [];

      let totalTimeMs = 0;
      let maxMemoryKb = 0;
      let chaosInjected = false;

      // 取得 chaos 配置
      const chaosConfig: ChaosConfig | undefined = pipeline.testdataManifest?.chaos;

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];

        // Chaos 防作弊機制：在指定的測試案例之前注入污染檔案
        if (chaosConfig?.enabled && !chaosInjected) {
          const injectBeforeCase = chaosConfig.injectBeforeCase ?? 0;
          if (i === injectBeforeCase) {
            await this.injectChaosFiles(pipeline, chaosConfig);
            chaosInjected = true;
          }
        }

        this.logger.debug(
          `[${pipeline.submissionId}] 執行測試案例 ${i + 1}/${testCases.length}: ${testCase.name}`,
        );

        const runResult = await this.sandbox.runCase(
          {
            submissionId: pipeline.submissionId,
            jobDir: pipeline.jobDir,
          },
          pipeline.language,
          testCase.input,
          {
            timeLimitMs: testCase.timeLimitMs || config.timeLimitMs || 1000,
            memoryLimitKb: testCase.memoryLimitKb || config.memoryLimitKb || 262144,
            outputLimitBytes: 1048576, // 1MB
            networkConfig: pipeline.networkConfig,
          },
          i,
        );

        const result: TestCaseResult = {
          caseNo: i,
          name: testCase.name,
          isSample: testCase.isSample,
          status: runResult.status,
          timeMs: runResult.timeMs,
          memoryKb: runResult.memoryKb,
          stdout: runResult.stdout,
          stderr: this.sanitizeStderr(runResult.stderr, runResult.status),
          inputFile: testCase.inputFile,
          outputFile: testCase.outputFile,
          expectedOutput: testCase.expectedOutput,
          points: testCase.points,  // 加入配分
        };

        results.push(result);

        if (runResult.timeMs) {
          totalTimeMs += runResult.timeMs;
        }
        if (runResult.memoryKb && runResult.memoryKb > maxMemoryKb) {
          maxMemoryKb = runResult.memoryKb;
        }

        // 如果執行失敗且不是 WA，可能需要提早中止
        if (
          runResult.status !== SubmissionStatus.AC &&
          runResult.status !== SubmissionStatus.WA
        ) {
          this.logger.warn(
            `[${pipeline.submissionId}] 測試案例 ${i + 1} 執行失敗: ${runResult.status}`,
          );
        }
      }

      // 儲存測試案例結果到 pipeline 上下文
      pipeline.testCaseResults = results;

      // 判斷整體狀態
      const overallStatus = this.determineOverallStatus(results);

      this.logger.log(
        `[${pipeline.submissionId}] 執行階段完成 (狀態: ${overallStatus}, 總耗時: ${totalTimeMs}ms, 最大記憶體: ${maxMemoryKb}KB)`,
      );

      return {
        status: overallStatus,
        timeMs: totalTimeMs,
        memoryKb: maxMemoryKb,
        details: {
          testCaseCount: testCases.length,
          passedCount: results.filter((r) => r.status === SubmissionStatus.AC)
            .length,
        },
        message: `執行完成 (${results.filter((r) => r.status === SubmissionStatus.AC).length}/${testCases.length} 通過)`,
      };
    } catch (error) {
      this.logger.error(
        `[${pipeline.submissionId}] 執行階段發生錯誤: ${error.message}`,
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
   * 準備測試案例
   */
  private async prepareTestCases(
    pipeline: any,
    config: ExecuteStageConfig,
  ): Promise<any[]> {
    if (config.useTestdata !== false && pipeline.testdataManifest) {
      // 使用測資
      this.logger.debug(
        `[${pipeline.submissionId}] 使用測資 (${pipeline.testdataManifest.cases.length} 個測試案例)`,
      );
      return this.loadTestdataCases(pipeline);
    } else if (config.customInputs) {
      // 使用自訂輸入
      this.logger.debug(
        `[${pipeline.submissionId}] 使用自訂輸入 (${config.customInputs.length} 個測試案例)`,
      );
      return config.customInputs.map((input, i) => ({
        name: `Custom ${i + 1}`,
        input,
        isSample: false,
        timeLimitMs: config.timeLimitMs,
        memoryLimitKb: config.memoryLimitKb,
      }));
    } else if (pipeline.sampleCases && pipeline.sampleCases.length > 0) {
      // 使用範例測資作為備用
      this.logger.log(
        `[${pipeline.submissionId}] 使用範例測資作為備用 (${pipeline.sampleCases.length} 個測試案例)`,
      );
      return pipeline.sampleCases.map(
        (sampleCase: { input: string; output: string }, i: number) => ({
          name: `Sample ${i + 1}`,
          input: sampleCase.input,
          expectedOutput: sampleCase.output,
          isSample: true,
          timeLimitMs: config.timeLimitMs || 5000,
          memoryLimitKb: config.memoryLimitKb || 262144,
        }),
      );
    } else {
      throw new Error('沒有可用的測試案例');
    }
  }

  /**
   * 注入 Chaos 檔案到工作目錄
   * 用於防止作弊行為（如讀取固定檔名、假設目錄乾淨等投機解法）
   */
  private async injectChaosFiles(
    pipeline: any,
    chaosConfig: ChaosConfig,
  ): Promise<void> {
    const { testdataDir, srcDir } = pipeline;
    const chaosDir = path.join(testdataDir, 'chaos');

    // 檢查 chaos 目錄是否存在
    if (!(await fs.pathExists(chaosDir))) {
      this.logger.debug(
        `[${pipeline.submissionId}] Chaos 目錄不存在，跳過注入`,
      );
      return;
    }

    // 確認 chaos 是目錄而非檔案
    const chaosStat = await fs.stat(chaosDir);
    if (!chaosStat.isDirectory()) {
      this.logger.warn(
        `[${pipeline.submissionId}] chaos 必須是目錄，跳過注入`,
      );
      return;
    }

    // 取得要注入的檔案列表
    let filesToInject: string[];
    if (chaosConfig.files && chaosConfig.files.length > 0) {
      // 使用配置指定的檔案
      filesToInject = chaosConfig.files;
    } else {
      // 預設注入 chaos 目錄下的所有檔案
      filesToInject = await fs.readdir(chaosDir);
    }

    // 注入每個檔案
    for (const file of filesToInject) {
      const srcPath = path.join(chaosDir, file);
      const destPath = path.join(srcDir, file);

      // 檢查來源檔案存在
      if (!(await fs.pathExists(srcPath))) {
        this.logger.warn(
          `[${pipeline.submissionId}] Chaos 檔案不存在: ${file}，跳過`,
        );
        continue;
      }

      // 複製檔案到工作目錄
      await fs.copy(srcPath, destPath, { overwrite: true });
      this.logger.debug(
        `[${pipeline.submissionId}] 已注入 Chaos 檔案: ${file}`,
      );
    }

    this.logger.log(
      `[${pipeline.submissionId}] 已注入 ${filesToInject.length} 個 Chaos 檔案`,
    );
  }

  /**
   * 從測資載入測試案例
   */
  private async loadTestdataCases(pipeline: any): Promise<any[]> {
    const { testdataManifest, testdataDir } = pipeline;
    const cases = [];

    for (const testCase of testdataManifest.cases) {
      const inputPath = path.join(testdataDir, testCase.inputFile);
      const outputPath = path.join(testdataDir, testCase.outputFile);

      const input = await fs.readFile(inputPath, 'utf-8');
      const expectedOutput = await fs.readFile(outputPath, 'utf-8');

      cases.push({
        name: testCase.name,
        input,
        expectedOutput,
        isSample: testCase.isSample,
        inputFile: testCase.inputFile,
        outputFile: testCase.outputFile,
        timeLimitMs: testCase.timeLimitMs || testdataManifest.defaultTimeLimitMs,
        memoryLimitKb:
          testCase.memoryLimitKb || testdataManifest.defaultMemoryLimitKb,
        points: testCase.points,
      });
    }

    return cases;
  }

  /**
   * 判斷整體執行狀態
   */
  private determineOverallStatus(results: TestCaseResult[]): SubmissionStatus {
    // 如果有任何執行錯誤（TLE, MLE, RE, OLE），優先回傳該錯誤
    // 注意：RUNNING 表示執行成功，待 CheckStage 檢查輸出
    const executionErrors: string[] = ['TLE', 'MLE', 'RE', 'OLE', 'CE', 'JUDGE_ERROR'];
    for (const result of results) {
      if (executionErrors.includes(result.status)) {
        return result.status as SubmissionStatus;
      }
    }

    // 如果所有案例都執行成功（RUNNING 或 AC），回傳 AC
    // 這表示執行階段成功完成，後續由 CheckStage 決定最終結果
    const successStatuses: string[] = ['AC', 'RUNNING'];
    if (results.every((r) => successStatuses.includes(r.status))) {
      return SubmissionStatus.AC;
    }

    // 否則回傳 WA
    return SubmissionStatus.WA;
  }

  /**
   * 過濾 stderr 中的敏感資訊
   * 防止洩漏 sandbox 實作細節給用戶
   */
  private sanitizeStderr(stderr: string | undefined, status: SubmissionStatus): string | undefined {
    if (!stderr) {
      return undefined;
    }

    // 敏感關鍵字列表 - 如果 stderr 包含這些內容，可能洩漏系統資訊
    const sensitivePatterns = [
      /\/usr\/local\/bin\/noj-sandbox/gi,
      /ulimit\s+-[a-z]/gi,
      /timeout.*--signal/gi,
      /skip_memory_limit/gi,
      /memory_limit_kb/gi,
      /cpu_limit_s/gi,
      /nofile_limit/gi,
      /nproc_limit/gi,
      /line\s+\d+:/gi,  // 腳本行號
      /\(.*ulimit.*\)/gi,  // ulimit 命令塊
    ];

    // 檢查是否包含敏感資訊
    const containsSensitiveInfo = sensitivePatterns.some(pattern => pattern.test(stderr));

    if (containsSensitiveInfo) {
      // 對於 TLE/MLE/OLE/RE 狀態，如果 stderr 包含敏感資訊，替換為簡潔訊息
      switch (status) {
        case SubmissionStatus.TLE:
          return '程式執行超時';
        case SubmissionStatus.MLE:
          return '程式記憶體超出限制';
        case SubmissionStatus.OLE:
          return '程式輸出超出限制';
        case SubmissionStatus.RE:
          return '程式執行時發生錯誤';
        default:
          return '執行發生錯誤';
      }
    }

    // 不包含敏感資訊，保留原始 stderr（可能是用戶程式的錯誤輸出）
    return stderr;
  }

  validateConfig(config: Record<string, any>): string | null {
    const cfg = config as ExecuteStageConfig;
    if (cfg.useTestdata === false && !cfg.customInputs) {
      return '必須提供 customInputs 或啟用 useTestdata';
    }
    return null;
  }
}
