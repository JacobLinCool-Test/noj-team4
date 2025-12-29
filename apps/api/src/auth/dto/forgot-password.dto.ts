import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  identifier!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;
}
