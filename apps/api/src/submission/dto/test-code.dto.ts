import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { ProgrammingLanguage } from '@prisma/client';

export class TestCodeDto {
  @IsEnum(ProgrammingLanguage)
  language: ProgrammingLanguage;

  @IsString()
  @MaxLength(100000) // 100KB limit
  source: string;

  @IsOptional()
  @IsString()
  homeworkId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000) // 10KB limit for custom input
  customInput?: string;
}
