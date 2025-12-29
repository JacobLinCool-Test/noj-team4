import { IsString, Length, Matches } from 'class-validator';

export class ExamLoginDto {
  /**
   * 6 位考試登入代碼（大寫英數，排除易混淆字元）
   */
  @IsString()
  @Length(6, 6)
  @Matches(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/, {
    message: 'Invalid exam code format',
  })
  code: string;
}
