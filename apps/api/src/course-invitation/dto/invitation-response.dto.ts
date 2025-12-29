import { CourseInvitationStatus } from '@prisma/client';

export class InvitationCourseDto {
  id!: number;
  slug!: string;
  name!: string;
  term!: string;
}

export class InvitationUserDto {
  id!: number;
  username!: string;
  nickname!: string | null;
}

export class CourseInvitationResponseDto {
  id!: string;
  courseId!: number;
  course!: InvitationCourseDto;
  email!: string;
  status!: CourseInvitationStatus;
  invitedBy!: InvitationUserDto;
  createdAt!: Date;
  respondedAt!: Date | null;
}
