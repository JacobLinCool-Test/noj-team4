import { EditCoursePageContent } from "./page-content";

type Props = {
  params: Promise<{ courseSlug: string }>;
};

export default async function EditCoursePage({ params }: Props) {
  const resolvedParams = await params;
  const courseSlug = resolvedParams.courseSlug;

  return <EditCoursePageContent courseSlug={courseSlug} />;
}
