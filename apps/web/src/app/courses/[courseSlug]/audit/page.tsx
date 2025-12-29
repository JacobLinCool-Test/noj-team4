import { CourseAuditPage } from "./_components/course-audit-page";

type Props = { params: Promise<{ courseSlug: string }> };

export default async function CourseAuditRoute({ params }: Props) {
  const resolvedParams = await params;
  const courseSlug = resolvedParams.courseSlug;

  return <CourseAuditPage courseSlug={courseSlug} />;
}
