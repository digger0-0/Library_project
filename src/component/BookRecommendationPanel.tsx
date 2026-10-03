import { verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { BookSearchDetail, BookSearchDetailFields } from "@/lib/types";
import { unstable_noStore } from "next/cache";

export async function BookRecommendationPanel(){
  unstable_noStore();

  const sessionData = await verifySession();
  const userId = sessionData?.userId ?? null;
  const db = getDb();
  const book = db.prepare(`
    WITH combined_books AS (
      SELECT DISTINCT
        null as ebook_id,
        isbn, book_number, title, author, publisher,
        full_classification, class_icon, status,
        'Book' AS bookType,
        CASE
          WHEN user_id = ? AND return_date IS NULL THEN 1
          ELSE 0
        END AS rented
      FROM book_details
      UNION
      SELECT DISTINCT
        e.ebook_id, e.isbn,
        null as book_number, e.title, e.author, e.publisher,
        e.full_classification, e.class_icon,
        e.available || ' books left' AS status,
        'Ebook' AS bookType,
        (SELECT 1 FROM ebook_rentals r
          WHERE r.ebook_id = e.ebook_id AND r.user_id = ? AND r.return_date IS NULL) AS rented
      FROM ebook_details e
    )
    SELECT *
    FROM combined_books
    ORDER BY isbn, book_number, ebook_id
    LIMIT 1 OFFSET (
      CAST(strftime('%j', 'now') AS INTEGER)
      % MAX(1, (SELECT COUNT(*) FROM combined_books))
    );
  `).get(userId, userId) as BookSearchDetail | undefined;

  if(!book){
    return (
      <table>
        <tbody>
          <tr><th colSpan={2}>Book of the day</th></tr>
          <tr><td colSpan={2}>No books to recommend</td></tr>
        </tbody>
      </table>
    );
  }

  return (
    <table>
      <tbody>
        <tr><th colSpan={2}>Book of the day</th></tr>
        { BookSearchDetailFields.map((f, i) => (
          book[f] != null && (
            <tr key={i}>
              <td>{f}</td>
              <td>{book[f]}</td>
            </tr>
          )
        ))}
      </tbody>
    </table>
  );
}