import PageSelector from "@/component/PageSelector";
import { RentalRecordsClient } from "@/component/RentalRecordsClient";
import { verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { EbookRentalRecords, EbookRentalRecordsUser, RentalRecord, RentalRecordUser } from "@/lib/types";
import { Suspense } from "react";

export default async function rentalRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ rowCount?: string; page?: string }>;
}){
  try{
  const sp = await searchParams;
  const rowCount = Number(sp.rowCount) || 10;
  const page = Number(sp.page) || 1;

  const sessionData = await verifySession();

  if(!sessionData){
    return ( <div>Unauthorised access</div> );
  }
  
  const db = getDb();
  // book
  const rentalRecords = db.prepare(`
    SELECT
      b.title,

      r.rental_id,
      r.rental_date,
      r.due_date,
      r.return_date,
      CASE
        WHEN r.rental_id IS NULL       THEN 'returned'
        WHEN r.return_date IS NOT NULL  THEN 'returned'
        WHEN r.due_date < datetime('now') THEN 'overdue'
        ELSE 'rent'
      END AS status,

      CASE
        WHEN r.return_date IS NOT NULL THEN NULL
        WHEN r.due_date < datetime('now')
          THEN CAST(julianday('now') - julianday(r.due_date) AS INTEGER)
        ELSE NULL
      END AS days_overdue,
      r.renew
    FROM rentals r
    LEFT JOIN books b ON r.isbn = b.isbn AND r.book_number = b.book_number
    WHERE r.user_id = ?
    ORDER BY r.due_date DESC
    LIMIT ? OFFSET ?
  `).all(
    sessionData.userId,
    rowCount,
    (page - 1) * rowCount
  ) as RentalRecordUser[];

  const { recordCount } = db.prepare(`
    SELECT COUNT(*) as recordCount FROM rentals WHERE user_id = ?
  `).get(sessionData.userId) as { recordCount: number };
  // ebook
  const ebookRentalRecords = db.prepare(`
    SELECT
      e.title,

      r.ebook_rental_id,
      r.rental_date,
      r.due_date,
      r.return_date,

      CASE
        WHEN r.ebook_rental_id IS NULL  THEN 'returned'
        WHEN r.return_date IS NOT NULL  THEN 'returned'
        WHEN r.due_date < datetime('now') THEN 'overdue'
        ELSE 'rent'
      END AS status,

      CASE
        WHEN r.return_date IS NOT NULL THEN NULL
        WHEN r.due_date < datetime('now')
          THEN CAST(julianday('now') - julianday(r.due_date) AS INTEGER)
        ELSE NULL
      END AS days_overdue,

      r.renew
    FROM ebook_rentals r
    LEFT JOIN ebooks e ON r.ebook_id = e.ebook_id
    WHERE r.user_id = ?
    ORDER BY r.due_date DESC
    LIMIT ? OFFSET ?
  `).all(
    sessionData.userId,
    rowCount,
    (page - 1) * rowCount
  ) as EbookRentalRecordsUser[];
  const { ebookRecordCount } = db.prepare(`
    SELECT COUNT(*) as ebookRecordCount FROM ebook_rentals WHERE user_id = ?
  `).get(sessionData.userId) as { ebookRecordCount: number };

    return (
      <div>
        <Suspense fallback={<div>Loading Records...</div>}>
          <PageSelector recordCount={Math.max(recordCount, ebookRecordCount)}/>
        </Suspense>
        <RentalRecordsClient rentalRecords={rentalRecords} ebookRentalRecords={ebookRentalRecords}/>
      </div>
    );
  }catch(err){
    logger.error("RentalRecordsPage failed", {
      fn: "RentalRecordsPage",
    }, err);
    return (<div>Internal error</div>);
  }
}