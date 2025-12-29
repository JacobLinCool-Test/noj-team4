import { Injectable, Logger } from '@nestjs/common';
import { MinioService } from '../../minio/minio.service';

/**
 * 模板服務
 * 負責處理 FUNCTION_ONLY 模式的模板合併
 */
@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  // 模板標記
  private readonly STUDENT_CODE_MARKER = '// STUDENT_CODE_HERE';
  private readonly STUDENT_CODE_START = '// === 學生實作區域開始 ===';
  private readonly STUDENT_CODE_END = '// === 學生實作區域結束 ===';

  constructor(private readonly minio: MinioService) {}

  /**
   * 合併學生程式碼和模板
   */
  async mergeTemplate(
    templateKey: string,
    studentCode: string,
  ): Promise<string> {
    this.logger.debug(`合併模板: ${templateKey}`);

    try {
      // 下載模板
      const template = await this.minio.getObjectAsString(
        'noj-templates',
        templateKey,
      );

      // 方法 1：使用單行標記
      if (template.includes(this.STUDENT_CODE_MARKER)) {
        return template.replace(this.STUDENT_CODE_MARKER, studentCode);
      }

      // 方法 2：使用區域標記
      if (
        template.includes(this.STUDENT_CODE_START) &&
        template.includes(this.STUDENT_CODE_END)
      ) {
        const startIndex = template.indexOf(this.STUDENT_CODE_START);
        const endIndex = template.indexOf(this.STUDENT_CODE_END);

        if (startIndex < endIndex) {
          const before = template.substring(0, startIndex + this.STUDENT_CODE_START.length);
          const after = template.substring(endIndex);

          return `${before}\n${studentCode}\n${after}`;
        }
      }

      // 如果找不到標記，拋出錯誤
      throw new Error('模板中找不到學生程式碼標記');
    } catch (error) {
      this.logger.error(`合併模板失敗: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 驗證模板格式
   */
  async validateTemplate(templateKey: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      const template = await this.minio.getObjectAsString(
        'noj-templates',
        templateKey,
      );

      // 檢查是否有標記
      const hasSingleMarker = template.includes(this.STUDENT_CODE_MARKER);
      const hasRegionMarkers =
        template.includes(this.STUDENT_CODE_START) &&
        template.includes(this.STUDENT_CODE_END);

      if (!hasSingleMarker && !hasRegionMarkers) {
        return {
          valid: false,
          error: '模板中必須包含 // STUDENT_CODE_HERE 或區域標記',
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }
}
