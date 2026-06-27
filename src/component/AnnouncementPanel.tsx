import { verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Announcement } from "@/lib/types";
import { InsertAnnouncementPanel } from "./admin/InsertAnnouncementPanel";
import { AnnouncementThumbnail } from "./AnnouncementThumbnail";

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
    if(page == 1){
      rows = db.prepare("SELECT * FROM announcements LIMIT ?").all(rowCount) as Announcement[];
    }else{
      rows = db.prepare("SELECT * FROM announcements LIMIT ? OFFSET ?").all(rowCount, (page-1)*rowCount) as Announcement[];
    }
    // add if admin
    const sessionData = await verifySession();

    return(
      <div>
        {rows.length? rows.map((announcement) => {
          return (
            <AnnouncementThumbnail key={announcement.ann_id} announcement={announcement} full={full}/>
          );
        }):
          <p>no announcement</p>
        }
        { sessionData?.role == "admin" && <InsertAnnouncementPanel/> }
      </div>
    );
  }catch(err){
    console.log("AnnouncementPanel: ", String(err), new Date());
    return (
      <div>
        <p>err: {String(err)}</p>
      </div>
    );
  }
}