import { CourseJoinRequestStatus } from '@prisma/client';

export class JoinRequestUserDto {
  id!: number;
  username!: string;
  nickname!: string | null;
}

export class JoinRequestCourseDto {
  id!: number;
  slug!: string;
  name!: string;
  term!: string;
}

export class CourseJoinRequestResponseDto {
  id!: string;
  courseId!: number;
  course!: JoinRequestCourseDto;
  userId!: number;
  user!: JoinRequestUserDto;
  status!: CourseJoinRequestStatus;
  createdAt!: Date;
  reviewedAt!: Date | null;
  reviewedBy!: JoinRequestUserDto | null;
}
