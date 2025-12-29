import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateEmailDomainDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  domain!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateEmailDomainDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  domain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
