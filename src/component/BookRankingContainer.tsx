import { getDb } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";
import { BookRankingInfo } from "@/lib/types";
import { BookRankingPanel } from "./BookRankingPanel";

export function BookRankingContainer({ full = false }: { full?: boolean }){
  noStore();

  const stmt = (filter: "history" | "yearly" | "monthly") => {
    const clauses: string[] = [];
    if(filter === "monthly") clauses.push("AND CAST(strftime('%m', r.rental_date) AS INTEGER) = ?");
    if(filter !== "history") clauses.push("AND CAST(strftime('%Y', r.rental_date) AS INTEGER) = ?");
    return `
      SELECT
        b.title,
        b.author,
        COUNT(*) AS count
      FROM rentals r, books b
      WHERE r.isbn = b.isbn AND r.book_number = b.book_number AND b.deleted_at IS NULL
        ${clauses.join("\n        ")}
      GROUP BY b.isbn
      ORDER BY count DESC
      LIMIT 10
    `;
  };

  const db = getDb();
  const thisMonth = new Date().getMonth() + 1;
  const thisYear = new Date().getFullYear();

  const history = db.prepare(stmt("history")).all() as BookRankingInfo[];
  const yearly  = db.prepare(stmt("yearly")).all(thisYear) as BookRankingInfo[];
  const monthly = db.prepare(stmt("monthly")).all(thisMonth, thisYear) as BookRankingInfo[];

  return (
    <div style={full
      ? {flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%"}
      : {}}>
      <BookRankingPanel full={full} BookRankings={{history, yearly, monthly}}/>
    </div>
  );
}