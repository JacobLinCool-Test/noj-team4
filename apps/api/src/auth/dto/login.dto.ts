import { IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  identifier!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
