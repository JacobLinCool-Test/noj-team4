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
import {
  ProblemDifficulty,
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

export class CreateCourseProblemDto {
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
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-1)
  quota?: number;
}

export { SampleCaseDto as CourseProblemSampleCaseDto };
