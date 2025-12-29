import { Injectable, Logger, Inject } from '@nestjs/common';
import { ProgrammingLanguage, SubmissionStatus } from '@prisma/client';
import { MinioService } from '../../minio/minio.service';
import { SandboxRunner } from '../../sandbox/sandbox.runner';
import * as path from 'path';
import * as fs from 'fs-extra';

export interface CheckerInput {
  inputFile: string;
  outputFile: string;
  answerFile: string;
}

export interface CheckerResult {
  passed: boolean;
  message?: string;
  exitCode: number;
}

/**
 * Checker 服務
 * 負責在沙箱中安全執行自訂 Checker 腳本
 *
 * 安全性：所有 Checker 都在 Docker 沙箱中執行，確保：
 * - 網路隔離（無法存取外部網路）
 * - 檔案系統隔離（無法存取 host 檔案）
 * - 資源限制（CPU、記憶體、磁碟）
 */
@Injectable()
export class CheckerService {
  private readonly logger = new Logger(CheckerService.name);

  constructor(
    private readonly minio: MinioService,
    @Inject('SANDBOX_RUNNER') private readonly sandbox: SandboxRunner,
  ) {}

  /**
   * 執行 Checker（在沙箱中安全執行）
   */
  async runChecker(
    checkerKey: string,
    checkerLanguage: ProgrammingLanguage,
    input: CheckerInput,
    jobDir: string,
  ): Promise<CheckerResult> {
    this.logger.debug(`執行 Checker: ${checkerKey} (語言: ${checkerLanguage})`);

    try {
      // 1. 下載 Checker 腳本
      const checkerCode = await this.minio.getObjectAsString(
        'noj-checkers',
        checkerKey,
      );

      // 2. 建立 Checker 工作目錄（沙箱格式）
      // 注意：需要設定 0o777 權限讓 Docker 容器（以 root 執行）可以寫入
      const checkerDir = path.join(jobDir, 'checker');
      await fs.ensureDir(checkerDir);
      await fs.chmod(checkerDir, 0o777);
      await fs.ensureDir(path.join(checkerDir, 'src'));
      await fs.chmod(path.join(checkerDir, 'src'), 0o777);
      await fs.ensureDir(path.join(checkerDir, 'build'));
      await fs.chmod(path.join(checkerDir, 'build'), 0o777);
      await fs.ensureDir(path.join(checkerDir, 'out'));
      await fs.chmod(path.join(checkerDir, 'out'), 0o777);
      // 也建立 testdata 目錄（sandbox 需要掛載）
      await fs.ensureDir(path.join(checkerDir, 'testdata'));
      await fs.chmod(path.join(checkerDir, 'testdata'), 0o777);

      // 3. 複製測試資料檔案到 src 目錄（沙箱可讀取）
      this.logger.debug(`複製檔案: ${input.inputFile} -> ${path.join(checkerDir, 'src', 'input.txt')}`);
      this.logger.debug(`複製檔案: ${input.outputFile} -> ${path.join(checkerDir, 'src', 'output.txt')}`);
      this.logger.debug(`複製檔案: ${input.answerFile} -> ${path.join(checkerDir, 'src', 'answer.txt')}`);

      // 檢查源文件是否存在
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

      // 讀取複製後的內容做debug
      const copiedOutput = await fs.readFile(path.join(checkerDir, 'src', 'output.txt'), 'utf-8').catch(() => '<read error>');
      this.logger.debug(`複製後的 output.txt 內容: "${copiedOutput.substring(0, 200)}"`);

      // 4. 建立 sandbox job context
      const sandboxJob = {
        submissionId: `checker-${Date.now()}`,
        jobDir: checkerDir,
      };

      // 5. 根據語言執行 Checker
      if (checkerLanguage === ProgrammingLanguage.PYTHON) {
        return await this.runPythonChecker(sandboxJob, checkerCode);
      } else {
        return await this.runCompiledChecker(sandboxJob, checkerCode, checkerLanguage);
      }
    } catch (error) {
      this.logger.error(`Checker 執行失敗: ${error.message}`, error.stack);
      return {
        passed: false,
        message: `Checker 執行錯誤: ${error.message}`,
        exitCode: -1,
      };
    }
  }

