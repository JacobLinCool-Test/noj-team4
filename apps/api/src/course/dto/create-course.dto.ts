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

export class CreateCourseDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsString()
  @Length(3, 30)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message:
      'slug must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen',
  })
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  term?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(CourseEnrollmentType)
  enrollmentType!: CourseEnrollmentType;

  @IsOptional()
  @IsBoolean()
  isPublicListed?: boolean;
}
