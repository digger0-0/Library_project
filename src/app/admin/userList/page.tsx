import { UserListClient } from "@/component/admin/UserListClient";
import PageSelector from "@/component/PageSelector";
import { verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { UserRecord } from "@/lib/types";
import { Suspense } from "react";

export default async function UserListPage({
  searchParams,
}: {
  searchParams: Promise<{ rowCount?: string; page?: string; rankOverdue?: string }>;
}) {
  try{
    const sp = await searchParams;
    const rowCount = Number(sp.rowCount) || 10;
    const page = Number(sp.page) || 1;
    const rankOverdue = sp.rankOverdue == "true";

    const sessionData = await verifySession();
    
    if(!sessionData || sessionData.role != "admin"){
      return ( <div>Unauthorised access</div> );
    }
    
    const db = getDb();
    const stmt = `
      SELECT
        u.user_id,
        u.username,
        u.role,
        
        (
          SELECT COUNT(*)
          FROM rentals r
          WHERE
            r.user_id = u.user_id
            AND r.due_date < datetime('now')
        ) AS overdue_count
      FROM users u
      ORDER BY` + (
        rankOverdue? ` overdue_count, `: ""
      ) +
      `  user_id
      LIMIT ? OFFSET ?
      `;
      const prep = db.prepare(stmt);
      const userRecords = prep.all(
        rowCount,
        (page - 1) * rowCount
      ) as UserRecord[];

      const recordCount = (db.prepare(`SELECT COUNT(*) as cnt FROM users`).get() as {cnt: number} ).cnt as number;

    return (
      <div>
        <Suspense fallback={<div>Loading records...</div>}>
          <PageSelector checkBox={["rankOverdue"]} recordCount={recordCount}/>
        </Suspense>
        <UserListClient userRecords={userRecords}/>
      </div>
    );
  }catch(err){
    console.log("UserListPage: ", err, new Date().toISOString());
    return (<div>Internal error</div>);
  }
}