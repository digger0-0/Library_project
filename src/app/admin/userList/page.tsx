import { UserListClient } from "@/component/admin/UserListClient";
import { BigWordPage } from "@/component/bigWordPage";
import PageSelector from "@/component/PageSelector";
import { verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { INF, UserRecord } from "@/lib/types";
import { clamp } from "@/lib/utility";
import { Suspense } from "react";

export default async function UserListPage({
  searchParams,
}: {
  searchParams: Promise<{ rowCount?: string; page?: string; rankOverdue?: string }>;
}) {
  try{
    const sp = await searchParams;
    const rowCount = clamp(Number(sp.rowCount), 1, 100, 10, true);
    const page = clamp(Number(sp.page), 1, INF, 1, true);
    const rankOverdue = sp.rankOverdue == "true";

    const sessionData = await verifySession();
    
    if(!sessionData || sessionData.role != "admin"){
      return ( <BigWordPage text="Unauthorised access"/> );
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
            AND r.return_date IS NULL
        ) AS overdue_count
      FROM users u
      ORDER BY` + (
        rankOverdue? ` overdue_count DESC, `: ""
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
    logger.error("UserListPage failed", {
      fn: "UserListPage",
    }, err);
    return (<BigWordPage text="Internal error"/>);
  }
}