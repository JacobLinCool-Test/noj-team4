export type CourseStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

export type CourseEnrollmentType = "INVITE_ONLY" | "APPROVAL" | "BY_LINK" | "PUBLIC";

export type CourseRole = "TEACHER" | "TA" | "STUDENT";

export type CourseSummary = {
  id: number;
  slug: string;
  code: string;
  name: string;
  term: string;
  description?: string | null;
  status: CourseStatus;
  enrollmentType: CourseEnrollmentType;
  isPublicListed?: boolean;
  joinToken?: string;
  myRole?: CourseRole | null;
  teacher?: {
    id: number;
    nickname: string;
  } | null;
  stats?: {
    memberCount?: number;
    problemCount?: number;
  };
};

export type CourseDetail = {
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
};

export type CourseMember = {
  id: string;
  userId: number;
  courseId: number;
  role: CourseRole;
  joinedAt: string;
  user: {
    id: number;
    username: string;
    nickname: string | null;
    email?: string;
  };
  canEditRole: boolean;
  canRemove: boolean;
};
