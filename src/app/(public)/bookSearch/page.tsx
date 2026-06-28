import { Suspense } from "react";
import PageSelector from "@/component/PageSelector";
import { BookSearchBar } from "@/component/BookSearchBar";
import { BookSearchClient } from "@/component/BookSearchClient";
import { getDb } from "@/lib/db";
import { BookSearchDetail } from "@/lib/types";

export default async function bookSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string; rowCount?: string; page?: string }>;
}){
  try{
    const sp = await searchParams;
    const keyword = sp.keyword?.trim();
    const rowCount = Number(sp.rowCount) || 5;
    const page = Number(sp.page) || 1;

    const db = getDb();
    const bookSearchDetails = db.prepare(`
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
        due_date,
        status
      FROM book_details
      WHERE isbn like ? OR title like ?
      LIMIT ? OFFSET ?
      `).all(`%${keyword}%`, `%${keyword}%`, rowCount, (page - 1) * rowCount)as BookSearchDetail[];

    return (
      <div>
        <BookSearchBar/>
        <Suspense fallback={<div>Loading controls...</div>}>
          <PageSelector initialRowCount={rowCount} initialPage={page} />
        </Suspense>
        <BookSearchClient books={bookSearchDetails}/>
      </div>
    );
  }catch(err){
    console.log("bookSearchPage: ", err, new Date().toISOString());
    return (
      <div>
        <p>Internal error</p>
      </div>
    );
  }
}