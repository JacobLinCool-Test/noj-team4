import { Type, Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsBoolean, Max, Min } from 'class-validator';
import { AiProvider } from '@prisma/client';

export class AiGlobalConfigDto {
  @IsEnum(AiProvider)
  provider!: AiProvider;

  @IsOptional()
  @IsString()
  openaiModel?: string;

  @IsOptional()
  @IsString()
  geminiModel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8192)
  maxOutputTokens?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsString()
  safetyLevel?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  forceDisabled?: boolean;
}
