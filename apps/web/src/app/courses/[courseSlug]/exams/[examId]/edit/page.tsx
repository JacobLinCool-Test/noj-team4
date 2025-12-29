import { EditExamPageContent } from "./page-content";

type Props = {
  params: Promise<{ courseSlug: string; examId: string }>;
};

export default async function EditExamPage({ params }: Props) {
  const resolvedParams = await params;
  const { courseSlug, examId } = resolvedParams;

  return <EditExamPageContent courseSlug={courseSlug} examId={examId} />;
}
