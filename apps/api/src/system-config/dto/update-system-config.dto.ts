import { IsBoolean, IsInt, IsOptional, IsDateString, Min } from 'class-validator';

export class UpdateSystemConfigDto {
  // Registration control
  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;

  @IsOptional()
  @IsDateString()
  registrationDisabledUntil?: string | null;

  // Email sending control
  @IsOptional()
  @IsBoolean()
  emailSendingEnabled?: boolean;

  @IsOptional()
  @IsDateString()
  emailSendingDisabledUntil?: string | null;

  // Email rate limits - Verify
  @IsOptional()
  @IsInt()
  @Min(1)
  emailRlVerifyTtl?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  emailRlVerifyToLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  emailRlVerifyIpLimit?: number | null;

  // Email rate limits - Reset
  @IsOptional()
  @IsInt()
  @Min(1)
  emailRlResetTtl?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  emailRlResetToLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  emailRlResetIpLimit?: number | null;

  // Email rate limits - Global IP
  @IsOptional()
  @IsInt()
  @Min(1)
  emailRlGlobalIpTtl?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  emailRlGlobalIpLimit?: number | null;
}
