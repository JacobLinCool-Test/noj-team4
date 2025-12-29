import {
  IsArray,
  IsNumber,
  IsOptional,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Single subtask configuration
 * Each subtask represents a group of test cases with shared scoring
 */
export class SubtaskDto {
  /**
   * Number of test cases in this subtask
   * Files will be named: ss00.in/out, ss01.in/out, ... where ss is subtask index
   */
  @IsNumber()
  @Min(1, { message: 'Each subtask must have at least 1 test case' })
  @Max(100, { message: 'Each subtask can have at most 100 test cases' })
  caseCount: number;

  /**
   * Total points for this subtask (distributed evenly among cases)
   */
  @IsNumber()
  @Min(0, { message: 'Points cannot be negative' })
  points: number;

  /**
   * Optional time limit override for this subtask (milliseconds)
   * If not specified, uses defaultTimeLimitMs
   */
  @IsOptional()
  @IsNumber()
  @Min(100, { message: 'Time limit must be at least 100ms' })
  @Max(60000, { message: 'Time limit cannot exceed 60 seconds' })
  timeLimitMs?: number;

  /**
   * Optional memory limit override for this subtask (kilobytes)
   * If not specified, uses defaultMemoryLimitKb
   */
  @IsOptional()
  @IsNumber()
  @Min(1024, { message: 'Memory limit must be at least 1MB (1024KB)' })
  @Max(1048576, { message: 'Memory limit cannot exceed 1GB' })
  memoryLimitKb?: number;
}

/**
 * Configuration for uploading testdata with subtask structure
 *
 * The ZIP file should contain files in sstt.in/out format:
 * - ss: subtask index (00-99)
 * - tt: test case index within subtask (00-99)
 *
 * Example for 3 subtasks with 3, 5, 15 cases respectively:
 * - Subtask 0: 0000.in, 0000.out, 0001.in, 0001.out, 0002.in, 0002.out
 * - Subtask 1: 0100.in, 0100.out, ..., 0104.in, 0104.out
 * - Subtask 2: 0200.in, 0200.out, ..., 0214.in, 0214.out
 *
 * The first subtask (index 0) is automatically marked as sample cases.
 */
export class SubtaskConfigDto {
  /**
   * List of subtasks
   * Minimum 1, maximum 100 subtasks allowed
   */
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one subtask is required' })
  @ArrayMaxSize(100, { message: 'Maximum 100 subtasks allowed' })
  @ValidateNested({ each: true })
  @Type(() => SubtaskDto)
  subtasks: SubtaskDto[];

  /**
   * Default time limit in milliseconds
   * Applied to test cases that don't have a subtask-level override
   */
  @IsNumber()
  @Min(100, { message: 'Default time limit must be at least 100ms' })
  @Max(60000, { message: 'Default time limit cannot exceed 60 seconds' })
  defaultTimeLimitMs: number;

  /**
   * Default memory limit in kilobytes
   * Applied to test cases that don't have a subtask-level override
   */
  @IsNumber()
  @Min(1024, { message: 'Default memory limit must be at least 1MB (1024KB)' })
  @Max(1048576, { message: 'Default memory limit cannot exceed 1GB' })
  defaultMemoryLimitKb: number;
}
