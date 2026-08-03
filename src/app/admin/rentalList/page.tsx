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
        isbn,
        book_number,
        title,
        author,
        publisher,
        classification,
        
        full_classification,
        class_icon,

        rental_id,
        rental_date,
        due_date,
        return_date,
        status,
        days_overdue,
        renew
      FROM book_details
      ` + (overdue? `WHERE status = 'overdue'`: "") + `
      ORDER BY due_date DESC
      LIMIT ? OFFSET ?
    `;
    const prep = db.prepare(stmt)
    const rentalRecords = prep.all(
      rowCount,
      (page - 1) * rowCount
    ) as RentalRecord[];

    const recordCount = (
      db.prepare(`
        SELECT COUNT(*) AS cnt
        FROM book_details ` + (overdue? ` WHERE status = 'overdue' `: "")
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