'use client'

import { Announcement } from "@/lib/types";
import Link from "next/link";

const MAXROWS = 3;
const TITLELENGTH = 30;
const CONTENTLENGTH = 50;

export function AnnouncementThumbnail(
  { announcement, full }
  :
  { announcement: Announcement, full: boolean }
){
  const lines: string[] = announcement.content.split('\n');
  // show at most MAXROWS lines, each capped at CONTENTLENGTH chars so a single
  // very long (space-less) line can't blow past the row limit / overflow
  const content = lines
    .slice(0, MAXROWS)
    .map((line) => line.length > CONTENTLENGTH ? line.slice(0, CONTENTLENGTH).concat('...') : line)
    .join('\n');
  const title = announcement.title.length > TITLELENGTH? (announcement.title.slice(0, TITLELENGTH).concat('...')): announcement.title;
  const ann_date = (new Date(`${announcement.ann_date}z`)).toLocaleString();

  return (
    <Link
      href={`/announcement/${announcement.ann_id}`}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        border: "1px solid",
        borderRadius: "1.5px",
        margin: "8px 4px",
        padding: "2px 6px",
      }}
    >
      <h3 style={{whiteSpace: "nowrap"}}>{title}</h3>
      {
        full &&
        <p className="whitespace-pre-wrap" style={{overflowWrap: "anywhere"}}>
          {content}
        </p>
      }
      <p>{ann_date}</p>
    </Link>
  );
}