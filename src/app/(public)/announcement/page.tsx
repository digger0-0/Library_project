import { Suspense } from "react";
import PageSelector from "@/component/PageSelector";
import AnnouncementPanel from "@/component/AnnouncementPanel";

export default async function AnnouncementPage({
  searchParams,
}: {
  searchParams: Promise<{ rowCount?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const rowCount = Number(sp.rowCount) || 10;
  const page = Number(sp.page) || 1;

  return (
    <div>
      <Suspense fallback={<div>Loading controls...</div>}>
        <PageSelector initialRowCount={rowCount} initialPage={page} />
      </Suspense>
      <AnnouncementPanel rowCount={rowCount} page={page} full={false} />
    </div>
  );
}