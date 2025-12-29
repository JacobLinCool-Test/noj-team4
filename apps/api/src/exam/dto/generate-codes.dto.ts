import { IsArray, IsInt, IsOptional, ArrayMinSize } from 'class-validator';

export class GenerateCodesDto {
  /**
   * 要生成代碼的學生 ID 列表（userId）
   * 必須是課程成員
   */
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  studentIds: number[];
}

export class DeleteCodeDto {
  @IsOptional()
  @IsInt()
  studentId?: number;
}
