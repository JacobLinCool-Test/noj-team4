import { notFound } from "next/navigation";
import { EditAnnouncementPageContent } from "./page-content";

type Params = Promise<{ courseSlug: string; announcementId: string }>;

export default async function EditAnnouncementPage({ params }: { params: Params }) {
  const resolved = await params;
  const courseSlug = resolved.courseSlug;
  const announcementId = Number(resolved.announcementId);

  if (!announcementId || announcementId <= 0) {
    notFound();
  }

  return <EditAnnouncementPageContent courseSlug={courseSlug} announcementId={announcementId} />;
}
