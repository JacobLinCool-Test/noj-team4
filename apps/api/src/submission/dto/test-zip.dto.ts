import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { ProgrammingLanguage } from '@prisma/client';

export class TestZipDto {
  @IsEnum(ProgrammingLanguage)
  language: ProgrammingLanguage;

  @IsOptional()
  @IsString()
  homeworkId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000) // 10KB limit for custom input
  customInput?: string;
}
