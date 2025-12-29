import { CourseEnrollmentType, CourseRole, CourseStatus } from '@prisma/client';

export class CourseDetailDto {
  id: number;
  slug: string;
  name: string;
  term: string;
  description: string | null;
  status: CourseStatus;
  enrollmentType: CourseEnrollmentType;
  teachers: Array<{
    id: number;
    username: string;
    nickname: string | null;
  }>;
  memberCount: number;
  myRole: CourseRole | null;
  homeworkCount: number;
  submissionCount: number;
}
