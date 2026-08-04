import { verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Announcement } from "@/lib/types";
import { InsertAnnouncementPanel } from "./admin/InsertAnnouncementPanel";
import { AnnouncementThumbnail } from "./AnnouncementThumbnail";
import { Suspense } from "react";
import PageSelector from "./PageSelector";

export default async function AnnouncementPanel({
  rowCount = 10,
  page = 1,
  full = false,
}: {
  rowCount: number,
  page: number,
  full: boolean,
}){
  try{
    // fetch the announcements
    const db = getDb();
    let rows: Announcement[];
    rows = db.prepare("SELECT * FROM announcements LIMIT ? OFFSET ?").all(rowCount, (page-1)*rowCount) as Announcement[];
    const { recordCount } = db.prepare("SELECT COUNT(*) AS recordCount FROM announcements").get() as { recordCount: number }
    // add if admin
    const sessionData = await verifySession();

    return(
      <div>
        { full && (
          <Suspense fallback={<div>Loading announcements...</div>}>
            <PageSelector initialRowCount={rowCount} initialPage={page} recordCount={recordCount} />
          </Suspense>
        )}
        {rows.length? rows.map((announcement) => {
          return (
            <AnnouncementThumbnail key={announcement.ann_id} announcement={announcement} full={full}/>
          );
        }):
          <p>no announcement</p>
        }
        { sessionData?.role == "admin" && full && (
          <InsertAnnouncementPanel/>
        )}
      </div>
    );
  }catch(err){
    console.log("AnnouncementPanel: ", String(err), new Date().toISOString());
    return (
      <div>
        <p>err: {String(err)}</p>
      </div>
    );
  }
}