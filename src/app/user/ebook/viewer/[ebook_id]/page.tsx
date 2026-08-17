import { EbookViewer } from "@/component/EbookViewer";
import { verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Ebook } from "@/lib/types";
import { redirect } from "next/navigation";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

export default async function EbookViewerPage({
  params,
}: {
  params: Promise<{ ebook_id: string }>
}) {
  const { ebook_id } = await params;
  const ebookDir = path.join(process.cwd(), "/assets/ebooks");
  
  const sessionData = await verifySession();
  const userId = sessionData?.userId;

  // verify ebook_id / get filename
  const db = getDb();
  const ebook = db.prepare(`
    SELECT
      d.ebook_id,
      d.isbn,
      d.title,
      d.author,
      d.publisher,
      d.classification,
      d.copies,
      e.filename
    FROM ebook_details d
    LEFT JOIN ebooks e ON e.ebook_id = d.ebook_id
    WHERE d.ebook_id = ? AND d.user_id = ? AND d.status = 'rent'
  `).get(ebook_id, userId) as Ebook;
  
  if(!ebook){
    redirect("/");
  }

  // check file exist
  const filePath = path.join(ebookDir, ebook.filename);
  if(!existsSync(filePath)){
    logger.error("ebook doesn't exist", {fn: "EbookViewerPage", ebook_id, filename: ebook.filename});
    return (<div>Internal error</div>);
  }
  const content = await readFile(path.join(ebookDir, ebook.filename), { encoding: 'utf8' });

  return (
    <EbookViewer ebook={ebook} content={content}/>
  );
}