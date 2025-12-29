import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProblemDifficulty,
  ProblemVisibility,
  ProgrammingLanguage,
} from '@prisma/client';

class SampleCaseDto {
  @IsString()
  @MaxLength(2000)
  input: string;

  @IsString()
  @MaxLength(2000)
  output: string;
}

export class CreateProblemDto {
  @IsEnum(ProblemVisibility)
  visibility: ProblemVisibility;

  @IsEnum(ProblemDifficulty)
  difficulty: ProblemDifficulty;

  @IsArray()
  @IsEnum(ProgrammingLanguage, { each: true })
  allowedLanguages: ProgrammingLanguage[];

  @IsBoolean()
  canViewStdout: boolean;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  description: string;

  @IsString()
  input: string;

  @IsString()
  output: string;

  @IsOptional()
  @IsString()
  hint?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SampleCaseDto)
  sampleCases: SampleCaseDto[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  courseIds?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  // 雙語欄位
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
  @MaxLength(50, { each: true })
  tagsZh?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tagsEn?: string[];

  // AI 自動翻譯
  @IsOptional()
  @IsBoolean()
  autoTranslate?: boolean;
}
