import { unstable_noStore as noStore } from "next/cache";
import { getDb } from "@/lib/db";
import { RentalRanking, RentalRankings } from "@/lib/types";
import { RentalRankingPanel } from "./RentalRankingPanel";

export function RentalRankingContainer({ full = false }: { full?: boolean }){
  noStore();
  const db = getDb();
  const stmt = (month: boolean = false) => `
    SELECT 
      u.username,
      count(r.rental_id) as rentalCount
    FROM rentals r, users u
    WHERE r.user_id = u.user_id ` + (month? `AND CAST(strftime('%m', r.rental_date) AS INTEGER) = ? `: "") +
      `AND CAST(strftime('%Y', r.rental_date) AS INTEGER) = ?
    GROUP BY r.user_id
    ORDER BY rentalCount DESC
    LIMIT 10
  `;
  const monthly = db.prepare(stmt(true)).all(new Date().getMonth() + 1, new Date().getFullYear()) as RentalRanking[];
  const yearly = db.prepare(stmt(false)).all(new Date().getFullYear()) as RentalRanking[];
  
  return (
    <div style={full
      ? {flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%"}
      : {}}>
      <RentalRankingPanel
        RentalRankings={{monthly: monthly, yearly: yearly} as RentalRankings}
        full={full}
      />
    </div>
  );
}