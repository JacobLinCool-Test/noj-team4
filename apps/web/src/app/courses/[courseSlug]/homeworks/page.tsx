import { HomeworksPageContent } from "./page-content";

type Props = {
  params: Promise<{ courseSlug: string }>;
};

export default async function CourseHomeworksPage({ params }: Props) {
  const resolvedParams = await params;
  const courseSlug = resolvedParams.courseSlug;

  return <HomeworksPageContent courseSlug={courseSlug} />;
}
