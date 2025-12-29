// Demo Data Generator DTOs

export class DemoUserDto {
  username: string;
  email: string;
  password: string;
}

export class AdminUserDto {
  username: string;
  email: string;
  password: string | null; // null if already existed
  isNew: boolean;
}

export class DemoProblemDto {
  displayId: string;
  title: string;
  isNew: boolean;
}

export class DemoCourseDto {
  slug: string;
  name: string;
  problemCount: number;
  memberCount: number;
  homeworkCount: number;
  announcementCount: number;
  isNew: boolean;
}

export class DemoDataResultDto {
  adminUser: AdminUserDto;
  demoUsers: DemoUserDto[];
  publicProblems: DemoProblemDto[];
  courses: DemoCourseDto[];
  summary: {
    usersCreated: number;
    usersSkipped: number;
    problemsCreated: number;
    problemsSkipped: number;
    coursesCreated: number;
    coursesSkipped: number;
  };
}

export class ClearDemoDataResultDto {
  usersDeleted: number;
  problemsDeleted: number;
  coursesDeleted: number;
  success: boolean;
}

export class DemoDataStatusDto {
  hasAdminUser: boolean;
  adminUserId: number | null;
  demoUserCount: number;
  publicProblemCount: number;
  courseCount: number;
}
