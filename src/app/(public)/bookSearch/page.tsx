import { Suspense } from "react";
import PageSelector from "@/component/PageSelector";
import { BookSearchBar } from "@/component/BookSearchBar";
import { BookSearchClient } from "@/component/BookSearchClient";
import { getDb } from "@/lib/db";
import { BookSearchDetail, Classifications } from "@/lib/types";
import { logger } from "@/lib/logger";
import { verifySession } from "@/lib/auth";
import { clamp } from "@/lib/utility";
import { BookClassificationSelector } from "@/component/admin/BookClassificationSelector";
import { BigWordPage } from "@/component/bigWordPage";

export default async function BookSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string; rowCount?: string; page?: string; onShelf?: string; bookType?: string; classification?: string }>;
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
    const classification = sp.classification ?? "none";

    let bookSearchDetails: BookSearchDetail[] = [];
    let recordCount: number = 0;
    const db = getDb();
    const like = `%${keyword}%`;

    // hard book
    if(bookType == "All" || bookType == "Book"){
      const where: string[] = [`(isbn LIKE ? OR title LIKE ? OR author LIKE ?)`];
      const params: unknown[] = [like, like, like];
      if(onShelf){ where.push(`status = 'on shelf'`); }
      if(classification !== "none"){ where.push(`classification = ?`); params.push(classification); }

      bookSearchDetails = [...bookSearchDetails, ...
        db.prepare(`
          SELECT DISTINCT
            isbn, book_number, title, author, publisher,
            full_classification, class_icon, status,
            'Book' AS bookType,
            CASE
              WHEN user_id = ? AND return_date IS NULL THEN 1
              ELSE 0
            END AS rented
          FROM book_details
          WHERE ${where.join(" AND ")}
          LIMIT ? OFFSET ?
        `).all(userId, ...params, rowCount, (page - 1) * rowCount) as BookSearchDetail[]
      ];

      recordCount += (
        db.prepare(`
          SELECT
            COUNT(*) AS recordCount
          FROM book_details
          WHERE ${where.join(" AND ")}
        `).get(...params) as { recordCount: number }
      ).recordCount;
    }

    // ebook
    if(bookType == "All" || bookType == "Ebook"){
      const where: string[] = [`(e.isbn LIKE ? OR e.title LIKE ? OR e.author LIKE ?)`];
      const params: unknown[] = [like, like, like];
      if(onShelf){ where.push(`available > 0`); }                          // view column → no param
      if(classification !== "none"){ where.push(`e.classification = ?`); params.push(classification); }

      bookSearchDetails = [...bookSearchDetails, ...
        db.prepare(`
          SELECT DISTINCT
            e.ebook_id, e.isbn, e.title, e.author, e.publisher,
            e.full_classification, e.class_icon,
            e.available || ' books left' AS status,
            'Ebook' AS bookType,
            (SELECT 1 FROM ebook_rentals r
              WHERE r.ebook_id = e.ebook_id AND r.user_id = ? AND r.return_date IS NULL) AS rented
          FROM ebook_details e
          WHERE ${where.join(" AND ")}
          LIMIT ? OFFSET ?
        `).all(userId, ...params, rowCount, (page - 1) * rowCount) as BookSearchDetail[]
      ];

      recordCount += (
        db.prepare(`
          SELECT
            COUNT(DISTINCT e.ebook_id) AS recordCount
          FROM ebook_details e
          WHERE ${where.join(" AND ")}
        `).get(...params) as { recordCount: number }
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
            selection={[["bookType", ["All", "Book", "Ebook"]], ["classification", ["none", ...Classifications]]]}
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
      <BigWordPage text="Internal error"/>
    );
  }
}