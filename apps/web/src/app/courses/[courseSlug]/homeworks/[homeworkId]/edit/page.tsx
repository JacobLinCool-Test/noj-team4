import { notFound } from "next/navigation";
import { HomeworkEditContent } from "./page-content";

type Props = {
  params: Promise<{ courseSlug: string; homeworkId: string }>;
};

export default async function HomeworkEditPage({ params }: Props) {
  const resolved = await params;
  if (!resolved.homeworkId) {
    notFound();
  }

  return <HomeworkEditContent courseSlug={resolved.courseSlug} homeworkId={resolved.homeworkId} />;
}
