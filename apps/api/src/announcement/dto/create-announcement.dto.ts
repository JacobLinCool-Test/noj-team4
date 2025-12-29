import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsString()
  @MaxLength(20000)
  content!: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
