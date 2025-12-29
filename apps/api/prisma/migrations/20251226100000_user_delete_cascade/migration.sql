-- Enable user deletion by setting up proper cascade behaviors
-- Related data will have userId set to NULL, preserving the data

-- =============================================
-- Step 1: Make columns nullable
-- =============================================

-- Course
ALTER TABLE "Course" ALTER COLUMN "createdById" DROP NOT NULL;

-- CourseInvitation
ALTER TABLE "CourseInvitation" ALTER COLUMN "invitedById" DROP NOT NULL;

-- CourseJoinRequest
ALTER TABLE "CourseJoinRequest" ALTER COLUMN "userId" DROP NOT NULL;

-- Announcement
ALTER TABLE "Announcement" ALTER COLUMN "authorId" DROP NOT NULL;

-- Problem
ALTER TABLE "Problem" ALTER COLUMN "ownerId" DROP NOT NULL;

-- Homework
ALTER TABLE "Homework" ALTER COLUMN "createdById" DROP NOT NULL;

-- Submission
ALTER TABLE "Submission" ALTER COLUMN "userId" DROP NOT NULL;

-- ProblemTestdata
ALTER TABLE "ProblemTestdata" ALTER COLUMN "uploadedById" DROP NOT NULL;

-- CopycatReport
ALTER TABLE "CopycatReport" ALTER COLUMN "requestedById" DROP NOT NULL;

-- CopycatPair
ALTER TABLE "CopycatPair" ALTER COLUMN "leftUserId" DROP NOT NULL;
ALTER TABLE "CopycatPair" ALTER COLUMN "rightUserId" DROP NOT NULL;

-- AdminActionLog
ALTER TABLE "AdminActionLog" ALTER COLUMN "adminId" DROP NOT NULL;

-- Exam
ALTER TABLE "Exam" ALTER COLUMN "createdById" DROP NOT NULL;

-- ExamCode
ALTER TABLE "ExamCode" ALTER COLUMN "studentId" DROP NOT NULL;

-- =============================================
-- Step 2: Drop old foreign key constraints
-- =============================================

-- AuditLog
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";

-- Course
ALTER TABLE "Course" DROP CONSTRAINT IF EXISTS "Course_createdById_fkey";
ALTER TABLE "Course" DROP CONSTRAINT IF EXISTS "Course_teacherId_fkey";

-- CourseMember
ALTER TABLE "CourseMember" DROP CONSTRAINT IF EXISTS "CourseMember_userId_fkey";
ALTER TABLE "CourseMember" DROP CONSTRAINT IF EXISTS "CourseMember_courseId_fkey";

-- CourseInvitation
ALTER TABLE "CourseInvitation" DROP CONSTRAINT IF EXISTS "CourseInvitation_invitedById_fkey";

-- CourseJoinRequest
ALTER TABLE "CourseJoinRequest" DROP CONSTRAINT IF EXISTS "CourseJoinRequest_userId_fkey";
ALTER TABLE "CourseJoinRequest" DROP CONSTRAINT IF EXISTS "CourseJoinRequest_reviewedById_fkey";

-- Announcement
ALTER TABLE "Announcement" DROP CONSTRAINT IF EXISTS "Announcement_authorId_fkey";

-- Problem
ALTER TABLE "Problem" DROP CONSTRAINT IF EXISTS "Problem_ownerId_fkey";

-- CourseProblem
ALTER TABLE "CourseProblem" DROP CONSTRAINT IF EXISTS "CourseProblem_addedById_fkey";

-- Homework
ALTER TABLE "Homework" DROP CONSTRAINT IF EXISTS "Homework_createdById_fkey";

-- Submission
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_userId_fkey";

-- ProblemTestdata
ALTER TABLE "ProblemTestdata" DROP CONSTRAINT IF EXISTS "ProblemTestdata_uploadedById_fkey";

-- CopycatReport
ALTER TABLE "CopycatReport" DROP CONSTRAINT IF EXISTS "CopycatReport_requestedById_fkey";

-- CopycatPair
ALTER TABLE "CopycatPair" DROP CONSTRAINT IF EXISTS "CopycatPair_leftUserId_fkey";
ALTER TABLE "CopycatPair" DROP CONSTRAINT IF EXISTS "CopycatPair_rightUserId_fkey";

-- AdminActionLog
ALTER TABLE "AdminActionLog" DROP CONSTRAINT IF EXISTS "AdminActionLog_adminId_fkey";

-- Exam
ALTER TABLE "Exam" DROP CONSTRAINT IF EXISTS "Exam_createdById_fkey";

-- ExamCode
ALTER TABLE "ExamCode" DROP CONSTRAINT IF EXISTS "ExamCode_studentId_fkey";

-- =============================================
-- Step 3: Add new foreign key constraints with proper ON DELETE behavior
-- =============================================

-- AuditLog: SET NULL
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Course: SET NULL for both
ALTER TABLE "Course" ADD CONSTRAINT "Course_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CourseMember: CASCADE (delete membership when user is deleted)
ALTER TABLE "CourseMember" ADD CONSTRAINT "CourseMember_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseMember" ADD CONSTRAINT "CourseMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CourseInvitation: SET NULL
ALTER TABLE "CourseInvitation" ADD CONSTRAINT "CourseInvitation_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CourseJoinRequest: SET NULL
ALTER TABLE "CourseJoinRequest" ADD CONSTRAINT "CourseJoinRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseJoinRequest" ADD CONSTRAINT "CourseJoinRequest_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Announcement: SET NULL
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Problem: SET NULL
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CourseProblem: SET NULL
ALTER TABLE "CourseProblem" ADD CONSTRAINT "CourseProblem_addedById_fkey"
  FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Homework: SET NULL
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Submission: SET NULL
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ProblemTestdata: SET NULL
ALTER TABLE "ProblemTestdata" ADD CONSTRAINT "ProblemTestdata_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CopycatReport: SET NULL
ALTER TABLE "CopycatReport" ADD CONSTRAINT "CopycatReport_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CopycatPair: SET NULL
ALTER TABLE "CopycatPair" ADD CONSTRAINT "CopycatPair_leftUserId_fkey"
  FOREIGN KEY ("leftUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CopycatPair" ADD CONSTRAINT "CopycatPair_rightUserId_fkey"
  FOREIGN KEY ("rightUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AdminActionLog: SET NULL
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Exam: SET NULL
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ExamCode: SET NULL
ALTER TABLE "ExamCode" ADD CONSTRAINT "ExamCode_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
