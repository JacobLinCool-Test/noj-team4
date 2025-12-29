import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ResendVerificationDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(255)
  identifier?: string;
}
