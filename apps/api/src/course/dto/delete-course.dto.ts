import { IsString, Length } from 'class-validator';

export class DeleteCourseDto {
  @IsString()
  @Length(1, 100)
  confirmName!: string;
}
