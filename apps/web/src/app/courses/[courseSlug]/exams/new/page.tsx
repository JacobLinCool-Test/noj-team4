import { NewExamPageContent } from "./page-content";

type Props = {
  params: Promise<{ courseSlug: string }>;
};

export default async function NewExamPage({ params }: Props) {
  const resolvedParams = await params;
  const courseSlug = resolvedParams.courseSlug;

  return <NewExamPageContent courseSlug={courseSlug} />;
}
