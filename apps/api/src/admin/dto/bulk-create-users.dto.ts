import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum PasswordMode {
  SPECIFIED = 'specified',
  RANDOM = 'random',
}

export class BulkCreateUsersDto {
  @IsArray()
  @IsEmail({}, { each: true })
  @IsNotEmpty({ each: true })
  emails: string[];

  @IsBoolean()
  autoVerify: boolean;

  @IsEnum(PasswordMode)
  passwordMode: PasswordMode;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsInt()
  courseId?: number;
}

export class BulkCreateUsersResultDto {
  created: Array<{
    email: string;
    username: string;
    userId: number;
    passwordSent: boolean;
  }>;
  skipped: Array<{
    email: string;
    reason: string;
  }>;
  errors: Array<{
    email: string;
    error: string;
  }>;
}
