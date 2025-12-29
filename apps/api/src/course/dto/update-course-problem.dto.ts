import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProblemDifficulty, ProgrammingLanguage } from '@prisma/client';
import { CourseProblemSampleCaseDto } from './create-course-problem.dto';

export class UpdateCourseProblemDto {
  @IsOptional()
  @IsEnum(ProblemDifficulty)
  difficulty?: ProblemDifficulty;

  @IsOptional()
  @IsArray()
  @IsEnum(ProgrammingLanguage, { each: true })
  allowedLanguages?: ProgrammingLanguage[];

  @IsOptional()
  @IsBoolean()
  canViewStdout?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  input?: string;

  @IsOptional()
  @IsString()
  output?: string;

  @IsOptional()
  @IsString()
  hint?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseProblemSampleCaseDto)
  sampleCases?: CourseProblemSampleCaseDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-1)
  quota?: number;
}
