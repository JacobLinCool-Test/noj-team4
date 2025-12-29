import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CloneProblemToCourseDto {
  @IsString()
  sourceProblemId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-1)
  quota?: number;
}
