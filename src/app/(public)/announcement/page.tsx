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
    <AnnouncementPanel rowCount={rowCount} page={page} full={true} />
  );
}