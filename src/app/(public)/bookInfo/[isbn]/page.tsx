import { BigWordPage } from "@/component/bigWordPage";
import { InsertBookCommentPanel } from "@/component/InsertBookCommentPanel";
import { LikeBookButton } from "@/component/LikeBookButton";
import PageSelector from "@/component/PageSelector";
import { verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtCount, fmtDate } from "@/lib/format";
import { BookInfo, INF, UserComment } from "@/lib/types";
import { clamp } from "@/lib/utility";

export default async function BookInfoPage({
  params, searchParams
}: {
  params: Promise<{ isbn: string }>;
  searchParams: Promise<{ rowCount?: string; page?: string; }>
}){
  const { isbn: isbn } = await params;
  const sp = await searchParams;
  const rowCount = clamp(Number(sp.rowCount), 1, 100, 5, true);
  const page = clamp(Number(sp.page), 1, INF, 1, true);
  const sessionData = await verifySession();
  const db = getDb();
  const bookInfo = db.prepare(`
    SELECT DISTINCT
      isbn, title, author, publisher,
      full_classification, class_icon,
      (SELECT COUNT(*) FROM likes l WHERE b.isbn = l.isbn AND NOT is_ebook) AS likes_count,
      (SELECT COUNT(*) FROM comments c WHERE b.isbn = c.isbn AND NOT is_ebook) AS comments_count
    FROM book_details b
    WHERE isbn = ?;
  `).get(isbn) as BookInfo;
  const is_liked = db.prepare(`
    SELECT 1 FROM likes WHERE user_id = ? AND isbn = ? AND NOT is_ebook;
  `).get(sessionData?.userId, isbn) as number | null;
  const comments = db.prepare(`
    SELECT
      u.user_id,
      u.username,
      c.comment_id,
      c.created_at,
      c.content
    FROM comments c
    LEFT JOIN users u ON u.user_id = c.user_id
    WHERE c.isbn = ? AND NOT c.is_ebook
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(isbn, rowCount, (page - 1) * rowCount) as UserComment[];
  const recordCount = (db.prepare(`
    SELECT COUNT(*) AS recordCount FROM comments c WHERE c.isbn = ? AND NOT c.is_ebook
  `).get(isbn) as { recordCount: number }).recordCount;

  if(bookInfo == null){
    return <BigWordPage text="Not found"/>
  }

  return (
    <div>
      <div>
        <div>{bookInfo.title}|{bookInfo.author}
          { sessionData?.userId && 
            <LikeBookButton is_liked={is_liked != null} is_ebook={false} isbn={isbn}/>
          }
        </div>
        <div>{bookInfo.isbn}</div>
        <div>{bookInfo.full_classification}|{bookInfo.class_icon}</div>
        <div>like(s): {fmtCount(bookInfo.likes_count)}|comment(s): {fmtCount(bookInfo.comments_count)}</div>
      </div>
      <div>
        <PageSelector recordCount={recordCount} initialRowCount={rowCount} initialPage={page}/>
        <div>
          {comments.map((c) => (
            <div key={c.comment_id} className="enclose">
              <div key={c.user_id}>{c.username}</div>
              <div>{fmtDate(c.created_at)}</div>
              <div className="whitespace-pre-wrap enclose" style={{overflowWrap: "anywhere"}}>{c.content}</div>
            </div>
          ))}
        </div>
      </div>
      { sessionData?.userId && 
        <InsertBookCommentPanel is_ebook={false} isbn={isbn}/>
      }
    </div>
  );

}