import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { DolosRunnerService } from './dolos-runner.service';
import {
  CopycatJobData,
  CopycatPairInput,
  SubmissionForCopycat,
  DolosResult,
} from './interfaces/copycat-job.interface';
import { ProgrammingLanguage, CopycatStatus } from '@prisma/client';

@Processor('copycat')
export class CopycatProcessor extends WorkerHost {
  private readonly logger = new Logger(CopycatProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly dolosRunner: DolosRunnerService,
  ) {
    super();
  }

  async process(job: Job<CopycatJobData>): Promise<void> {
    const { reportId, courseId, problemId } = job.data;
    const workDir = path.join(os.tmpdir(), `copycat-${reportId}`);

    this.logger.log(
      `Processing copycat job: reportId=${reportId}, courseId=${courseId}, problemId=${problemId}`,
    );

    try {
      // 1. Update status to RUNNING
      await this.prisma.copycatReport.update({
        where: { id: reportId },
        data: { status: CopycatStatus.RUNNING, startedAt: new Date() },
      });

      // 2. Collect submissions
      const submissions = await this.collectSubmissions(courseId, problemId);

      if (submissions.length === 0) {
        throw new Error('NO_SUBMISSIONS_TO_ANALYZE');
      }

      this.logger.log(`Collected ${submissions.length} submissions`);

      // 3. Group submissions by language
      const grouped = this.groupByLanguage(submissions);

      // 4. Prepare working directory
      await fs.mkdir(workDir, { recursive: true });

      // 5. Run Dolos for each language group and collect pairs
      const allPairs: CopycatPairInput[] = [];
      const analyzedLanguages: string[] = [];
      const userIdByUsername = new Map<string, number>();

      // Build username -> userId mapping
      for (const sub of submissions) {
        userIdByUsername.set(sub.user.username, sub.userId);
      }

      for (const [dolosLang, subs] of Object.entries(grouped)) {
        if (subs.length < 2) {
          this.logger.log(
            `Skipping ${dolosLang}: only ${subs.length} submission(s)`,
          );
          continue;
        }

        this.logger.log(`Analyzing ${subs.length} ${dolosLang} submissions`);

        const langDir = path.join(workDir, dolosLang);
        const submissionIdByUsername = await this.prepareDolosInput(langDir, subs);

        try {
          const outputDir = await this.dolosRunner.run(langDir, dolosLang);
          const result = await this.dolosRunner.parseOutput(outputDir, dolosLang);
          const pairs = this.convertDolosPairs(
            result,
            userIdByUsername,
            submissionIdByUsername,
            this.dolosLangToPrisma(dolosLang),
          );
          allPairs.push(...pairs);
          analyzedLanguages.push(dolosLang);
        } catch (e) {
          this.logger.error(`Dolos failed for ${dolosLang}:`, e);
          // Continue with other languages
        }
      }

      if (analyzedLanguages.length === 0) {
        throw new Error('DOLOS_ANALYSIS_FAILED_FOR_ALL_LANGUAGES');
      }

      // 6. Calculate summary
      const summary = this.calculateSummary(allPairs, analyzedLanguages);

      // 7. Upload Dolos output to MinIO
      const reportKey = `copycat/${reportId}/report.zip`;
      await this.uploadReportToMinio(workDir, reportKey);

      // 8. Save pairs to database (batch insert)
      if (allPairs.length > 0) {
        await this.prisma.copycatPair.createMany({
          data: allPairs.map((p) => ({
            reportId,
            leftUserId: p.leftUserId,
            leftSubmissionId: p.leftSubmissionId,
            rightUserId: p.rightUserId,
            rightSubmissionId: p.rightSubmissionId,
            language: p.language,
            similarity: p.similarity,
            longestFragment: p.longestFragment,
            totalOverlap: p.totalOverlap,
          })),
        });
      }

      // 9. Update report status
      const uniqueStudentIds = new Set<number>();
      for (const sub of submissions) {
        uniqueStudentIds.add(sub.userId);
      }

      await this.prisma.copycatReport.update({
        where: { id: reportId },
        data: {
          status: CopycatStatus.SUCCESS,
          summary,
          reportKey,
          studentCount: uniqueStudentIds.size,
          submissionCount: submissions.length,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Copycat analysis completed: ${allPairs.length} pairs found`,
      );
    } catch (error) {
      this.logger.error(`Copycat job failed for report ${reportId}:`, error);

      await this.prisma.copycatReport.update({
        where: { id: reportId },
        data: {
          status: CopycatStatus.FAILED,
          errorMessage:
            error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });

      throw error;
    } finally {
      // 10. Cleanup
      await this.dolosRunner.cleanup(workDir);
    }
  }

  /**
   * Collect latest AC submissions for each student in the course
   */
  private async collectSubmissions(
    courseId: number,
    problemId: string,
  ): Promise<SubmissionForCopycat[]> {
    // Get all students in the course
    const students = await this.prisma.courseMember.findMany({
      where: {
        courseId,
        roleInCourse: 'STUDENT',
        leftAt: null,
      },
      select: { userId: true },
    });

    const studentIds = students.map((s) => s.userId);

    if (studentIds.length === 0) {
      return [];
    }

    // Get all AC submissions for this problem from course students
    const allSubmissions = await this.prisma.submission.findMany({
      where: {
        problemId,
        courseId,
        userId: { in: studentIds },
        status: 'AC',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        language: true,
        sourceKey: true,
        user: {
          select: {
            username: true,
            nickname: true,
          },
        },
      },
    });

    // Keep only the latest AC submission per user per language
    const seen = new Map<string, boolean>();
    const result: SubmissionForCopycat[] = [];

    for (const sub of allSubmissions) {
      if (sub.userId === null) continue;
      const key = `${sub.userId}-${sub.language}`;
      if (!seen.has(key)) {
        seen.set(key, true);
        result.push(sub as SubmissionForCopycat);
      }
    }

    return result;
  }

  /**
   * Group submissions by Dolos language identifier
   */
  private groupByLanguage(
    submissions: SubmissionForCopycat[],
  ): Record<string, SubmissionForCopycat[]> {
    const groups: Record<string, SubmissionForCopycat[]> = {};

    for (const sub of submissions) {
      const dolosLang = this.prismaLangToDolos(sub.language);
      if (!groups[dolosLang]) {
        groups[dolosLang] = [];
      }
      groups[dolosLang].push(sub);
    }

    return groups;
  }

  /**
   * Map Prisma ProgrammingLanguage to Dolos language identifier
   */
  private prismaLangToDolos(lang: ProgrammingLanguage): string {
    switch (lang) {
      case 'C':
      case 'CPP':
        return 'cc';
      case 'PYTHON':
        return 'python';
      case 'JAVA':
        return 'java';
      default:
        return 'cc';
    }
  }

  /**
   * Map Dolos language identifier back to Prisma ProgrammingLanguage
   */
  private dolosLangToPrisma(dolosLang: string): ProgrammingLanguage {
    switch (dolosLang) {
      case 'cc':
        return 'CPP';
      case 'python':
        return 'PYTHON';
      case 'java':
        return 'JAVA';
      default:
        return 'CPP';
    }
  }

  /**
   * Get file extension for a programming language
   */
  private getFileExtension(lang: ProgrammingLanguage): string {
    switch (lang) {
      case 'C':
        return '.c';
      case 'CPP':
        return '.cpp';
      case 'PYTHON':
        return '.py';
      case 'JAVA':
        return '.java';
      default:
        return '.txt';
    }
  }

  /**
   * Prepare Dolos input directory with source files and info.csv
   * Returns a map of username -> submissionId
   */
  private async prepareDolosInput(
    langDir: string,
    submissions: SubmissionForCopycat[],
  ): Promise<Map<string, string>> {
    const files = new Map<string, string>();
    const metadata = new Map<string, { label: string; fullName: string }>();
    const submissionIdByUsername = new Map<string, string>();

    for (const sub of submissions) {
      // Download source code from MinIO
      const sourceCode = await this.minio.getObjectAsString(
        'noj-submissions',
        sub.sourceKey,
      );

      const ext = this.getFileExtension(sub.language);
      const filename = `${sub.user.username}${ext}`;

      files.set(filename, sourceCode);
      metadata.set(filename, {
        label: sub.user.username,
        fullName: sub.user.nickname || sub.user.username,
      });
      submissionIdByUsername.set(sub.user.username, sub.id);
    }

    await this.dolosRunner.prepareInput(langDir, files, metadata);
    return submissionIdByUsername;
  }

  /**
   * Convert Dolos pairs to our database format
   */
  private convertDolosPairs(
    result: DolosResult,
    userIdByUsername: Map<string, number>,
    submissionIdByUsername: Map<string, string>,
    language: ProgrammingLanguage,
  ): CopycatPairInput[] {
    const pairs: CopycatPairInput[] = [];

    // Build fileId -> username mapping
    const usernameByFileId = new Map<number, string>();
    for (const file of result.files) {
      usernameByFileId.set(file.id, file.label);
    }

    for (const pair of result.pairs) {
      const leftUsername = usernameByFileId.get(pair.leftFileId);
      const rightUsername = usernameByFileId.get(pair.rightFileId);

      if (!leftUsername || !rightUsername) {
        this.logger.warn(
          `Missing username for pair: ${pair.leftFileId}-${pair.rightFileId}`,
        );
        continue;
      }

      const leftUserId = userIdByUsername.get(leftUsername);
      const rightUserId = userIdByUsername.get(rightUsername);
      const leftSubmissionId = submissionIdByUsername.get(leftUsername);
      const rightSubmissionId = submissionIdByUsername.get(rightUsername);

      if (!leftUserId || !rightUserId) {
        this.logger.warn(
          `Missing userId for users: ${leftUsername}, ${rightUsername}`,
        );
        continue;
      }

      if (!leftSubmissionId || !rightSubmissionId) {
        this.logger.warn(
          `Missing submissionId for users: ${leftUsername}, ${rightUsername}`,
        );
        continue;
      }

      // Skip self-comparison
      if (leftUserId === rightUserId) {
        continue;
      }

      pairs.push({
        leftUserId,
        leftSubmissionId,
        rightUserId,
        rightSubmissionId,
        language,
        similarity: pair.similarity,
        longestFragment: pair.longestFragment,
        totalOverlap: pair.totalOverlap,
      });
    }

    return pairs;
  }

  /**
   * Calculate summary statistics for the report
   */
  private calculateSummary(
    pairs: CopycatPairInput[],
    languages: string[],
  ): object {
    if (pairs.length === 0) {
      return {
        languages,
        avgSimilarity: 0,
        maxSimilarity: 0,
        suspiciousPairCount: 0,
      };
    }

    const similarities = pairs.map((p) => p.similarity);
    const avgSimilarity =
      similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const maxSimilarity = Math.max(...similarities);
    const suspiciousPairCount = pairs.filter((p) => p.similarity >= 0.5).length;

    return {
      languages,
      avgSimilarity: Math.round(avgSimilarity * 1000) / 1000,
      maxSimilarity: Math.round(maxSimilarity * 1000) / 1000,
      suspiciousPairCount,
    };
  }

  /**
   * Upload Dolos output directory as a zip to MinIO
   */
  private async uploadReportToMinio(
    workDir: string,
    reportKey: string,
  ): Promise<void> {
    const zipPath = path.join(os.tmpdir(), `${path.basename(workDir)}.zip`);

    try {
      // Create zip archive
      await this.createZipArchive(workDir, zipPath);

      // Upload to MinIO
      const zipBuffer = await fs.readFile(zipPath);
      await this.minio.ensureBucketExists('noj-copycat');
      await this.minio.putObject('noj-copycat', reportKey, zipBuffer);

      this.logger.log(`Uploaded report to MinIO: ${reportKey}`);
    } finally {
      // Cleanup zip file
      try {
        await fs.unlink(zipPath);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Create a zip archive from a directory
   */
  private createZipArchive(sourceDir: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err: Error) => reject(err));

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }
}
