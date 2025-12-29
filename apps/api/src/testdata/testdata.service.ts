import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  StreamableFile,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { UserRole, CourseRole } from '@prisma/client';
import AdmZip from 'adm-zip';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TestdataManifestDto } from './dto/testdata-manifest.dto';
import { TestdataManifest, TestdataCase } from './types/manifest.interface';
import { SubtaskConfigDto, SubtaskDto } from './dto/subtask-config.dto';

const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_CASES = 100;
const MAX_SUBTASKS = 100;

@Injectable()
export class TestdataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  /**
   * Check if user can manage testdata for a problem
   * Allowed: problem owner, course TEACHER/TA (if problem is in a course), admins
   */
  private async canManageTestdata(
    problem: { id: string; ownerId: number | null },
    userId: number,
    userRole: UserRole,
  ): Promise<boolean> {
    // Admin can manage all
    if (userRole === UserRole.ADMIN) return true;

    // Problem owner can manage (if owner exists)
    if (problem.ownerId !== null && problem.ownerId === userId) return true;

    // Check if user is TEACHER/TA in any course that contains this problem
    const courseProblem = await this.prisma.courseProblem.findFirst({
      where: { problemId: problem.id },
      include: {
        course: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (courseProblem?.course?.members?.[0]) {
      const role = courseProblem.course.members[0].roleInCourse;
      if (role === CourseRole.TEACHER || role === CourseRole.TA) {
        return true;
      }
    }

    return false;
  }

  /**
   * Upload testdata package for a problem
   * Accessible by problem owner, teachers, and admins
   */
  async uploadTestdata(
    problemDisplayId: string,
    userId: number,
    userRole: UserRole,
    zipBuffer: Buffer,
  ) {
    // Validate ZIP size
    if (zipBuffer.length > MAX_ZIP_SIZE) {
      throw new BadRequestException('TESTDATA_ZIP_TOO_LARGE');
    }

    // Find problem
    const problem = await this.prisma.problem.findUnique({
      where: { displayId: problemDisplayId },
    });

    if (!problem) {
      throw new NotFoundException('PROBLEM_NOT_FOUND');
    }

    // Permission check: owner, course teacher/TA, or admin
    if (!(await this.canManageTestdata(problem, userId, userRole))) {
      throw new ForbiddenException('TESTDATA_UPLOAD_FORBIDDEN');
    }

    // Parse and validate ZIP
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipBuffer);
    } catch (error) {
      throw new BadRequestException('TESTDATA_INVALID_ZIP');
    }

    const entries = zip.getEntries();

    // Security: Check total uncompressed size
    const totalSize = entries.reduce(
      (sum, entry) => sum + entry.header.size,
      0,
    );
    if (totalSize > MAX_UNCOMPRESSED_SIZE) {
      throw new BadRequestException('TESTDATA_UNCOMPRESSED_TOO_LARGE');
    }

    // Security: Check for path traversal and dangerous paths
    for (const entry of entries) {
      if (entry.entryName.includes('..')) {
        throw new BadRequestException('TESTDATA_PATH_TRAVERSAL_DETECTED');
      }
      if (entry.entryName.startsWith('/')) {
        throw new BadRequestException('TESTDATA_ABSOLUTE_PATH_NOT_ALLOWED');
      }
      // No symlinks allowed (checked via isDirectory - symlinks are treated as files)
      if (!entry.isDirectory && entry.header.attr === 0o120000) {
        throw new BadRequestException('TESTDATA_SYMLINK_NOT_ALLOWED');
      }
    }

    // Extract and validate manifest.json
    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) {
      throw new BadRequestException('TESTDATA_MANIFEST_NOT_FOUND');
    }

    let manifest: TestdataManifest;
    try {
      const manifestContent = manifestEntry.getData().toString('utf-8');
      const manifestJson = JSON.parse(manifestContent);
      const manifestDto = plainToInstance(TestdataManifestDto, manifestJson);

      const errors = await validate(manifestDto);
      if (errors.length > 0) {
        const messages = errors
          .map((err) => Object.values(err.constraints || {}).join(', '))
          .join('; ');
        throw new BadRequestException(`TESTDATA_MANIFEST_INVALID: ${messages}`);
      }

      manifest = manifestJson;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('TESTDATA_MANIFEST_PARSE_ERROR');
    }

    // Validate case count
    if (manifest.cases.length > MAX_CASES) {
      throw new BadRequestException(
        `TESTDATA_TOO_MANY_CASES: max ${MAX_CASES}`,
      );
    }

    // Validate that all referenced files exist in the ZIP
    for (const testCase of manifest.cases) {
      const inputEntry = zip.getEntry(testCase.inputFile);
      const outputEntry = zip.getEntry(testCase.outputFile);

      if (!inputEntry || inputEntry.isDirectory) {
        throw new BadRequestException(
          `TESTDATA_INPUT_FILE_NOT_FOUND: ${testCase.inputFile}`,
        );
      }
      if (!outputEntry || outputEntry.isDirectory) {
        throw new BadRequestException(
          `TESTDATA_OUTPUT_FILE_NOT_FOUND: ${testCase.outputFile}`,
        );
      }
    }

    // Get next version number
    const latestTestdata = await this.prisma.problemTestdata.findFirst({
      where: { problemId: problem.id },
      orderBy: { version: 'desc' },
    });

    const version = (latestTestdata?.version || 0) + 1;
    const isFirstVersion = !latestTestdata;

    // Upload to MinIO
    const zipKey = `testdata/${problem.id}/v${version}/testdata.zip`;
    await this.minio.putObject('noj-testdata', zipKey, zipBuffer, {
      'Content-Type': 'application/zip',
    });

    // Create database record
    // Auto-activate if this is the first version uploaded
    const testdata = await this.prisma.problemTestdata.create({
      data: {
        problemId: problem.id,
        version,
        zipKey,
        manifest: manifest as any,
        isActive: isFirstVersion,
        uploadedById: userId,
      },
    });

    return {
      id: testdata.id,
      version: testdata.version,
      caseCount: manifest.cases.length,
      isActive: isFirstVersion,
      message: isFirstVersion
        ? 'TESTDATA_UPLOADED_AND_ACTIVATED'
        : 'TESTDATA_UPLOADED_SUCCESS',
    };
  }

  /**
   * Set a testdata version as active
   */
  async setActiveVersion(
    problemDisplayId: string,
    version: number,
    userId: number,
    userRole: UserRole,
  ) {
    const problem = await this.prisma.problem.findUnique({
      where: { displayId: problemDisplayId },
    });

    if (!problem) {
      throw new NotFoundException('PROBLEM_NOT_FOUND');
    }

    // Permission check: owner, course teacher/TA, or admin
    if (!(await this.canManageTestdata(problem, userId, userRole))) {
      throw new ForbiddenException('TESTDATA_MANAGE_FORBIDDEN');
    }

    const testdata = await this.prisma.problemTestdata.findFirst({
      where: {
        problemId: problem.id,
        version,
      },
    });

    if (!testdata) {
      throw new NotFoundException('TESTDATA_VERSION_NOT_FOUND');
    }

    // Deactivate all other versions and activate this one
    await this.prisma.$transaction([
      this.prisma.problemTestdata.updateMany({
        where: { problemId: problem.id },
        data: { isActive: false },
      }),
      this.prisma.problemTestdata.update({
        where: { id: testdata.id },
        data: { isActive: true },
      }),
    ]);

    return { message: 'TESTDATA_VERSION_ACTIVATED', version };
  }

  /**
   * List all testdata versions for a problem
   */
  async listVersions(
    problemDisplayId: string,
    userId: number,
    userRole: UserRole,
  ) {
    const problem = await this.prisma.problem.findUnique({
      where: { displayId: problemDisplayId },
    });

    if (!problem) {
      throw new NotFoundException('PROBLEM_NOT_FOUND');
    }

    // Permission check: owner, course teacher/TA, or admin
    if (!(await this.canManageTestdata(problem, userId, userRole))) {
      throw new ForbiddenException('TESTDATA_VIEW_FORBIDDEN');
    }

    const versions = await this.prisma.problemTestdata.findMany({
      where: { problemId: problem.id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            username: true,
            nickname: true,
          },
        },
      },
      orderBy: { version: 'desc' },
    });

    return versions.map((v) => ({
      id: v.id,
      version: v.version,
      isActive: v.isActive,
      caseCount: (v.manifest as any as TestdataManifest).cases.length,
      uploadedAt: v.uploadedAt,
      uploadedBy: v.uploadedBy,
    }));
  }

  /**
   * Get active testdata for a problem (used by judge worker)
   */
  async getActiveTestdata(problemId: string) {
    const testdata = await this.prisma.problemTestdata.findFirst({
      where: {
        problemId,
        isActive: true,
      },
    });

    if (!testdata) {
      return null;
    }

    return {
      id: testdata.id,
      version: testdata.version,
      zipKey: testdata.zipKey,
      manifest: testdata.manifest as any as TestdataManifest,
    };
  }

  /**
   * Upload testdata with subtask configuration (sstt.in/out format)
   * The first subtask (index 0) is automatically marked as sample cases.
   */
  async uploadTestdataWithSubtasks(
    problemDisplayId: string,
    userId: number,
    userRole: UserRole,
    zipBuffer: Buffer,
    config: SubtaskConfigDto,
  ) {
    // Validate ZIP size
    if (zipBuffer.length > MAX_ZIP_SIZE) {
      throw new BadRequestException('TESTDATA_ZIP_TOO_LARGE');
    }

    // Find problem
    const problem = await this.prisma.problem.findUnique({
      where: { displayId: problemDisplayId },
    });

    if (!problem) {
      throw new NotFoundException('PROBLEM_NOT_FOUND');
    }

    // Permission check: owner, course teacher/TA, or admin
    if (!(await this.canManageTestdata(problem, userId, userRole))) {
      throw new ForbiddenException('TESTDATA_UPLOAD_FORBIDDEN');
    }

    // Validate subtask configuration
    if (config.subtasks.length > MAX_SUBTASKS) {
      throw new BadRequestException(
        `TESTDATA_TOO_MANY_SUBTASKS: max ${MAX_SUBTASKS}`,
      );
    }

    const totalCases = config.subtasks.reduce((sum, s) => sum + s.caseCount, 0);
    if (totalCases > MAX_CASES) {
      throw new BadRequestException(
        `TESTDATA_TOO_MANY_CASES: total ${totalCases} exceeds max ${MAX_CASES}`,
      );
    }

    // Parse and validate ZIP
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipBuffer);
    } catch (error) {
      throw new BadRequestException('TESTDATA_INVALID_ZIP');
    }

    const entries = zip.getEntries();

    // Security: Check total uncompressed size
    const totalSize = entries.reduce(
      (sum, entry) => sum + entry.header.size,
      0,
    );
    if (totalSize > MAX_UNCOMPRESSED_SIZE) {
      throw new BadRequestException('TESTDATA_UNCOMPRESSED_TOO_LARGE');
    }

    // Security: Check for path traversal and dangerous paths
    for (const entry of entries) {
      if (entry.entryName.includes('..')) {
        throw new BadRequestException('TESTDATA_PATH_TRAVERSAL_DETECTED');
      }
      if (entry.entryName.startsWith('/')) {
        throw new BadRequestException('TESTDATA_ABSOLUTE_PATH_NOT_ALLOWED');
      }
      if (!entry.isDirectory && entry.header.attr === 0o120000) {
        throw new BadRequestException('TESTDATA_SYMLINK_NOT_ALLOWED');
      }
    }

    // Validate sstt.in/out files exist
    const validation = this.validateSsttFiles(zip, config.subtasks);
    if (!validation.valid) {
      throw new BadRequestException(
        `TESTDATA_MISSING_FILES: ${validation.missingFiles.slice(0, 10).join(', ')}${validation.missingFiles.length > 10 ? ` and ${validation.missingFiles.length - 10} more` : ''}`,
      );
    }

    // Generate manifest from subtask config
    const manifest = this.generateManifestFromSubtasks(config);

    // Create new ZIP with manifest.json
    const newZipBuffer = this.createZipWithManifest(zip, manifest);

    // Get next version number
    const latestTestdata = await this.prisma.problemTestdata.findFirst({
      where: { problemId: problem.id },
      orderBy: { version: 'desc' },
    });

    const version = (latestTestdata?.version || 0) + 1;
    const isFirstVersion = !latestTestdata;

    // Upload to MinIO
    const zipKey = `testdata/${problem.id}/v${version}/testdata.zip`;
    await this.minio.putObject('noj-testdata', zipKey, newZipBuffer, {
      'Content-Type': 'application/zip',
    });

    // Create database record
    const testdata = await this.prisma.problemTestdata.create({
      data: {
        problemId: problem.id,
        version,
        zipKey,
        manifest: manifest as any,
        isActive: isFirstVersion,
        uploadedById: userId,
      },
    });

    return {
      id: testdata.id,
      version: testdata.version,
      caseCount: manifest.cases.length,
      subtaskCount: config.subtasks.length,
      totalPoints: config.subtasks.reduce((sum, s) => sum + s.points, 0),
      isActive: isFirstVersion,
      message: isFirstVersion
        ? 'TESTDATA_UPLOADED_AND_ACTIVATED'
        : 'TESTDATA_UPLOADED_SUCCESS',
    };
  }

  /**
   * Validate that all expected sstt.in/out files exist in the ZIP
   */
  private validateSsttFiles(
    zip: AdmZip,
    subtasks: SubtaskDto[],
  ): { valid: boolean; missingFiles: string[] } {
    const missingFiles: string[] = [];

    for (let s = 0; s < subtasks.length; s++) {
      for (let t = 0; t < subtasks[s].caseCount; t++) {
        const ss = s.toString().padStart(2, '0');
        const tt = t.toString().padStart(2, '0');
        const inputFile = `${ss}${tt}.in`;
        const outputFile = `${ss}${tt}.out`;

        if (!zip.getEntry(inputFile)) {
          missingFiles.push(inputFile);
        }
        if (!zip.getEntry(outputFile)) {
          missingFiles.push(outputFile);
        }
      }
    }

    return {
      valid: missingFiles.length === 0,
      missingFiles,
    };
  }

  /**
   * Generate manifest.json from subtask configuration
   * The first subtask (index 0) is marked as sample cases.
   */
  private generateManifestFromSubtasks(config: SubtaskConfigDto): TestdataManifest {
    const cases: TestdataCase[] = [];

    for (let s = 0; s < config.subtasks.length; s++) {
      const subtask = config.subtasks[s];
      const isSampleSubtask = s === 0; // First subtask is sample

      // Distribute points evenly among cases, with remainder going to first cases
      const pointsPerCase = Math.floor(subtask.points / subtask.caseCount);
      const remainder = subtask.points % subtask.caseCount;

      for (let t = 0; t < subtask.caseCount; t++) {
        const ss = s.toString().padStart(2, '0');
        const tt = t.toString().padStart(2, '0');

        cases.push({
          name: `Subtask ${s + 1} - Case ${t + 1}`,
          inputFile: `${ss}${tt}.in`,
          outputFile: `${ss}${tt}.out`,
          points: pointsPerCase + (t < remainder ? 1 : 0),
          isSample: isSampleSubtask,
          timeLimitMs: subtask.timeLimitMs,
          memoryLimitKb: subtask.memoryLimitKb,
        });
      }
    }

    return {
      version: '1.0',
      cases,
      defaultTimeLimitMs: config.defaultTimeLimitMs,
      defaultMemoryLimitKb: config.defaultMemoryLimitKb,
    };
  }

  /**
   * Create a new ZIP with manifest.json added
   */
  private createZipWithManifest(
    originalZip: AdmZip,
    manifest: TestdataManifest,
  ): Buffer {
    const newZip = new AdmZip();

    // Copy all original entries (except any existing manifest.json)
    for (const entry of originalZip.getEntries()) {
      if (entry.entryName !== 'manifest.json' && !entry.isDirectory) {
        newZip.addFile(entry.entryName, entry.getData());
      }
    }

    // Add generated manifest.json
    newZip.addFile(
      'manifest.json',
      Buffer.from(JSON.stringify(manifest, null, 2)),
    );

    return newZip.toBuffer();
  }

  /**
   * Link AI-generated testdata to a problem using testdataKey
   */
  async linkAiTestdata(
    problemDisplayId: string,
    userId: number,
    userRole: UserRole,
    testdataKey: string,
  ) {
    // Find problem
    const problem = await this.prisma.problem.findUnique({
      where: { displayId: problemDisplayId },
    });

    if (!problem) {
      throw new NotFoundException('PROBLEM_NOT_FOUND');
    }

    // Permission check: owner, course teacher/TA, or admin
    if (!(await this.canManageTestdata(problem, userId, userRole))) {
      throw new ForbiddenException('TESTDATA_UPLOAD_FORBIDDEN');
    }

    // Verify the testdata exists in MinIO
    let zipBuffer: Buffer;
    try {
      zipBuffer = await this.minio.getObject('noj-testdata', testdataKey);
    } catch (error) {
      throw new NotFoundException('TESTDATA_KEY_NOT_FOUND');
    }

    // Parse the ZIP to get manifest
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipBuffer);
    } catch (error) {
      throw new BadRequestException('TESTDATA_INVALID_ZIP');
    }

    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) {
      throw new BadRequestException('TESTDATA_MANIFEST_NOT_FOUND');
    }

    let manifest: TestdataManifest;
    try {
      const manifestContent = manifestEntry.getData().toString('utf-8');
      manifest = JSON.parse(manifestContent);
    } catch (error) {
      throw new BadRequestException('TESTDATA_MANIFEST_PARSE_ERROR');
    }

    // Get next version number
    const latestTestdata = await this.prisma.problemTestdata.findFirst({
      where: { problemId: problem.id },
      orderBy: { version: 'desc' },
    });

    const version = (latestTestdata?.version || 0) + 1;
    const isFirstVersion = !latestTestdata;

    // Copy the testdata to the problem's folder
    const newZipKey = `testdata/${problem.id}/v${version}/testdata.zip`;
    await this.minio.putObject('noj-testdata', newZipKey, zipBuffer, {
      'Content-Type': 'application/zip',
    });

    // Create database record
    const testdata = await this.prisma.problemTestdata.create({
      data: {
        problemId: problem.id,
        version,
        zipKey: newZipKey,
        manifest: manifest as any,
        isActive: isFirstVersion,
        uploadedById: userId,
      },
    });

    return {
      id: testdata.id,
      version: testdata.version,
      caseCount: manifest.cases.length,
      subtaskCount: new Set(manifest.cases.map((c) => c.inputFile.slice(0, 2))).size,
      totalPoints: manifest.cases.reduce((sum, c) => sum + (c.points || 0), 0),
      isActive: isFirstVersion,
      message: isFirstVersion
        ? 'TESTDATA_UPLOADED_AND_ACTIVATED'
        : 'TESTDATA_UPLOADED_SUCCESS',
    };
  }

  /**
   * Download testdata ZIP for a specific version
   */
  async downloadTestdata(
    problemDisplayId: string,
    version: number,
    userId: number,
    userRole: UserRole,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const problem = await this.prisma.problem.findUnique({
      where: { displayId: problemDisplayId },
    });

    if (!problem) {
      throw new NotFoundException('PROBLEM_NOT_FOUND');
    }

    // Permission check: owner, course teacher/TA, or admin
    if (!(await this.canManageTestdata(problem, userId, userRole))) {
      throw new ForbiddenException('TESTDATA_DOWNLOAD_FORBIDDEN');
    }

    const testdata = await this.prisma.problemTestdata.findFirst({
      where: {
        problemId: problem.id,
        version,
      },
    });

    if (!testdata) {
      throw new NotFoundException('TESTDATA_VERSION_NOT_FOUND');
    }

    // Download from MinIO
    const buffer = await this.minio.getObject('noj-testdata', testdata.zipKey);

    return {
      buffer,
      filename: `testdata-${problemDisplayId}-v${version}.zip`,
    };
  }
}
