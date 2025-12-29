import { CourseStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CourseQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  mine?: boolean;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @Transform(({ value }: { value?: unknown }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsString()
  @MaxLength(100)
  term?: string;

  @IsOptional()
  @Transform(({ value }: { value?: unknown }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  @IsString()
  include?: string;
}
