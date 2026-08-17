import { ReturnButton } from "@/component/ReturnButton";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Announcement } from "@/lib/types";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ ann_id: string }>;
}){
  try{
    const { ann_id: annId } = await params;
    const ann_id = Number(annId);

    const db = getDb();
    const announcement = db.prepare("SELECT * FROM announcements WHERE ann_id = ?")
    .get(ann_id) as Announcement;

    return (
    <div>
      <ReturnButton/>
      <h6>{announcement.title}</h6>
      <p className="whitespace-pre-wrap">{announcement.content}</p>
      <p>{announcement.ann_date}</p>
    </div>
    );
  }catch(err){
    logger.error("AnnouncementDetailPage failed", {
      fn: "AnnouncementDetailPage"
    }, err);
    return (
      <div>
        <div>
          <p>Internal error</p>
        </div>
      </div>
    );
  }
}