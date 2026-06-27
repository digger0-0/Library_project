import { getDb } from "@/lib/db";
import { Announcement } from "@/lib/types";

export default async function Page({
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
      <h6>{announcement.title}</h6>
      <p className="whitespace-pre-wrap">{announcement.content}</p>
      <p>{announcement.ann_date}</p>
    </div>
    );
  }catch(err){
    console.log("announcement/[ann_id] (Page): ", String(err), new Date());
    return (<div>
      <div>
        <p>err: {String(err)}</p>
      </div>
    </div>);
  }
}