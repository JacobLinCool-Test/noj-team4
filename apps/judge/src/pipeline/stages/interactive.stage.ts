import { Injectable, Logger, Inject } from '@nestjs/common';
import { SubmissionStatus, ProgrammingLanguage } from '@prisma/client';
import { PipelineStage } from './pipeline-stage.interface';
import { StageContext } from '../types/stage-context.interface';
import { StageResult } from '../types/stage-result.interface';
import { TestCaseResult } from '../types/stage-context.interface';
import { SandboxRunner } from '../../sandbox/sandbox.runner';
import { MinioService } from '../../minio/minio.service';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Interactive Stage Configuration
 */
export interface InteractiveStageConfig {
  interactorKey: string; // MinIO path to interactor script
  interactorLanguage: ProgrammingLanguage;
  timeLimitMs?: number;
  memoryLimitKb?: number;
  interactionTimeoutMs?: number; // Total timeout for the interaction
}

/**
 * 互動式評測階段
 * 負責執行互動式評測，學生程式會與互動器進行雙向通訊
 *
 * 互動流程：
 * 1. 編譯互動器腳本
 * 2. 對每個測試案例執行互動式評測
 * 3. 互動器和學生程式透過 stdin/stdout 通訊
 * 4. 互動器決定最終結果（AC/WA/PE）
 */
@Injectable()
export class InteractiveStage implements PipelineStage {
  private readonly logger = new Logger(InteractiveStage.name);
  readonly name = 'Interactive';

  constructor(
    @Inject('SANDBOX_RUNNER') private readonly sandbox: SandboxRunner,
    private readonly minio: MinioService,
  ) {}

