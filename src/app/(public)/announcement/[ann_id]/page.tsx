import { BigWordPage } from "@/component/bigWordPage";
import { ReturnButton } from "@/component/ReturnButton";
import { getDb } from "@/lib/db";
import { fmtDate, makeCell } from "@/lib/format";
import { logger } from "@/lib/logger";
import { Announcement } from "@/lib/types";

const cell = makeCell<Announcement>({
  ann_date: fmtDate
});

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
    <div className="enclose" style={{height: "100%"}}>
      <ReturnButton/>
      <div>
        <p>{cell("ann_date", announcement.ann_date)}</p>
        <h3 style={{overflowWrap: "anywhere"}}>{announcement.title}</h3>
        <p className="whitespace-pre-wrap enclose" style={{overflowWrap: "anywhere"}}>{announcement.content}</p>
      </div>
    </div>
    );
  }catch(err){
    logger.error("AnnouncementDetailPage failed", {
      fn: "AnnouncementDetailPage"
    }, err);
    return (
      <BigWordPage text="Internal error"/>
    );
  }
}