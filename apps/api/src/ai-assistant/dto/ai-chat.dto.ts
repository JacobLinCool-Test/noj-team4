import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class AiChatRequestDto {
  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsBoolean()
  attachLatestSubmission?: boolean;

  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @IsOptional()
  @IsString()
  currentProblemId?: string;
}

export type AiChatResponseDto = {
  conversationId: string;
  message: string;
  filtered: boolean;
};
