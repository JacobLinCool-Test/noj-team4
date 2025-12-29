import { AnnouncementsPageContent } from "./page-content";

type Params = Promise<{ courseSlug: string }>;

export default async function CourseAnnouncementsPage({ params }: { params: Params }) {
  const resolved = await params;
  const courseSlug = resolved.courseSlug;

  return <AnnouncementsPageContent courseSlug={courseSlug} />;
}