  /**
   * 執行 Python Checker
   */
  private async runPythonChecker(
    job: { submissionId: string; jobDir: string },
    checkerCode: string,
  ): Promise<CheckerResult> {
    // 將 checker 程式碼寫入 src 目錄
    await fs.writeFile(
      path.join(job.jobDir, 'src', 'checker.py'),
      checkerCode,
      'utf-8',
    );

    // 建立 wrapper script 來執行 checker
    // 這個 wrapper 會：
    // 1. 設定正確的 argv
    // 2. 執行 checker.py
    // 3. 捕捉結果並輸出 JSON
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

  /**
   * 執行已編譯的 Checker (C/C++/Java)
   */
  private async runCompiledChecker(
    job: { submissionId: string; jobDir: string },
    checkerCode: string,
    language: ProgrammingLanguage,
  ): Promise<CheckerResult> {
    // 1. 將 checker 原始碼寫入 src 目錄
    const filename = this.getSourceFilename(language);
    await fs.writeFile(
      path.join(job.jobDir, 'src', filename),
      checkerCode,
      'utf-8',
    );

    // 2. 編譯
    this.logger.debug(`[${job.submissionId}] 編譯 Checker (${language})`);
    const compileResult = await this.sandbox.compile(job, language);

    if (compileResult.status === SubmissionStatus.CE) {
      return {
        passed: false,
        message: `Checker 編譯失敗: ${compileResult.log}`,
        exitCode: 1,
      };
    }

    // 3. 建立 Python wrapper 來執行編譯後的程式
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

  /**
   * 解析 script 執行結果
   * Wrapper script 會在最後一行輸出 JSON，但 checker 可能在此之前有 print 輸出
   * 因此需要從輸出中提取 JSON 行
   */
  private parseScriptResult(result: {
    output: string;
    stderr: string;
    exitCode: number;
  }): CheckerResult {
    this.logger.debug(`Checker script output: ${JSON.stringify(result.output)}`);
    this.logger.debug(`Checker script stderr: ${JSON.stringify(result.stderr)}`);
    this.logger.debug(`Checker script exitCode: ${result.exitCode}`);

    // 如果 sandbox 執行本身失敗
    if (result.exitCode !== 0 && !result.output) {
      return {
        passed: false,
        message: result.stderr || `Checker 執行失敗 (exitCode: ${result.exitCode})`,
        exitCode: result.exitCode,
      };
    }

    // 嘗試從輸出中提取 JSON（優先檢查最後一行，因為 checker 可能有 print 輸出）
    const lines = result.output.trim().split('\n');

    // 從最後一行開始嘗試解析 JSON
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
        } catch {
          // 繼續嘗試其他行
        }
      }
    }

    // 如果無法找到有效的 JSON，使用原始輸出
    return {
      passed: result.exitCode === 0,
      message: result.output.trim() || result.stderr.trim() || 'Unknown result',
      exitCode: result.exitCode,
    };
  }

  /**
   * 取得原始碼檔名（需符合沙箱的編譯規範）
   */
  private getSourceFilename(language: ProgrammingLanguage): string {
    switch (language) {
      case ProgrammingLanguage.C:
        return 'main.c';
      case ProgrammingLanguage.CPP:
        return 'main.cpp';
      case ProgrammingLanguage.JAVA:
        return 'Main.java';
      case ProgrammingLanguage.PYTHON:
        return 'main.py';
      default:
        throw new Error(`不支援的 Checker 語言: ${language}`);
    }
  }

  /**
   * 取得執行命令（以陣列形式，供 subprocess.run 使用）
   */
  private getRunCommand(language: ProgrammingLanguage): string[] {
    switch (language) {
      case ProgrammingLanguage.C:
      case ProgrammingLanguage.CPP:
        return ['/work/build/main', 'input.txt', 'output.txt', 'answer.txt'];
      case ProgrammingLanguage.JAVA:
        return ['java', '-cp', '/work/build', 'Main', 'input.txt', 'output.txt', 'answer.txt'];
      default:
        throw new Error(`不支援的 Checker 語言: ${language}`);
    }
  }
}
