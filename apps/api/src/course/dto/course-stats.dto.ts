export class CourseStatsDto {
  memberCount: number;
  problemCount: number;
  homeworkCount: number;
  totalSubmissions: number;

  // Student-specific (only returned when myRole is STUDENT)
  myProgress?: {
    solvedCount: number;
    attemptedCount: number;
    submissionCount: number;
  };

  // Teacher/TA-specific
  recentActivity?: {
    submissionsToday: number;
    activeStudents: number;
  };
}
