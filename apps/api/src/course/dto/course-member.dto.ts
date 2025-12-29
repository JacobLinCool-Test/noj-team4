import { CourseRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CourseMemberResponseDto {
  id!: string;
  userId!: number;
  courseId!: number;
  role!: CourseRole;
  joinedAt!: Date;
  user!: {
    id: number;
    username: string;
    nickname: string | null;
    email?: string;
  };
  canEditRole!: boolean;
  canRemove!: boolean;
}

export class UpdateCourseMemberRoleDto {
  @IsEnum(CourseRole)
  role!: CourseRole;
}
