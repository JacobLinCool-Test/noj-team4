import { CourseMembersPage } from "./_components/course-members-page";

type Props = { params: Promise<{ courseSlug: string }> };

export default async function CourseMembersRoute({ params }: Props) {
  const resolvedParams = await params;
  const courseSlug = resolvedParams.courseSlug;

  return <CourseMembersPage courseSlug={courseSlug} />;
}
