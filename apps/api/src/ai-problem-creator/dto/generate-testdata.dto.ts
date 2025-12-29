import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProgrammingLanguage } from '@prisma/client';

export class TestCaseInputDto {
  @IsString()
  input: string;

  @IsString()
  output: string;
}

export class GenerateTestdataDto {
  @IsString()
  sessionId: string;

  @IsEnum(ProgrammingLanguage)
  solutionLanguage: ProgrammingLanguage;

  @IsString()
  @MaxLength(50000)
  solutionCode: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  testInputs: string[];
}

export class GenerateTestdataOnlyDto {
  @IsString()
  @MaxLength(10000)
  problemDescription: string;

  @IsString()
  @MaxLength(2000)
  inputFormat: string;

  @IsString()
  @MaxLength(2000)
  outputFormat: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestCaseInputDto)
  sampleCases: TestCaseInputDto[];

  @IsOptional()
  @IsNumber()
  numTestCases?: number;

  @IsOptional()
  @IsString()
  problemId?: string;
}

export class TestCaseResultDto {
  index: number;
  input: string;
  output: string;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  errorMessage?: string;
  timeMs?: number;
}

export class GenerateTestdataResponseDto {
  success: boolean;
  testCases: TestCaseResultDto[];
  totalGenerated: number;
  failedCount: number;
  solutionExecutionTime?: number;
}

export class ExecutionErrorDto {
  type: 'COMPILE_ERROR' | 'RUNTIME_ERROR' | 'TIMEOUT' | 'MEMORY_LIMIT';
  message: string;
  details?: string;
}
