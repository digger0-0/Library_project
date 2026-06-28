import PageSelector from "@/component/PageSelector";
import { RentalRecordsClient } from "@/component/RentalRecordsClient";
import { verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { RentalRecord } from "@/lib/types";
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
  const rentalRecords = db.prepare(`
    SELECT
      r.isbn,
      r.book_number,
      b.title,
      b.author,
      b.publisher,
      b.classification,
      
      b.classification || ' - ' || c.description AS full_classification,
      c.class_icon,

      r.rental_id,
      r.rental_date,
      r.due_date,
      r.return_date,
      CASE
        WHEN r.rental_id IS NULL       THEN 'on shelf'
        WHEN r.return_date IS NOT NULL  THEN 'on shelf'
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
    LEFT JOIN classifications c ON b.classification = c.classification
    WHERE r.user_id = ?
    ORDER BY r.due_date DESC
    LIMIT ? OFFSET ?
  `).all(
    sessionData.userId,
    rowCount,
    (page - 1) * rowCount
  ) as RentalRecord[];

    return (
      <div>
        <Suspense fallback={<div>Loading Records...</div>}>
          <PageSelector/>
        </Suspense>
        <RentalRecordsClient rentalRecords={rentalRecords} />
      </div>
    );
  }catch(err){
    console.log("rentalRecordsPage: ", err, new Date().toISOString());
    return (<div>Internal error</div>);
  }
}