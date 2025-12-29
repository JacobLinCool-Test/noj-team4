import { NewHomeworkPageContent } from "./page-content";

type Props = {
  params: Promise<{ courseSlug: string }>;
};

export default async function NewHomeworkPage({ params }: Props) {
  const resolved = await params;
  const courseSlug = resolved.courseSlug;

  return <NewHomeworkPageContent courseSlug={courseSlug} />;
}
