import { ExamsPageContent } from "./page-content";

type Props = {
  params: Promise<{ courseSlug: string }>;
};

export default async function CourseExamsPage({ params }: Props) {
  const resolvedParams = await params;
  const courseSlug = resolvedParams.courseSlug;

  return <ExamsPageContent courseSlug={courseSlug} />;
}
