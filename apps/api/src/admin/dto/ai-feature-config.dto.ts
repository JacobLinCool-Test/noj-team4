import { Type, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  ValidateNested,
  Max,
  Min,
} from 'class-validator';
import { AiProvider, AiFeature, ReasoningEffort } from '@prisma/client';

export class AiFeatureConfigDto {
  @IsEnum(AiFeature)
  feature!: AiFeature;

  @IsEnum(AiProvider)
  provider!: AiProvider;

  @IsString()
  model!: string;

  @IsOptional()
  @IsEnum(ReasoningEffort)
  reasoningEffort?: ReasoningEffort;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65536)
  maxOutputTokens?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateAllAiConfigsDto {
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  forceDisabled!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiFeatureConfigDto)
  configs!: AiFeatureConfigDto[];
}
