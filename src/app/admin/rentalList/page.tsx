import { RentalListClient } from "@/component/admin/RentalListClient";
import PageSelector from "@/component/PageSelector";
import { verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { RentalRecord } from "@/lib/types";
import { Suspense } from "react";

export default async function RentalListPage({
  searchParams,
}: {
  searchParams: Promise<{ rowCount?: string; page?: string; overdue?: string }>;
}) {
  try{
    const sp = await searchParams;
    const rowCount = Number(sp.rowCount) || 10;
    const page = Number(sp.page) || 1;
    const overdue = sp.overdue === "true";

    const sessionData = await verifySession();
    
    if(!sessionData || sessionData.role != "admin"){
      return ( <div>Unauthorised access</div> );
    }
    
    const db = getDb();
    const stmt = `
      SELECT
        bd.isbn,
        bd.book_number,
        bd.title,
        bd.author,
        bd.publisher,
        bd.classification,
        
        bd.full_classification,
        bd.class_icon,

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
      FROM rentals r, book_details bd
        WHERE r.isbn = bd.isbn AND r.book_number = bd.book_number 
      ` + (overdue? `AND status = 'overdue' `: "") + `
      ORDER BY r.due_date DESC
      LIMIT ? OFFSET ?
    `;
    const prep = db.prepare(stmt)
    const rentalRecords = prep.all(
      rowCount,
      (page - 1) * rowCount
    ) as RentalRecord[];

    const recordCount = (
      db.prepare(`
        SELECT
          COUNT(*) AS cnt,
          CASE
            WHEN r.rental_id IS NULL       THEN 'on shelf'
            WHEN r.return_date IS NOT NULL  THEN 'on shelf'
            WHEN r.due_date < datetime('now') THEN 'overdue'
            ELSE 'rent'
          END AS status
        FROM rentals r, book_details bd
        WHERE r.isbn = bd.isbn AND r.book_number = bd.book_number
      ` + (overdue? ` AND status = 'overdue' `: "")
      ).get() as {cnt: number}
    ).cnt as number;

    return (
      <div>
        <Suspense fallback={<div>Loading records...</div>}>
          <PageSelector checkBox={["overdue"]} recordCount={recordCount}/>
        </Suspense>
        <RentalListClient rentalRecords={rentalRecords} />
      </div>
    );
  }catch(err){
    console.log("RentalListPage: ", err, new Date().toISOString());
    return (<div>Internal error</div>);
  }
}