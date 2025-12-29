import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class UserPreferencesDto {
  @IsOptional()
  @IsInt()
  @Min(6)
  @Max(50)
  editorFontSize?: number;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsInt()
  @Min(6)
  @Max(50)
  editorFontSize?: number;
}

export const DEFAULT_PREFERENCES: UserPreferencesDto = {
  editorFontSize: 16,
};
