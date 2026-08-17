import { Suspense } from "react";
import PageSelector from "@/component/PageSelector";
import { BookSearchBar } from "@/component/BookSearchBar";
import { BookSearchClient } from "@/component/BookSearchClient";
import { getDb } from "@/lib/db";
import { BookSearchDetail } from "@/lib/types";
import { logger } from "@/lib/logger";
import { verifySession } from "@/lib/auth";
import { clamp } from "@/lib/utility";

export default async function BookSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string; rowCount?: string; page?: string; onShelf?: string; bookType?: string }>;
}){
  try{
    const sessionData = await verifySession();
    const userId = sessionData?.userId;
    const sp = await searchParams;
    const keyword = sp.keyword?.trim() ?? "";
    const rowCount = clamp(Number(sp.rowCount), 1, 100, 5);
    const page = clamp(Number(sp.page), 1, Infinity, 1);
    const onShelf = String(sp.onShelf) === "true";
    const bookType = sp.bookType ?? "All";

    let bookSearchDetails: BookSearchDetail[] = [];
    let recordCount: number = 0;
    const db = getDb();
    // hard book
    if(bookType == "All" || bookType == "Book"){
      bookSearchDetails = [...bookSearchDetails, ...
        db.prepare(`
          SELECT DISTINCT
            isbn,
            book_number,
            title,
            author,
            publisher,
            full_classification,
            class_icon,
            status,
            'Book' AS bookType,
            CASE
              WHEN user_id = ? AND return_date IS NULL THEN true
              ELSE false
            END AS rented
          FROM book_details
          WHERE (isbn like ? OR title like ? OR author like ? ) ` + (onShelf? `AND status = 'on shelf' `: "") + `
          LIMIT ? OFFSET ?
        `).all(userId, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, rowCount, (page - 1) * rowCount) as BookSearchDetail[]
      ];
      recordCount += (
        db.prepare(`
          SELECT
            COUNT(*) AS recordCount
          FROM book_details
          WHERE (isbn like ? OR title like ? OR author like ? ) ` + (onShelf? `AND status = 'on shelf' `: "") + `
        `).get(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`) as { recordCount: number }
      ).recordCount;
    }
    // ebook
    if(bookType == "All" || bookType == "Ebook"){
      bookSearchDetails = [...bookSearchDetails, ...
        db.prepare(`
          SELECT DISTINCT
            ebook_id,
            isbn,
            title,
            author,
            publisher,
            full_classification,
            class_icon,
            available || ' books left' AS status,
            'Ebook' AS bookType,
            (SELECT 1 FROM ebook_rentals r WHERE r.ebook_id = e.ebook_id AND r.user_id = ? AND r.return_date IS NULL) AS rented
          FROM ebook_details e
          WHERE (isbn like ? OR title like ? OR author like ? ) ` + (onShelf? `AND  available > 0`: "") + `
          LIMIT ? OFFSET ?
        `).all(userId, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, rowCount, (page - 1) * rowCount)as BookSearchDetail[]
      ];
      recordCount += (
        db.prepare(`
          SELECT
            COUNT(*) AS recordCount
          FROM ebook_details
          WHERE (isbn like ? OR title like ? OR author like ? ) ` + (onShelf? `AND  available > 0`: "") + `
        `).get(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`) as { recordCount: number }
      ).recordCount;
    }
    return (
      <div>
        <BookSearchBar/>
        <Suspense fallback={<div>Loading Data...</div>}>
          <PageSelector
            initialRowCount={rowCount}
            initialPage={page}
            recordCount={recordCount}
            checkBox={["onShelf"]}
            selection={[["bookType", ["All", "Book", "Ebook"]]]}
          />
        </Suspense>
        <BookSearchClient books={bookSearchDetails} checkRented={sessionData != null}/>
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