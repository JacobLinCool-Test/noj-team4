import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for validating a single test case in the manifest
 */
export class TestdataCaseDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_\-\/\.]+$/, {
    message:
      'inputFile must be a valid relative path without dangerous characters',
  })
  inputFile: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_\-\/\.]+$/, {
    message:
      'outputFile must be a valid relative path without dangerous characters',
  })
  outputFile: string;

  @IsNumber()
  @Min(0)
  points: number;

  @IsBoolean()
  isSample: boolean;

  @IsOptional()
  @IsNumber()
  @Min(100)
  timeLimitMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(1024)
  memoryLimitKb?: number;
}

/**
 * DTO for validating the testdata manifest.json file
 */
export class TestdataManifestDto {
  @IsString()
  @Matches(/^1\.\d+$/, {
    message: 'version must follow format "1.x" (e.g., "1.0", "1.1")',
  })
  version: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one test case is required' })
  @ValidateNested({ each: true })
  @Type(() => TestdataCaseDto)
  cases: TestdataCaseDto[];

  @IsNumber()
  @Min(100)
  defaultTimeLimitMs: number;

  @IsNumber()
  @Min(1024)
  defaultMemoryLimitKb: number;
}
