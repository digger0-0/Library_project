import { RentalListClient } from "@/component/admin/RentalListClient";
import { BigWordPage } from "@/component/bigWordPage";
import PageSelector from "@/component/PageSelector";
import { verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { INF, RentalRecord } from "@/lib/types";
import { clamp } from "@/lib/utility";
import { Suspense } from "react";

export default async function RentalListPage({
  searchParams,
}: {
  searchParams: Promise<{ rowCount?: string; page?: string; overdue?: string }>;
}) {
  try{
    const sp = await searchParams;
    const rowCount = clamp(Number(sp.rowCount), 1, 100, 10, true);
    const page = clamp(Number(sp.page), 1, INF, 1, true);
    const overdue = sp.overdue === "true";

    const sessionData = await verifySession();
    
    if(!sessionData || sessionData.role != "admin"){
      return ( <BigWordPage text="Unauthorised access"/> );
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

        r.user_id,
        u.username,

        r.rental_id,
        r.rental_date,
        r.due_date,
        r.return_date,
        CASE
          WHEN r.rental_id IS NULL       THEN 'on shelf'
          WHEN r.return_date <= r.due_date THEN 'on shelf'
          WHEN r.due_date < datetime('now') AND r.return_date IS NOT NULL  THEN 'overdue (returned)'
          WHEN r.due_date < datetime('now') THEN 'overdue'
          ELSE 'rent'
        END AS status,

        CASE
          WHEN r.rental_id IS NULL       THEN 'false'
          WHEN r.return_date <= r.due_date THEN 'false'
          WHEN r.due_date < datetime('now') THEN 'true'
          ELSE 'false'
        END AS isOverdue,
        
        CASE
          WHEN r.return_date IS NOT NULL THEN NULL
          WHEN r.due_date < datetime('now')
            THEN CAST(julianday('now') - julianday(r.due_date) AS INTEGER)
          ELSE NULL
        END AS days_overdue,
        r.renew
      FROM rentals r
      JOIN book_details bd ON r.isbn = bd.isbn AND r.book_number = bd.book_number
      LEFT JOIN users u ON r.user_id = u.user_id
      WHERE 1=1
      ` + (overdue? `AND (isOverdue = 'true') `: "") + `
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
            WHEN r.rental_id IS NULL       THEN 'false'
            WHEN r.return_date <= r.due_date THEN 'false'
            WHEN r.due_date < datetime('now') THEN 'true'
          END AS isOverdue
        FROM rentals r, book_details bd
        WHERE r.isbn = bd.isbn AND r.book_number = bd.book_number
      ` + (overdue? `AND (isOverdue = 'true') `: "")
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
    logger.error("RentalListPage failed", {
      fn: "RentalListPage",
    }, err);
    return (<BigWordPage text="Internal error"/>);
  }
}