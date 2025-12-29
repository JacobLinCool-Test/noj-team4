import { CourseRole } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';

export class CourseMemberInputDto {
  @IsInt()
  @IsPositive()
  userId!: number;

  @IsEnum(CourseRole)
  roleInCourse!: CourseRole;
}

export class AddCourseMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CourseMemberInputDto)
  members!: CourseMemberInputDto[];
}
