import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { TokenScope } from '@prisma/client';

export class CreateApiTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsArray()
  @IsEnum(TokenScope, { each: true })
  scopes: TokenScope[];
}
