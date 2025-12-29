import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import {
  UpdatePreferencesDto,
  UserPreferencesDto,
  DEFAULT_PREFERENCES,
} from './dto/user-preferences.dto';
import { Prisma, SubmissionStatus } from '@prisma/client';

const AVATAR_BUCKET = 'noj-avatars';
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  async getUserProfile(username: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        nickname: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: dto.nickname,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
      },
      select: {
        username: true,
        nickname: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return user;
  }

  async getUserStats(username: string) {
    // First get user to check if exists
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get total submissions count
    const totalSubmissions = await this.prisma.submission.count({
      where: { userId: user.id },
    });

    // Get AC count
    const acCount = await this.prisma.submission.count({
      where: {
        userId: user.id,
        status: SubmissionStatus.AC,
      },
    });

    // Calculate acceptance rate
    const acceptanceRate =
      totalSubmissions > 0
        ? Math.round((acCount / totalSubmissions) * 1000) / 10
        : 0;

    return {
      totalSubmissions,
      acCount,
      acceptanceRate,
    };
  }

  async getUserRecentSubmissions(username: string, limit: number = 10) {
    // First get user to check if exists
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get recent submissions
    const submissions = await this.prisma.submission.findMany({
      where: { userId: user.id },
      include: {
        problem: {
          select: {
            displayId: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return submissions;
  }

  async uploadAvatar(
    userId: number,
    file: Express.Multer.File,
  ): Promise<{ avatarUrl: string; message: string }> {
    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      throw new BadRequestException('AVATAR_TOO_LARGE');
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('AVATAR_INVALID_TYPE');
    }

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    // Ensure bucket exists
    await this.minio.ensureBucketExists(AVATAR_BUCKET);

    // Delete old avatar files (try all extensions)
    const extensions = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
    for (const ext of extensions) {
      try {
        await this.minio.deleteObject(
          AVATAR_BUCKET,
          `avatars/${userId}/avatar.${ext}`,
        );
      } catch {
        // Ignore deletion errors
      }
    }

    // Determine extension from MIME type
    const ext = file.mimetype === 'image/jpeg' ? 'jpg' : file.mimetype.split('/')[1];
    const key = `avatars/${userId}/avatar.${ext}`;

    // Upload to Minio
    await this.minio.putObject(AVATAR_BUCKET, key, file.buffer, {
      'Content-Type': file.mimetype,
    });

    // Update database with relative URL + cache busting
    const avatarUrl = `/users/${user.username}/avatar?v=${Date.now()}`;
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return {
      avatarUrl,
      message: 'AVATAR_UPLOADED',
    };
  }

  async removeAvatar(userId: number): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    // Delete Minio files (try all extensions)
    const extensions = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
    for (const ext of extensions) {
      try {
        await this.minio.deleteObject(
          AVATAR_BUCKET,
          `avatars/${userId}/avatar.${ext}`,
        );
      } catch {
        // Ignore deletion errors
      }
    }

    // Update database
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    return { message: 'AVATAR_REMOVED' };
  }

  async getAvatar(
    username: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, avatarUrl: true },
    });

    if (!user || !user.avatarUrl) {
      throw new NotFoundException('AVATAR_NOT_FOUND');
    }

    // Try different extensions
    const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const mimeMap: Record<string, string> = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    for (const ext of extensions) {
      try {
        const buffer = await this.minio.getObject(
          AVATAR_BUCKET,
          `avatars/${user.id}/avatar.${ext}`,
        );
        return { buffer, mimeType: mimeMap[ext] };
      } catch {
        // Try next extension
      }
    }

    throw new NotFoundException('AVATAR_NOT_FOUND');
  }

  async getPreferences(userId: number): Promise<UserPreferencesDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const stored = (user.preferences as UserPreferencesDto) || {};
    return {
      ...DEFAULT_PREFERENCES,
      ...stored,
    };
  }

  async updatePreferences(
    userId: number,
    dto: UpdatePreferencesDto,
  ): Promise<UserPreferencesDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const existingPrefs = (user.preferences as UserPreferencesDto) || {};
    const updatedPrefs: UserPreferencesDto = {
      ...existingPrefs,
      ...dto,
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: updatedPrefs as Prisma.InputJsonValue },
    });

    return {
      ...DEFAULT_PREFERENCES,
      ...updatedPrefs,
    };
  }
}
