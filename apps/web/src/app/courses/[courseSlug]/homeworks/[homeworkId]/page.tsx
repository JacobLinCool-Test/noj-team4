import { notFound } from "next/navigation";
import { HomeworkDetailContent } from "./page-content";

type Props = {
  params: Promise<{ courseSlug: string; homeworkId: string }>;
};

export default async function HomeworkDetailPage({ params }: Props) {
  const resolved = await params;
  if (!resolved.homeworkId) {
    notFound();
  }

  return <HomeworkDetailContent courseSlug={resolved.courseSlug} homeworkId={resolved.homeworkId} />;
}
