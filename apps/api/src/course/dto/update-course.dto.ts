import { CourseEnrollmentType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message:
      'slug must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  term?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  description?: string;

  @IsOptional()
  @IsEnum(CourseEnrollmentType)
  enrollmentType?: CourseEnrollmentType;

  @IsOptional()
  @IsBoolean()
  isPublicListed?: boolean;
}
