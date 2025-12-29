'use client';

import { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useCourseDetail } from "@/hooks/useCourseDetail";
import type { CourseDetail, CourseRole } from "@/types/course";

interface CourseContextValue {
  course: CourseDetail | null;
  loading: boolean;
  error: string | null;
  unauthorized: boolean;
  notFound: boolean;
  refetch: () => void;
  setCourse: (data: CourseDetail | null) => void;
  // Computed properties
  isMember: boolean;
  isTeacher: boolean;
  isStaff: boolean;
  myRole: CourseRole | null;
}

const CourseContext = createContext<CourseContextValue | null>(null);

interface CourseProviderProps {
  courseSlug: string;
  children: ReactNode;
}

export function CourseProvider({ courseSlug, children }: CourseProviderProps) {
  const { accessToken } = useAuth();
  const {
    data: course,
    loading,
    error,
    unauthorized,
    notFound,
    refetch,
    setData: setCourse,
  } = useCourseDetail(courseSlug, accessToken);

  const myRole = course?.myRole ?? null;
  const isMember = myRole !== null;
  const isTeacher = myRole === "TEACHER";
  const isStaff = myRole === "TEACHER" || myRole === "TA";

  const value: CourseContextValue = {
    course,
    loading,
    error,
    unauthorized,
    notFound,
    refetch,
    setCourse,
    isMember,
    isTeacher,
    isStaff,
    myRole,
  };

  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) {
    throw new Error("useCourse must be used within CourseProvider");
  }
  return ctx;
}
