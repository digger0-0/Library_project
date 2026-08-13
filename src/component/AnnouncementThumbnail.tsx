'use client'

import { Announcement } from "@/lib/types";
import Link from "next/link";

const MAXROWS = 3;

export function AnnouncementThumbnail(
  { announcement, full }
  :
  { announcement: Announcement, full: boolean }
){
  const lines: string[] = announcement.content.split('\n');
  const content = lines.slice(0, MAXROWS).join('\n').concat('...');
  const ann_date = (new Date(`${announcement.ann_date}z`)).toLocaleString();

  return (
    <Link
      href={`/announcement/${announcement.ann_id}`}
      style={{ display: "block", textDecoration: "none", color: "inherit" }}
    >
      <h6>{announcement.title}</h6>
      {
        full &&
        <p className="whitespace-pre-wrap">
          {content}
        </p>
      }
      <p>{ann_date}</p>
    </Link>
  );
}