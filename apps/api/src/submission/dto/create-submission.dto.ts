import {
  IsEnum,
  IsString,
  IsOptional,
  IsInt,
  MaxLength,
} from 'class-validator';
import { ProgrammingLanguage } from '@prisma/client';

export class CreateSubmissionDto {
  @IsEnum(ProgrammingLanguage)
  language: ProgrammingLanguage;

  @IsString()
  @MaxLength(100000) // 100KB limit
  source: string;

  @IsOptional()
  @IsInt()
  courseId?: number;

  @IsOptional()
  @IsString()
  homeworkId?: string;
}
