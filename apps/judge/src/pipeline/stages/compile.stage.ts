import { Injectable, Logger, Inject } from '@nestjs/common';
import { SubmissionStatus, SubmissionType, ProgrammingLanguage } from '@prisma/client';
import { PipelineStage } from './pipeline-stage.interface';
import { StageContext } from '../types/stage-context.interface';
import { StageResult } from '../types/stage-result.interface';
import { SandboxRunner } from '../../sandbox/sandbox.runner';
import { CompileStageConfig } from '../types/pipeline-config.interface';
import { TemplateService } from '../template/template.service';
import { MinioService } from '../../minio/minio.service';
import {
  validateSingleFileSource,
  validateMultiFileNames,
  SourceValidationError,
} from '../../utils/source-validation';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * 編譯階段
 * 負責編譯學生提交的程式碼
 */
@Injectable()
export class CompileStage implements PipelineStage {
  private readonly logger = new Logger(CompileStage.name);
  readonly name = 'Compile';

  constructor(
    @Inject('SANDBOX_RUNNER') private readonly sandbox: SandboxRunner,
    private readonly templateService: TemplateService,
    private readonly minio: MinioService,
  ) {}

  async execute(context: StageContext): Promise<StageResult> {
    const { pipeline, stageConfig } = context;
    const config = stageConfig as CompileStageConfig;

    this.logger.log(
      `[${pipeline.submissionId}] 開始編譯階段 (語言: ${pipeline.language}, 類型: ${pipeline.submissionType})`,
    );

    try {
      // 準備原始碼
      await this.prepareSource(pipeline);

      // 判斷是否使用 Makefile 編譯
      const useMakefile = await this.shouldUseMakefile(pipeline);

      // 編譯
      const startTime = Date.now();
      let compileResult;

      // 準備編譯選項
      const compileOptions = config.compilerFlags
        ? { compilerFlags: config.compilerFlags }
        : undefined;

      if (useMakefile) {
        this.logger.log(`[${pipeline.submissionId}] 使用 Makefile 編譯`);
        compileResult = await this.sandbox.compileWithMakefile(
          {
            submissionId: pipeline.submissionId,
            jobDir: pipeline.jobDir,
          },
          pipeline.language,
          compileOptions,
        );
      } else {
        compileResult = await this.sandbox.compile(
          {
            submissionId: pipeline.submissionId,
            jobDir: pipeline.jobDir,
          },
          pipeline.language,
          compileOptions,
        );
      }
      const timeMs = Date.now() - startTime;

      // 記錄編譯日誌
      pipeline.compileLog = compileResult.log || '';

      // Sandbox 編譯成功返回 RUNNING 狀態（代表準備執行），CE 代表編譯失敗
      if (compileResult.status === SubmissionStatus.CE) {
        this.logger.warn(
          `[${pipeline.submissionId}] 編譯失敗: ${compileResult.status}`,
        );
        return {
          status: compileResult.status,
          timeMs,
          stderr: compileResult.log,
          shouldAbort: true,
          message: '編譯失敗',
        };
      }

      // 檢查可執行檔是否存在
      const executablePath = this.getExecutablePath(pipeline);
      if (!(await fs.pathExists(executablePath))) {
        this.logger.error(
          `[${pipeline.submissionId}] 可執行檔不存在: ${executablePath}`,
        );
        return {
          status: SubmissionStatus.CE,
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
        status: SubmissionStatus.AC,
        timeMs,
        message: '編譯成功',
      };
    } catch (error) {
      this.logger.error(
        `[${pipeline.submissionId}] 編譯階段發生錯誤: ${error.message}`,
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
   * 準備原始碼
   */
  private async prepareSource(pipeline: any): Promise<void> {
    const { submissionType, srcDir, sourceCode, language } = pipeline;

    await fs.ensureDir(srcDir);

    switch (submissionType) {
      case SubmissionType.SINGLE_FILE:
        // 驗證單一檔案原始碼
        try {
          validateSingleFileSource(
            sourceCode,
            language as ProgrammingLanguage,
            this.getSourceFilename(language),
            { maxSourceSize: 1024 * 1024 }, // 1MB
          );
        } catch (error) {
          if (error instanceof SourceValidationError) {
            this.logger.warn(
              `[${pipeline.submissionId}] 原始碼驗證失敗: ${error.code} - ${error.message}`,
            );
            throw new Error(`原始碼驗證失敗: ${error.message}`);
          }
          throw error;
        }
        // 單一檔案：直接寫入
        await this.writeSingleFile(pipeline);
        break;

      case SubmissionType.MULTI_FILE:
        // 驗證多檔案提交
        // 如果老師有提供 Makefile，跳過主檔案檢查（由 Makefile 定義入口點）
        try {
          const files = await fs.readdir(srcDir);
          validateMultiFileNames(files, language as ProgrammingLanguage, {
            skipMainFileCheck: !!pipeline.makefileKey,
          });
        } catch (error) {
          if (error instanceof SourceValidationError) {
            this.logger.warn(
              `[${pipeline.submissionId}] 多檔案驗證失敗: ${error.code} - ${error.message}`,
            );
            throw new Error(`多檔案驗證失敗: ${error.message}`);
          }
          throw error;
        }
        // 多檔案：已經在 Pipeline 初始化時解壓縮
        // 如果老師有提供 Makefile，下載並覆蓋到 src 目錄
        if (pipeline.makefileKey) {
          await this.downloadTeacherMakefile(pipeline);
        }
        break;

      case SubmissionType.FUNCTION_ONLY:
        // 驗證函式程式碼
        try {
          validateSingleFileSource(
            sourceCode,
            language as ProgrammingLanguage,
            undefined,
            { maxSourceSize: 512 * 1024, allowEmpty: false }, // 函式模式限制更嚴格
          );
        } catch (error) {
          if (error instanceof SourceValidationError) {
            this.logger.warn(
              `[${pipeline.submissionId}] 函式碼驗證失敗: ${error.code} - ${error.message}`,
            );
            throw new Error(`函式碼驗證失敗: ${error.message}`);
          }
          throw error;
        }
        // 僅實作函式：需要合併模板
        await this.mergeFunctionTemplate(pipeline);
        break;
    }
  }

  /**
   * 判斷是否應使用 Makefile 編譯
   * 條件：多檔案提交 且 (老師提供 Makefile 或 學生 ZIP 中包含 Makefile)
   */
  private async shouldUseMakefile(pipeline: any): Promise<boolean> {
    if (pipeline.submissionType !== SubmissionType.MULTI_FILE) {
      return false;
    }

    // 檢查 src 目錄是否有 Makefile
    const makefilePath = path.join(pipeline.srcDir, 'Makefile');
    const makefileLower = path.join(pipeline.srcDir, 'makefile');

    const hasMakefile = (await fs.pathExists(makefilePath)) ||
                        (await fs.pathExists(makefileLower));

    if (hasMakefile) {
      this.logger.debug(
        `[${pipeline.submissionId}] 找到 Makefile，將使用 make 編譯`,
      );
    }

    return hasMakefile;
  }

  /**
   * 下載老師提供的 Makefile 到 src 目錄
   */
  private async downloadTeacherMakefile(pipeline: any): Promise<void> {
    if (!pipeline.makefileKey) {
      return;
    }

    this.logger.debug(
      `[${pipeline.submissionId}] 下載老師提供的 Makefile: ${pipeline.makefileKey}`,
    );

    try {
      const makefileContent = await this.minio.getObjectAsString(
        'noj-makefiles',
        pipeline.makefileKey,
      );

      const makefilePath = path.join(pipeline.srcDir, 'Makefile');
      await fs.writeFile(makefilePath, makefileContent, 'utf-8');

      this.logger.debug(
        `[${pipeline.submissionId}] 老師 Makefile 已寫入: ${makefilePath}`,
      );
    } catch (error) {
      this.logger.error(
        `[${pipeline.submissionId}] 下載老師 Makefile 失敗: ${error.message}`,
      );
      throw new Error(`無法下載老師提供的 Makefile: ${error.message}`);
    }
  }

  /**
   * 寫入單一檔案
   */
  private async writeSingleFile(pipeline: any): Promise<void> {
    const filename = this.getSourceFilename(pipeline.language);
    const filepath = path.join(pipeline.srcDir, filename);
    await fs.writeFile(filepath, pipeline.sourceCode, 'utf-8');
    this.logger.debug(
      `[${pipeline.submissionId}] 寫入原始碼: ${filepath}`,
    );
  }

  /**
   * 合併函式模板
   */
  private async mergeFunctionTemplate(pipeline: any): Promise<void> {
    if (!pipeline.templateKey) {
      throw new Error('FUNCTION_ONLY 模式需要提供 templateKey');
    }

    // 合併模板
    const mergedCode = await this.templateService.mergeTemplate(
      pipeline.templateKey,
      pipeline.sourceCode,
    );

    // 寫入合併後的程式碼
    const filename = this.getSourceFilename(pipeline.language);
    const filepath = path.join(pipeline.srcDir, filename);
    await fs.writeFile(filepath, mergedCode, 'utf-8');

    this.logger.debug(
      `[${pipeline.submissionId}] 模板合併完成: ${filepath}`,
    );
  }

  /**
   * 取得原始碼檔名
   */
  private getSourceFilename(language: string): string {
    const filenameMap = {
      C: 'main.c',
      CPP: 'main.cpp',
      JAVA: 'Main.java',
      PYTHON: 'main.py',
    };
    return filenameMap[language] || 'main.txt';
  }

  /**
   * 取得可執行檔路徑
   */
  private getExecutablePath(pipeline: any): string {
    const { buildDir, language } = pipeline;
    if (language === 'JAVA') {
      return path.join(buildDir, 'Main.class');
    }
    if (language === 'PYTHON') {
      return path.join(pipeline.srcDir, 'main.py');
    }
    return path.join(buildDir, 'main');
  }

  validateConfig(config: Record<string, any>): string | null {
    // 驗證配置（目前沒有必要的配置項）
    return null;
  }
}
