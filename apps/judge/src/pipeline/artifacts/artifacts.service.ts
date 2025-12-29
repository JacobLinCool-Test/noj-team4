import { Injectable, Logger } from '@nestjs/common';
import { MinioService } from '../../minio/minio.service';
import * as fs from 'fs-extra';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { glob } from 'glob';

/**
 * 產物服務
 * 負責收集和上傳評測產物
 */
@Injectable()
export class ArtifactsService {
  private readonly logger = new Logger(ArtifactsService.name);

  constructor(private readonly minio: MinioService) {}

  /**
   * 收集產物
   */
  async collectArtifacts(
    jobDir: string,
    artifactPaths: string[],
  ): Promise<Map<string, Buffer>> {
    this.logger.debug(`收集產物: ${artifactPaths.length} 個路徑`);

    const artifacts = new Map<string, Buffer>();

    for (const pattern of artifactPaths) {
      const files = await this.findFiles(jobDir, pattern);

      for (const file of files) {
        try {
          const content = await fs.readFile(file);
          const relativePath = path.relative(jobDir, file);
          artifacts.set(relativePath, content);
          this.logger.debug(`收集產物: ${relativePath}`);
        } catch (error) {
          this.logger.warn(`無法讀取產物 ${file}: ${error.message}`);
        }
      }
    }

    return artifacts;
  }

  /**
   * 打包並上傳產物
   */
  async uploadArtifacts(
    submissionId: string,
    artifacts: Map<string, Buffer>,
  ): Promise<string> {
    if (artifacts.size === 0) {
      this.logger.debug('沒有產物需要上傳');
      return null;
    }

    this.logger.debug(`打包 ${artifacts.size} 個產物`);

    // 建立 ZIP
    const zip = new AdmZip();
    for (const [relativePath, content] of artifacts.entries()) {
      zip.addFile(relativePath, content);
    }

    const zipBuffer = zip.toBuffer();

    // 上傳到 MinIO
    const key = `submissions/${submissionId}/artifacts.zip`;
    await this.minio.putObject('noj-artifacts', key, zipBuffer, {
      'Content-Type': 'application/zip',
    });

    this.logger.log(`產物已上傳: ${key} (${zipBuffer.length} bytes)`);

    return key;
  }

  /**
   * 尋找符合模式的檔案
   */
  private async findFiles(baseDir: string, pattern: string): Promise<string[]> {
    const fullPattern = path.join(baseDir, pattern);

    try {
      const files = await glob(fullPattern, {
        nodir: true,
        absolute: true,
      });
      return files;
    } catch (error) {
      this.logger.warn(`尋找檔案失敗 ${pattern}: ${error.message}`);
      return [];
    }
  }

  /**
   * 下載產物
   */
  async downloadArtifacts(artifactsKey: string): Promise<Buffer> {
    try {
      return await this.minio.getObject('noj-artifacts', artifactsKey);
    } catch (error) {
      this.logger.error(`下載產物失敗: ${error.message}`, error.stack);
      throw error;
    }
  }
}
