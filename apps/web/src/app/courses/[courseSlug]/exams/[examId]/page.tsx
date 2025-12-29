import { ExamDetailPageContent } from "./page-content";

type Props = {
  params: Promise<{ courseSlug: string; examId: string }>;
};

export default async function ExamDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const { courseSlug, examId } = resolvedParams;

  return <ExamDetailPageContent courseSlug={courseSlug} examId={examId} />;
}
