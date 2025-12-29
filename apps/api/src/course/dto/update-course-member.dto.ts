import { CourseRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateCourseMemberDto {
  @IsEnum(CourseRole)
  roleInCourse!: CourseRole;
}