  async execute(context: StageContext): Promise<StageResult> {
    const { pipeline, stageConfig } = context;
    const config = stageConfig as InteractiveStageConfig;

    this.logger.log(
      `[${pipeline.submissionId}] 開始互動式評測階段`,
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
      // 1. 下載並準備互動器
      const interactorReady = await this.prepareInteractor(pipeline, config);
      if (!interactorReady) {
        return {
          status: SubmissionStatus.JUDGE_ERROR,
          stderr: '無法準備互動器',
          shouldAbort: true,
          message: '評測系統錯誤',
        };
      }

      // 2. 取得測試案例
      const testCases = await this.prepareTestCases(pipeline, config);
      const results: TestCaseResult[] = [];

      let totalTimeMs = 0;
      let maxMemoryKb = 0;

      // 3. 對每個測試案例執行互動式評測
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        this.logger.debug(
          `[${pipeline.submissionId}] 執行互動式測試案例 ${i + 1}/${testCases.length}: ${testCase.name}`,
        );

        const runResult = await this.runInteractiveCase(
          pipeline,
          config,
          testCase,
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

        // 記錄非 AC 的結果
        if (runResult.status !== SubmissionStatus.AC) {
          this.logger.warn(
            `[${pipeline.submissionId}] 互動式測試案例 ${i + 1} 結果: ${runResult.status}`,
          );
        }
      }

      // 儲存結果到 pipeline 上下文
      pipeline.testCaseResults = results;

      // 判斷整體狀態
      const overallStatus = this.determineOverallStatus(results);

      this.logger.log(
        `[${pipeline.submissionId}] 互動式評測完成 (狀態: ${overallStatus}, 總耗時: ${totalTimeMs}ms)`,
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
        message: `互動式評測完成 (${results.filter((r) => r.status === SubmissionStatus.AC).length}/${testCases.length} 通過)`,
      };
    } catch (error) {
      this.logger.error(
        `[${pipeline.submissionId}] 互動式評測階段發生錯誤: ${error.message}`,
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
   * 準備互動器腳本
   */
  private async prepareInteractor(
    pipeline: any,
    config: InteractiveStageConfig,
  ): Promise<boolean> {
    if (!config.interactorKey) {
      this.logger.error(`[${pipeline.submissionId}] 未提供互動器腳本`);
      return false;
    }

    try {
      // 從 MinIO 下載互動器
      const interactorCode = await this.minio.getObjectAsString(
        'noj-problems',
        config.interactorKey,
      );

      // 寫入互動器原始碼到 src/interactor 目錄（這個目錄會被掛載到 Docker 容器）
      const interactorDir = path.join(pipeline.jobDir, 'src', 'interactor');
      await fs.ensureDir(interactorDir);

      const srcFileName = this.getSourceFileName(config.interactorLanguage);
      const srcPath = path.join(interactorDir, srcFileName);
      await fs.writeFile(srcPath, interactorCode);

      // 編譯互動器（如果需要）
      if (this.needsCompilation(config.interactorLanguage)) {
        const compileResult = await this.compileInteractor(
          pipeline,
          config.interactorLanguage,
          interactorDir,
        );
        if (!compileResult) {
          return false;
        }
      }

      pipeline.stageData.set('interactorDir', interactorDir);
      pipeline.stageData.set('interactorLanguage', config.interactorLanguage);

      return true;
    } catch (error) {
      this.logger.error(
        `[${pipeline.submissionId}] 準備互動器失敗: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * 編譯互動器
   */
  private async compileInteractor(
    pipeline: any,
    language: ProgrammingLanguage,
    interactorDir: string,
  ): Promise<boolean> {
    const srcDir = interactorDir;
    const buildDir = path.join(interactorDir, 'build');
    await fs.ensureDir(buildDir);

    try {
      // 使用沙箱編譯互動器
      // 這裡我們重用 sandbox 的編譯功能
      const job = {
        submissionId: `${pipeline.submissionId}-interactor`,
        jobDir: interactorDir,
      };

      // 設置必要的目錄結構
      await fs.ensureDir(path.join(interactorDir, 'src'));
      await fs.ensureDir(path.join(interactorDir, 'build'));
      await fs.ensureDir(path.join(interactorDir, 'out'));

      // 複製原始碼到 src 目錄
      const srcFileName = this.getSourceFileName(language);
      const srcPath = path.join(interactorDir, srcFileName);
      const destPath = path.join(interactorDir, 'src', srcFileName);
      await fs.copy(srcPath, destPath);

      const result = await this.sandbox.compile(job, language);

      if (result.status === SubmissionStatus.CE) {
        this.logger.error(
          `[${pipeline.submissionId}] 互動器編譯失敗: ${result.log}`,
        );
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `[${pipeline.submissionId}] 互動器編譯錯誤: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * 準備測試案例
   */
  private async prepareTestCases(
    pipeline: any,
    config: InteractiveStageConfig,
  ): Promise<any[]> {
    if (pipeline.testdataManifest) {
      return this.loadTestdataCases(pipeline, config);
    }

    // 如果沒有測資，使用範例測資
    if (pipeline.sampleCases && pipeline.sampleCases.length > 0) {
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
    }

    throw new Error('沒有可用的測試案例');
  }

  /**
   * 從測資載入測試案例
   */
  private async loadTestdataCases(
    pipeline: any,
    config: InteractiveStageConfig,
  ): Promise<any[]> {
    const { testdataManifest, testdataDir } = pipeline;
    const cases = [];

    for (const testCase of testdataManifest.cases) {
      const inputPath = path.join(testdataDir, testCase.inputFile);
      const input = await fs.readFile(inputPath, 'utf-8');

      // 互動式評測可能沒有預期輸出，因為結果由互動器決定
      let expectedOutput = '';
      if (testCase.outputFile) {
        const outputPath = path.join(testdataDir, testCase.outputFile);
        try {
          expectedOutput = await fs.readFile(outputPath, 'utf-8');
        } catch {
          // 輸出檔案不存在，這在互動式評測中是正常的
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

  /**
   * 執行互動式測試案例
   */
  private async runInteractiveCase(
    pipeline: any,
    config: InteractiveStageConfig,
    testCase: any,
    caseIndex: number,
  ): Promise<{
    status: SubmissionStatus;
    timeMs?: number;
    memoryKb?: number;
    stdout?: string;
    stderr?: string;
  }> {
    const interactorDir = pipeline.stageData.get('interactorDir');
    const interactorLanguage = pipeline.stageData.get('interactorLanguage');

    // 準備互動腳本的輸入（測試資料 + 學生程式路徑）
    const interactionInput = {
      testCase: testCase.input,
      expectedOutput: testCase.expectedOutput,
      submissionId: pipeline.submissionId,
      caseIndex,
      timeLimitMs: testCase.timeLimitMs,
    };

    try {
      // 使用 sandbox 執行互動式評測
      // 互動器會作為主程式，學生程式作為子程序
      const result = await this.sandbox.runScript(
        {
          submissionId: `${pipeline.submissionId}-interactive-${caseIndex}`,
          jobDir: pipeline.jobDir,
        },
        this.generateInteractiveWrapperScript(
          pipeline,
          interactorDir,
          interactorLanguage,
          testCase,
        ),
        JSON.stringify(interactionInput),
      );

      // 解析互動器的輸出結果
      return this.parseInteractorResult(result);
    } catch (error) {
      this.logger.error(
        `[${pipeline.submissionId}] 互動式測試案例 ${caseIndex} 執行失敗: ${error.message}`,
      );
      return {
        status: SubmissionStatus.JUDGE_ERROR,
        stderr: error.message,
      };
    }
  }

  /**
   * 產生互動式包裝腳本
   * 這個腳本負責啟動學生程式和互動器，並連接它們的 stdin/stdout
   */
  private generateInteractiveWrapperScript(
    pipeline: any,
    interactorDir: string,
    interactorLanguage: ProgrammingLanguage,
    testCase: any,
  ): string {
    // Python 包裝腳本，負責：
    // 1. 啟動學生程式
    // 2. 啟動互動器
    // 3. 連接它們的 stdin/stdout
    // 4. 監控執行狀態
    // 5. 回報結果
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

  /**
   * 取得學生程式執行命令（使用容器內路徑 /work）
   */
  private getStudentCommand(pipeline: any): string {
    // Docker 容器內的路徑
    const buildDir = '/work/build';
    const srcDir = '/work/src';

    switch (pipeline.language) {
      case 'PYTHON':
        return `'python3 ${srcDir}/main.py'`;
      case 'C':
      case 'CPP':
        return `'${buildDir}/main'`;
      case 'JAVA':
        // Disable JVM unified logging to prevent GC warnings from going to stdout
        return `'java -Xlog:gc=off -cp ${buildDir} Main'`;
      default:
        return `'echo "Unsupported language"'`;
    }
  }

  /**
   * 取得互動器執行命令（使用容器內路徑 /work）
   */
  private getInteractorCommand(
    interactorDir: string,
    language: ProgrammingLanguage,
  ): string {
    // Docker 容器內的路徑 - interactor 在 /work/src/interactor 目錄
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

  /**
   * 解析互動器結果
   */
  private parseInteractorResult(result: {
    output: string;
    stderr: string;
    exitCode: number;
  }): {
    status: SubmissionStatus;
    timeMs?: number;
    memoryKb?: number;
    stdout?: string;
    stderr?: string;
  } {
    try {
      const parsed = JSON.parse(result.output);

      const statusMap: Record<string, SubmissionStatus> = {
        AC: SubmissionStatus.AC,
        WA: SubmissionStatus.WA,
        TLE: SubmissionStatus.TLE,
        MLE: SubmissionStatus.MLE,
        RE: SubmissionStatus.RE,
        PE: SubmissionStatus.WA, // Presentation Error treated as WA
        JUDGE_ERROR: SubmissionStatus.JUDGE_ERROR,
      };

      return {
        status: statusMap[parsed.status] || SubmissionStatus.JUDGE_ERROR,
        timeMs: parsed.timeMs,
        stdout: parsed.interactorOutput,
        stderr: parsed.studentStderr || result.stderr,
      };
    } catch (error) {
      return {
        status: SubmissionStatus.JUDGE_ERROR,
        stderr: `無法解析互動器結果: ${result.output}`,
      };
    }
  }

  /**
   * 判斷整體狀態
   */
  private determineOverallStatus(results: TestCaseResult[]): SubmissionStatus {
    // 如果有任何執行錯誤，優先回傳該錯誤
    const executionErrors = ['TLE', 'MLE', 'RE', 'OLE', 'CE', 'JUDGE_ERROR'];
    for (const result of results) {
      if (executionErrors.includes(result.status)) {
        return result.status as SubmissionStatus;
      }
    }

    // 如果所有案例都 AC
    if (results.every((r) => r.status === SubmissionStatus.AC)) {
      return SubmissionStatus.AC;
    }

    // 否則回傳 WA
    return SubmissionStatus.WA;
  }

  /**
   * 取得原始碼檔案名稱
   */
  private getSourceFileName(language: ProgrammingLanguage): string {
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

  /**
   * 判斷是否需要編譯
   */
  private needsCompilation(language: ProgrammingLanguage): boolean {
    return ['C', 'CPP', 'JAVA'].includes(language);
  }

  validateConfig(config: Record<string, any>): string | null {
    const cfg = config as InteractiveStageConfig;
    if (!cfg.interactorKey) {
      return '必須提供互動器腳本 (interactorKey)';
    }
    if (!cfg.interactorLanguage) {
      return '必須指定互動器語言 (interactorLanguage)';
    }
    return null;
  }
}
