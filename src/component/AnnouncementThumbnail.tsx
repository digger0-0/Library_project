'use client'

import { Announcement } from "@/lib/types";
import Link from "next/link";

export function AnnouncementThumbnail(
  { announcement, full }
  :
  { announcement: Announcement, full: boolean }
){
  return (
    <Link
      href={`/announcement/${announcement.ann_id}`}
      style={{ display: "block", textDecoration: "none", color: "inherit" }}
    >
      <h6>{announcement.title}</h6>
      {full && <p className="whitespace-pre-wrap">{announcement.content.slice(0, 50).concat("...")}</p>}
      <p>{announcement.ann_date}</p>
    </Link>
  );
}