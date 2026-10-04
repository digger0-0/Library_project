import { BigWordPage } from "@/component/bigWordPage";
import { verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtDate, makeCell } from "@/lib/format";
import { EbookViewerInfo, EbookViewerInfoFields } from "@/lib/types";
import Link from "next/link";

const cell = makeCell<EbookViewerInfo>({
  rental_date: fmtDate,
  due_date: fmtDate,
});

export default async function EbookPage(){
  const sessionData = await verifySession();
  const userId = sessionData?.userId;

  const db = getDb();
  const ebooks = db.prepare(`
      SELECT
        e.ebook_id,
        e.isbn,
        e.title,
        e.author,
        e.publisher,
        e.classification,
  
        r.rental_date,
        r.due_date,

        CASE
          WHEN r.ebook_rental_id IS NULL  THEN 'returned'
          WHEN r.return_date IS NOT NULL  THEN 'returned'
          WHEN r.due_date < datetime('now') THEN 'overdue'
          ELSE 'rent'
        END AS status
      FROM ebook_rentals r
      LEFT JOIN ebooks e ON r.ebook_id = e.ebook_id
      WHERE r.user_id = ? AND status != 'returned' AND e.deleted_at IS NULL
    `).all(
      userId
    ) as EbookViewerInfo[];

    if(ebooks.length == 0){
      return (
        <BigWordPage text="No ebook rented"/>
      );
    }

    return (
      <div className="enclose">
        <table><tbody>
          <tr>
            {EbookViewerInfoFields.map((f, j) => (
              <td key={j}>{f}</td>
            ))}
          </tr>
          {ebooks.map((ebook, i) => (
            <tr key={i}>
              {EbookViewerInfoFields.map((f, j) => (
                <td key={j}>{cell(f, ebook[f])}</td>
              ))}
              <td>
                {ebook.status == "overdue" ? (
                  <button className="btn" disabled>View</button>
                ):(
                  <Link
                    className="btn"
                    href={`/user/ebook/viewer/${ebook.ebook_id}`}
                    scroll={false}
                  >
                    View
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody></table>
      </div>
    );
}