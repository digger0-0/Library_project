import { BigWordPage } from "@/component/bigWordPage";
import { InsertBookCommentPanel } from "@/component/InsertBookCommentPanel";
import { LikeBookButton } from "@/component/LikeBookButton";
import PageSelector from "@/component/PageSelector";
import { verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fmtCount, fmtDate } from "@/lib/format";
import { BookInfo, INF, UserComment } from "@/lib/types";
import { clamp } from "@/lib/utility";

export default async function EbookInfoPage({
  params, searchParams
}: {
  params: Promise<{ ebook_id: string }>;
  searchParams: Promise<{ rowCount?: string; page?: string; }>
}){
  const { ebook_id: ebookId } = await params;
  const sp = await searchParams;
  const rowCount = clamp(Number(sp.rowCount), 1, 100, 5, true);
  const page = clamp(Number(sp.page), 1, INF, 1, true);
  const ebook_id = Number(ebookId);
  const sessionData = await verifySession();
  const db = getDb();
  const bookInfo = db.prepare(`
    SELECT DISTINCT
      ebook_id, isbn, title, author, publisher,
      full_classification, class_icon,
      (SELECT COUNT(*) FROM likes WHERE b.ebook_id = ebook_id AND is_ebook) AS likes_count,
      (SELECT COUNT(*) FROM comments WHERE b.ebook_id = ebook_id AND is_ebook) AS comments_count
    FROM ebook_details b
    WHERE ebook_id = ?;
  `).get(ebook_id) as BookInfo;
  const is_liked = db.prepare(`
    SELECT 1 FROM likes WHERE user_id = ? AND ebook_id = ? AND is_ebook;
  `).get(sessionData?.userId, ebook_id) as number | null;
  const comments = db.prepare(`
    SELECT
      u.user_id,
      u.username,
      c.comment_id,
      c.created_at,
      c.content
    FROM comments c
    LEFT JOIN users u ON u.user_id = c.user_id
    WHERE c.ebook_id = ? AND c.is_ebook
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(ebook_id, rowCount, (page - 1) * rowCount) as UserComment[];
  const recordCount = (db.prepare(`
    SELECT COUNT(*) AS recordCount FROM comments c WHERE c.ebook_id = ? AND c.is_ebook
  `).get(ebook_id) as { recordCount: number }).recordCount;

  if(bookInfo == null){
    return <BigWordPage text="Not found"/>
  }

  return (
    <div>
      <div>
        <div>{bookInfo.title}|{bookInfo.author}
          { sessionData?.userId && 
            <LikeBookButton is_liked={is_liked != null} is_ebook={true} ebook_id={ebook_id}/>
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
        <InsertBookCommentPanel is_ebook={true} ebook_id={ebook_id}/>
      }
    </div>
  );

}