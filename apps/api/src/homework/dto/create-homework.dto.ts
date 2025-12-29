import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProgrammingLanguage } from '@prisma/client';

class HomeworkProblemInputDto {
  @IsString()
  problemId!: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ProgrammingLanguage, { each: true })
  allowedLanguagesOverride?: ProgrammingLanguage[];
}

export class CreateHomeworkDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HomeworkProblemInputDto)
  problems!: HomeworkProblemInputDto[];
}

export { HomeworkProblemInputDto };
