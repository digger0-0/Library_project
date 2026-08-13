import { Suspense } from "react";
import PageSelector from "@/component/PageSelector";
import { BookSearchBar } from "@/component/BookSearchBar";
import { BookSearchClient } from "@/component/BookSearchClient";
import { getDb } from "@/lib/db";
import { BookSearchDetail } from "@/lib/types";
import { logger } from "@/lib/logger";

export default async function BookSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string; rowCount?: string; page?: string; onShelf?: string }>;
}){
  try{
    const sp = await searchParams;
    const keyword = sp.keyword?.trim() ?? "";
    const rowCount = Number(sp.rowCount) || 5;
    const page = Number(sp.page) || 1;
    const onShelf = String(sp.onShelf) === "true";

    const db = getDb();
    const bookSearchDetails = db.prepare(`
      SELECT
        isbn,
        book_number,
        title,
        author,
        publisher,
        full_classification,
        class_icon,
        rental_id,
        due_date,
        status
      FROM book_details
      WHERE (isbn like ? OR title like ? OR author like ? ) ` + (onShelf? `AND status = 'on shelf' `: "") + `
      LIMIT ? OFFSET ?
      `).all(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, rowCount, (page - 1) * rowCount)as BookSearchDetail[];
    const { recordCount } = db.prepare(`
      SELECT
        COUNT(*) AS recordCount
      FROM book_details
      WHERE isbn like ? OR title like ? ` + (onShelf? `AND status = 'on shelf' `: "") + `
      `).get(`%${keyword}%`, `%${keyword}%`)as { recordCount: number };

    return (
      <div>
        <BookSearchBar/>
        <Suspense fallback={<div>Loading Data...</div>}>
          <PageSelector
            initialRowCount={rowCount}
            initialPage={page}
            recordCount={recordCount}
            checkBox={["onShelf"]}
          />
        </Suspense>
        <BookSearchClient books={bookSearchDetails}/>
      </div>
    );
  }catch(err){
    logger.error("BookSearchPage failed", {
      fn: "BookSearchPage",
    }, err);
    return (
      <div>
        <p>Internal error</p>
      </div>
    );
  }
}