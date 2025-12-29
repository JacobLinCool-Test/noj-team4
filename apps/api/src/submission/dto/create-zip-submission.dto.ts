import { IsEnum, IsOptional, IsString, IsNumberString } from 'class-validator';
import { ProgrammingLanguage } from '@prisma/client';

export class CreateZipSubmissionDto {
  @IsEnum(ProgrammingLanguage)
  language: ProgrammingLanguage;

  @IsOptional()
  @IsNumberString()
  courseId?: string;

  @IsOptional()
  @IsString()
  homeworkId?: string;
}
