import {
  IsObject,
  IsOptional,
  IsArray,
  IsEnum,
  IsString,
} from 'class-validator';
import { SubmissionType } from '@prisma/client';

export class UpdatePipelineConfigDto {
  @IsOptional()
  @IsEnum(SubmissionType)
  submissionType?: SubmissionType;

  @IsOptional()
  @IsObject()
  pipelineConfig?: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  artifactPaths?: string[];

  @IsOptional()
  @IsObject()
  networkConfig?: any;
}
