import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { DolosResult, DolosFile, DolosPair } from './interfaces/copycat-job.interface';

@Injectable()
export class DolosRunnerService {
  private readonly logger = new Logger(DolosRunnerService.name);

  /**
   * Run Dolos CLI via Docker to analyze code similarity
   * @param inputDir Directory containing source files to analyze
   * @param language Language identifier for logging purposes
   * @returns Path to the output directory containing CSV results
   */
  async run(inputDir: string, language: string): Promise<string> {
    const outputDir = path.join(inputDir, 'output');

    // Ensure output directory doesn't exist (Dolos requires this)
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, which is fine
    }

    // Get current user ID for Docker volume permissions
    const uid = process.getuid?.() ?? 1000;
    const gid = process.getgid?.() ?? 1000;

    // Dolos CLI Docker execution
    // Pass info.csv as input since Dolos expects a CSV file or ZIP archive
    // Use -u flag to run as current user for proper file permissions
    // Let Dolos auto-detect the language from file extensions
    const args = [
      'run',
      '--rm',
      '--init',
      '-u',
      `${uid}:${gid}`,
      '-v',
      `${inputDir}:/dolos`,
      'ghcr.io/dodona-edu/dolos-cli:latest',
      'run',
      '-f',
      'csv', // Output CSV format
      '-o',
      '/dolos/output', // Output directory
      '/dolos/info.csv', // Input CSV file with file references
    ];

    this.logger.log(`Running Dolos: docker ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const proc = spawn('docker', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        this.logger.debug(`Dolos stdout: ${data.toString()}`);
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        this.logger.debug(`Dolos stderr: ${data.toString()}`);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          this.logger.log('Dolos completed successfully');
          resolve(outputDir);
        } else {
          this.logger.error(`Dolos failed with code ${code}: ${stderr}`);
          reject(new Error(`Dolos failed with exit code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (err) => {
        this.logger.error('Dolos process error:', err);
        reject(err);
      });
    });
  }

  /**
   * Parse Dolos CSV output files
   * @param outputDir Directory containing Dolos CSV output
   * @param language Language used for analysis
   * @returns Parsed Dolos result with files and pairs
   */
  async parseOutput(outputDir: string, language: string): Promise<DolosResult> {
    const filesPath = path.join(outputDir, 'files.csv');
    const pairsPath = path.join(outputDir, 'pairs.csv');

    // Check if output files exist
    try {
      await fs.access(filesPath);
      await fs.access(pairsPath);
    } catch {
      throw new Error(`Dolos output files not found in ${outputDir}`);
    }

    const filesContent = await fs.readFile(filesPath, 'utf-8');
    const pairsContent = await fs.readFile(pairsPath, 'utf-8');

    const files = this.parseCsv<DolosFile>(filesContent, (row) => {
      // Parse extra field which contains metadata as JSON
      let label = '';
      let fullName = '';
      if (row.extra) {
        try {
          const extra = JSON.parse(row.extra);
          label = extra.labels || extra.label || '';
          fullName = extra.fullName || extra.full_name || '';
        } catch {
          // Fallback to extracting from filename
          const pathParts = (row.path || '').split('/');
          const filename = pathParts[pathParts.length - 1] || '';
          label = filename.replace(/\.[^/.]+$/, '');
        }
      }
      return {
        id: parseInt(row.id, 10),
        path: row.path,
        charCount: parseInt(row.charCount || row.amountOfKgrams || '0', 10),
        lineCount: parseInt(row.lineCount || '0', 10),
        label,
        fullName,
      };
    });

    const pairs = this.parseCsv<DolosPair>(pairsContent, (row) => ({
      leftFileId: parseInt(row.leftFileId, 10),
      rightFileId: parseInt(row.rightFileId, 10),
      similarity: parseFloat(row.similarity),
      longestFragment: parseInt(row.longestFragment || '0', 10),
      totalOverlap: parseInt(row.totalOverlap || '0', 10),
    }));

    this.logger.log(
      `Parsed Dolos output: ${files.length} files, ${pairs.length} pairs`,
    );

    return { files, pairs, language };
  }

  /**
   * Generic CSV parser that handles multiline quoted content
   */
  private parseCsv<T>(
    content: string,
    mapper: (row: Record<string, string>) => T,
  ): T[] {
    // Remove BOM if present
    const cleanContent = content.replace(/^\uFEFF/, '');

    // Parse all rows handling multiline quoted content
    const rows = this.parseCsvContent(cleanContent);
    if (rows.length < 2) return [];

    const headers = rows[0];
    const results: T[] = [];

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      try {
        results.push(mapper(row));
      } catch (e) {
        this.logger.warn(`Failed to parse CSV row ${i}`, e);
      }
    }

    return results;
  }

  /**
   * Parse CSV content handling multiline quoted values
   */
  private parseCsvContent(content: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          // Escaped quote
          currentValue += '"';
          i++; // Skip next quote
        } else if (char === '"') {
          // End of quoted value
          inQuotes = false;
        } else {
          // Include any character (including newlines) in quoted value
          currentValue += char;
        }
      } else {
        if (char === '"') {
          // Start of quoted value
          inQuotes = true;
        } else if (char === ',') {
          // Field separator
          currentRow.push(currentValue);
          currentValue = '';
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          // Row separator
          if (char === '\r') i++; // Skip \n in \r\n
          currentRow.push(currentValue);
          if (currentRow.length > 0 && currentRow.some(v => v !== '')) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentValue = '';
        } else if (char !== '\r') {
          currentValue += char;
        }
      }
    }

    // Don't forget the last value and row
    if (currentValue || currentRow.length > 0) {
      currentRow.push(currentValue);
      if (currentRow.some(v => v !== '')) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * Prepare input directory with source files and info.csv
   * @param workDir Working directory
   * @param files Map of filename to content
   * @param metadata Map of filename to metadata (label, fullName)
   */
  async prepareInput(
    workDir: string,
    files: Map<string, string>,
    metadata: Map<string, { label: string; fullName: string }>,
  ): Promise<void> {
    await fs.mkdir(workDir, { recursive: true });

    // Write source files
    for (const [filename, content] of files) {
      const filePath = path.join(workDir, filename);
      await fs.writeFile(filePath, content, 'utf-8');
    }

    // Generate info.csv for better visualization
    const infoCsvLines = ['filename,label,full_name'];
    for (const [filename, meta] of metadata) {
      // Escape CSV values
      const escapedLabel = this.escapeCsvValue(meta.label);
      const escapedFullName = this.escapeCsvValue(meta.fullName);
      infoCsvLines.push(`${filename},${escapedLabel},${escapedFullName}`);
    }

    const infoCsvPath = path.join(workDir, 'info.csv');
    await fs.writeFile(infoCsvPath, infoCsvLines.join('\n'), 'utf-8');

    this.logger.log(
      `Prepared ${files.size} files in ${workDir} with info.csv`,
    );
  }

  /**
   * Escape a value for CSV
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Clean up working directory
   */
  async cleanup(workDir: string): Promise<void> {
    try {
      await fs.rm(workDir, { recursive: true, force: true });
      this.logger.log(`Cleaned up working directory: ${workDir}`);
    } catch (e) {
      this.logger.warn(`Failed to clean up ${workDir}:`, e);
    }
  }
}
