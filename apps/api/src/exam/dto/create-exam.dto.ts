import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsBoolean,
  MinLength,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';

export class CreateExamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  problemIds: string[];

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipAllowList?: string[];

  @IsOptional()
  @IsBoolean()
  scoreboardVisible?: boolean;
}
