import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsInt,
  IsBoolean,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProblemDifficulty, ProblemVisibility, ProgrammingLanguage } from '@prisma/client';

export class SampleCaseDto {
  @IsString()
  @MaxLength(2000)
  input: string;

  @IsString()
  @MaxLength(2000)
  output: string;
}

export class PublishProblemDto {
  // Legacy single-language fields
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  description: string;

  @IsString()
  inputFormat: string;

  @IsString()
  outputFormat: string;

  @IsOptional()
  @IsString()
  hint?: string;

  // Bilingual fields
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleZh?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleEn?: string;

  @IsOptional()
  @IsString()
  descriptionZh?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  inputZh?: string;

  @IsOptional()
  @IsString()
  inputEn?: string;

  @IsOptional()
  @IsString()
  outputZh?: string;

  @IsOptional()
  @IsString()
  outputEn?: string;

  @IsOptional()
  @IsString()
  hintZh?: string;

  @IsOptional()
  @IsString()
  hintEn?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagsZh?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagsEn?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SampleCaseDto)
  @ArrayMinSize(1)
  sampleCases: SampleCaseDto[];

  @IsEnum(ProblemDifficulty)
  difficulty: ProblemDifficulty;

  @IsOptional()
  @IsEnum(ProblemVisibility)
  visibility?: ProblemVisibility;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(ProgrammingLanguage, { each: true })
  allowedLanguages?: ProgrammingLanguage[];

  @IsOptional()
  @IsBoolean()
  canViewStdout?: boolean;

  @IsInt()
  @Min(100)
  timeLimitMs: number;

  @IsInt()
  @Min(1024)
  memoryLimitKb: number;

  @IsOptional()
  @IsString()
  courseSlug?: string;

  @IsOptional()
  @IsInt()
  @Min(-1)
  quota?: number;

  @IsOptional()
  @IsBoolean()
  autoTranslate?: boolean;
}

export class PublishResponseDto {
  problemId: string;
  displayId: string;
  title: string;
  courseSlug?: string;
}
