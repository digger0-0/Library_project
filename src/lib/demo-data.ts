/**
 * The demo library: sample content, plus the activity on top of it.
 *
 * Everything here is data a real deployment would replace:
 *   - the sample catalogue: 20 books and 6 ebooks
 *   - demo state: announcements, users, their loans, likes and comments
 *
 * seed-data.ts holds only the classification scheme, because that is structural
 * (books carry a FOREIGN KEY to it, and the search filters are built from it)
 * rather than sample content. Books and ebooks are the same kind of thing, so
 * they live together here.
 *
 * Lifecycles differ, which is why each seeder guards its own table:
 *   - the catalogue uses INSERT OR IGNORE, so re-running never disturbs edits
 *   - demo state is only created when its table is empty, so a reviewer's own
 *     loans and comments are never overwritten
 *
 * Every row here must satisfy the schema CHECK constraints:
 *   - likes/comments: is_ebook = 0 carries an isbn and NO ebook_id, and
 *     is_ebook = 1 carries an ebook_id and NO isbn (ck_*_shape)
 *   - comments: 1..1000 characters after trimming (ck_comments_content)
 *   - one like per user per item (ux_likes_book / ux_likes_ebook)
 *   - at most one ACTIVE loan per physical copy, or the catalogue would look
 *     like it lent the same copy to two people at once
 */
import crypto from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getDb } from "./db";

// The hashing must match src/lib/auth.ts so the printed demo passwords work.
const SALT = "salt";
function encryptPassword(password: string): string {
  return crypto.scryptSync(password, SALT, 32).toString("hex");
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** SQLite DATETIME format: "YYYY-MM-DD HH:MM:SS" in UTC, matching sqliteNow(). */
function iso(d: Date): string {
  return d.toISOString().replace("T", " ").replace("Z", "");
}
/** A moment `days` ago (negative = in the future). */
function daysAgo(days: number): string {
  return iso(new Date(Date.now() - days * DAY_MS));
}
/** The same day-of-month, `months` months back, clamped to the month's length. */
function monthsAgo(months: number, day: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  d.setUTCHours(9, 0, 0, 0);
  return iso(d);
}
/** Shift an SQLite datetime string by whole days. */
function shiftDays(stamp: string, days: number): string {
  return iso(new Date(new Date(stamp + "Z").getTime() + days * DAY_MS));
}

// ──────────────────────────────────────────────
//  Announcements (12 — enough for paging at 5 or 10 per page)
//  Inserted newest-first: AnnouncementPanel has no ORDER BY, so the list reads
//  in insertion order.
// ──────────────────────────────────────────────
export interface AnnouncementSeed {
  daysAgo: number;
  title: string;
  content: string;
}

export const sampleAnnouncements: AnnouncementSeed[] = [
  {
    daysAgo: 0,
    title: "Library closed for the Chung Yeung holiday",
    content:
      "The library will be closed on the Chung Yeung Festival. The returns chute stays open, so anything due that day can go back without a fine.\n\nOnline services (ebooks, account settings, renewals) remain available throughout.",
  },
  {
    daysAgo: 1,
    title: "New ebooks added to the collection",
    content:
      "Six new titles are now available to borrow as ebooks, including a long-form demo book you can use to try the reading-progress feature. Open one from the Ebook page — your place is saved automatically as you scroll, even if you leave the page and come back.",
  },
  {
    daysAgo: 3,
    title: "Extended opening hours during the exam period",
    content:
      "From next Monday the reading room stays open until 22:00 on weekdays. Bring your student card; the after-hours door uses the east entrance only.",
  },
  {
    daysAgo: 5,
    title:
      "Reminder: renew loans online before they fall due to avoid the queue at the counter and a fine on your record",
    content:
      "Loans can be renewed from Rental Records. Each loan may be renewed up to 5 times, and an overdue loan cannot be renewed until it is returned.\n\nThis is a deliberately long title so the announcement list can be seen truncating it at 30 characters and appending an ellipsis.",
  },
  {
    daysAgo: 9,
    title: "Quiet study zone moved to the second floor",
    content:
      "The group discussion area on the ground floor is now separate from the quiet zone, which has moved upstairs next to the reference shelves.",
  },
  {
    daysAgo: 14,
    title: "Book of the day now rotates daily",
    content:
      "The home page picks one book each day from the whole collection, including ebooks. If you are signed in it also tells you whether it is on the shelf or already out on loan.",
  },
  {
    daysAgo: 20,
    title: "Overdue notices are now shown on your rental records",
    content:
      "Anything past its due date is marked in red with the number of days it is late. Please return or renew items as soon as you can — other readers may be waiting.",
  },
  {
    daysAgo: 27,
    title: "Donation drive: bring a book, take a book",
    content:
      "We are accepting clean, undamaged paperbacks for the swap shelf by the entrance. Reference material and textbooks are especially welcome.",
  },
  {
    daysAgo: 35,
    title:
      "Scheduled maintenance: the catalogue and the self-service kiosks will be unavailable for a short period while we upgrade the circulation system, so please plan your borrowing around it",
    content: "We expect the work to take less than an hour. Fines will not accrue during the outage.",
  },
  {
    daysAgo: 48,
    title: "Welcome to the new library system",
    content:
      "You can now search the catalogue, borrow ebooks, renew loans and manage your account from any browser. Feedback is welcome at the front desk.",
  },
  {
    daysAgo: 62,
    title: "Deadline for returning summer reading titles",
    content:
      "All titles borrowed as part of the summer reading programme are due back by the end of the month so the sets can be re-catalogued.",
  },
  {
    daysAgo: 80,
    title: "Reading circle: first Tuesday of every month",
    content:
      "The circle meets in the periodicals room. No sign-up needed — just turn up with whatever you have been reading.\n\n" +
      "Questions about the schedule can go to the front desk, or look for the noticeboard beside the newspapers.",
  },
];

// ──────────────────────────────────────────────
//  Users (demo logins, all with password = <username>123 except admin)
//  admin is deliberately given the richest set of loans so the default login
//  demonstrates every rental/ebook feature without switching accounts.
// ──────────────────────────────────────────────
export const demoUsernames = ["admin", "alice", "bob", "carol", "dave", "erin"] as const;
export type DemoUsername = (typeof demoUsernames)[number];

// ──────────────────────────────────────────────//  Sample books (20)
// ─────────────────────────────────────────────
export interface BookSeed {
  isbn: string;
  book_number: string;
  title: string;
  author: string;
  publisher: string;
  classification: string;
}

export const sampleBooks: BookSeed[] = [
  { isbn: "978-0-141-03963-9", book_number: "1", title: "1984",                        author: "George Orwell",          publisher: "Penguin Books",           classification: "eng-800" },
  { isbn: "978-0-061-12008-4", book_number: "1", title: "To Kill a Mockingbird",       author: "Harper Lee",             publisher: "HarperCollins",           classification: "eng-800" },
  { isbn: "978-0-743-27356-5", book_number: "1", title: "The Great Gatsby",            author: "F. Scott Fitzgerald",    publisher: "Scribner",                classification: "eng-800" },
  { isbn: "978-0-452-28423-4", book_number: "1", title: "Brave New World",             author: "Aldous Huxley",          publisher: "Harper Perennial",        classification: "eng-800" },
  { isbn: "978-0-140-44926-6", book_number: "1", title: "The Odyssey",                 author: "Homer",                  publisher: "Penguin Classics",        classification: "eng-880" },
  { isbn: "978-0-521-67543-1", book_number: "1", title: "A Brief History of Time",     author: "Stephen Hawking",        publisher: "Bantam Books",            classification: "eng-530" },
  { isbn: "978-0-465-06710-7", book_number: "1", title: "The Selfish Gene",            author: "Richard Dawkins",        publisher: "Oxford University Press", classification: "eng-570" },
  { isbn: "978-0-393-35730-5", book_number: "1", title: "Silent Spring",               author: "Rachel Carson",          publisher: "Mariner Books",           classification: "eng-630" },
  { isbn: "978-0-14-143960-0", book_number: "1", title: "Pride and Prejudice",         author: "Jane Austen",            publisher: "Penguin Classics",        classification: "eng-800" },
  { isbn: "978-0-307-47769-1", book_number: "1", title: "The Catcher in the Rye",      author: "J.D. Salinger",          publisher: "Back Bay Books",          classification: "eng-800" },
  { isbn: "978-988-97022-8-1", book_number: "1", title: "香港的故事",                  author: "陳冠中",                 publisher: "牛津大學出版社",           classification: "chi-620" },
  { isbn: "978-988-85073-4-8", book_number: "1", title: "香港方物志",                  author: "葉靈鳳",                 publisher: "香港三聯書店",            classification: "chi-670" },
  { isbn: "978-962-04382-5-9", book_number: "1", title: "中國現代史",                  author: "張玉法",                 publisher: "東華書局",               classification: "chi-610" },
  { isbn: "978-957-32654-3-2", book_number: "1", title: "哲學概論",                    author: "傅佩榮",                 publisher: "天下文化",                classification: "chi-100" },
  { isbn: "978-957-11684-0-5", book_number: "1", title: "普通心理學",                  author: "游恆山",                 publisher: "五南圖書",                classification: "chi-170" },
  { isbn: "978-986-359-782-3", book_number: "1", title: "紅樓夢",                      author: "曹雪芹",                 publisher: "時報出版",                classification: "chi-850" },
  { isbn: "978-986-406-374-6", book_number: "1", title: "三體",                        author: "劉慈欣",                 publisher: "貓頭鷹出版",              classification: "chi-857" },
  { isbn: "978-962-678-740-3", book_number: "1", title: "香港中藥材圖鑑",              author: "李甯漢",                 publisher: "香港中文大學出版社",       classification: "chi-410" },
  { isbn: "978-957-08634-5-9", book_number: "1", title: "臺灣史",                      author: "戚嘉林",                 publisher: "海峽學術",                classification: "chi-620" },
  { isbn: "978-988-23713-4-7", book_number: "1", title: "香港地鐵地圖",                author: "三采文化",               publisher: "三采文化出版事業有限公司", classification: "chi-660" },
];

// ─────────────────────────────────────────────//  Ebooks (+ the text files setup writes into assets/ebooks)
//  Filenames must start with "demo-" -- build-portable.sh strips every other
//  file from assets/ebooks in the release and relies on setup to recreate these.
// ──────────────────────────────────────────────
export interface EbookSeed {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  classification: string;
  copies: number;
  filename: string;
}

export const demoEbooks: EbookSeed[] = [
  { isbn: "978-0-000-00010-1", title: "The Ebook Demo",    author: "Demo Author",   publisher: "Demo Press",      classification: "eng-800", copies: 3, filename: "demo-english.txt" },
  { isbn: "978-0-000-00010-2", title: "電子書示例",        author: "示例作者",      publisher: "示例出版社",      classification: "chi-810", copies: 1, filename: "demo-chinese.txt" },
  { isbn: "978-0-000-00010-3", title: "The Long Journey",  author: "Demo Author",   publisher: "Demo Press",      classification: "eng-800", copies: 3, filename: "demo-long.txt" },
  { isbn: "978-0-000-00010-4", title: "A Short Read",      author: "Demo Author",   publisher: "Demo Press",      classification: "eng-820", copies: 2, filename: "demo-short.txt" },
  { isbn: "978-0-000-00010-5", title: "三體（節錄）",       author: "劉慈欣",        publisher: "貓頭鷹出版",      classification: "chi-857", copies: 2, filename: "demo-chinese-two.txt" },
  { isbn: "978-0-000-00010-6", title: "Cosmos Notes",      author: "Demo Author",   publisher: "Demo Press",      classification: "eng-530", copies: 1, filename: "demo-science.txt" },
];

/** Contents of the files above, keyed by filename. */
export const demoEbookText: Record<string, string> = {
  "demo-english.txt": [
    "Chapter 1",
    "",
    "This is a demo ebook. Copies are identical, so up to `copies` readers can borrow it at the same time.",
    "",
    "Use it to try the reader: pick a book from the Ebook page, open it, and scroll. Your place is remembered per ebook, even after you leave the page.",
    "",
    "Happy reading!",
  ].join("\n"),

  "demo-chinese.txt": "第一章\n\n這是電子書的示範內容。\n\n第五章\n\n用這本來試試閱讀器：在電子書頁面選一本，打開，然後捲動。你的閱讀位置會依照書本各自記住。\n",

  "demo-short.txt":
    "A very short demo.\n\nShort enough that the reading-progress indicator jumps straight to 100% — useful for checking the edge case where there is barely anything to scroll.\n",

  "demo-chinese-two.txt":
    "第一章　科學邊界\n\n汪淼覺得這一刻整個世界都凝固了。\n\n第二章　檯球\n\n丁儀把檯球一顆顆排好，然後又把它們打散。\n\n第三章　射手與農場主\n\n物理學從來沒有像現在這樣令人不安。\n\n第四章　三體、牛頓、馮·諾伊曼\n\n遊戲裡的世界正在重演歷史。\n",

  "demo-science.txt":
    "Notes on the scale of things.\n\nIf the Sun were the size of a grapefruit, the Earth would be a grain of sand about fifteen metres away, and the nearest star would sit several thousand kilometres off.\n\nAlmost everything in the sky is further away than it looks.\n",

  // Deliberately long: the reader saves scroll progress per ebook, so a book
  // with plenty of text makes that feature demonstrable.
  "demo-long.txt": `The Little Library on Maple Street

Chapter One

Maple Street was quiet on most mornings, but the little library at number twelve was always awake before the sun.

Every day at dawn, Mrs. Okafor unlocked the heavy oak door and let the smell of paper and dust drift out into the street.

She had been the librarian here for forty years, and in that time she had seen the town change around her in ways large and small.

The bakery across the road changed hands three times, the post office closed, and the cinema became a supermarket.

Only the library stayed the same, patient as a stone, full of stories that did not care how fast the world outside moved.

Chapter Two

On the first day of autumn, a boy named Leo came in with rain on his shoulders and a question in his eyes.

He had just moved to the town with his mother, and the house still smelled of cardboard and fresh paint.

Do you have anything about the sea, he asked, and Mrs. Okafor smiled because everyone asked about the sea eventually.

She led him to the corner where the travel books lived and watched him pull one down and hold it like a treasure.

He read for two hours without once looking up, and when he left he borrowed the book and promised to return it.

Chapter Three

The sea book came back on time, which surprised no one, and Leo came back with it.

He asked about maps, then about ships, then about the explorers who had drawn lines across oceans no one had ever crossed.

Each week Mrs. Okafor found him something new, and each week he returned with the satisfied look of someone who had found a small piece of the world.

Chapter Four

By winter, Leo had read every travel book in the library and had begun to leave small notes inside them for the next reader.

The notes were simple things: this map is wrong, or read page forty slowly, or the author never actually went there.

Soon the notes became a habit, and other children began to leave notes of their own, and the library grew a quiet conversation that happened across the pages.

Chapter Five

Mrs. Okafor watched all of this and said nothing, because she believed that a library was a place where people should talk to each other without ever saying a word.

One evening in spring, Leo came in carrying a notebook that was worn at the edges and heavier than it looked.

It was his own book, written over the winter, full of seas he had never seen and islands he had invented for the maps he could not buy.

Mrs. Okafor found it a place on the shelf between the travel books and the novels, and she did not think it was out of place at all.

Chapter Six

The years passed the way years do, in a slow drift of seasons, and Leo grew up and went away to study the sea for real.

He wrote to the library sometimes, long letters full of latitude and longing, and Mrs. Okafor filed them in a drawer that she told no one about.

When he finally came back, he was older and the library was smaller than he remembered, but the smell of paper and dust was exactly the same.

Chapter Seven

Do you still have my book, he asked, and Mrs. Okafor led him to the shelf without a word.

The notebook was still there, fatter than he remembered, and when he opened it he found notes written in hands he did not recognize.

Readers had added to his maps, corrected his islands, and left him questions in the margins, and the conversation had continued without him for years.

Chapter Eight

Leo sat on the same chair he had sat in as a boy and read his own book aloud to no one in particular.

Outside, the bakery changed hands again, and the cinema stayed a supermarket, and the town went on being a town.

But in the little library on Maple Street, a story that began with a question about the sea was still being told, page after page, by everyone who had ever borrowed it.

The end.`,
};

// ──────────────────────────────────────────────
//  Book rentals
//
//  Dates are expressed as "days until due" relative to the moment setup runs,
//  because that is what the views test: due_date > now means on loan.
//    dueIn  > 14        on loan, comfortable
//    0 < dueIn <= 14    on loan, due soon
//    dueIn <= 0         overdue
//    returned: true     already back (goes into the history list)
//
//  rental_date is derived as due_date - 14 days, so an active loan usually sits
//  in the current month and the returned history spreads over earlier months.
//  That is what makes the monthly and yearly ranking tables differ from each
//  other instead of showing identical numbers.
// ──────────────────────────────────────────────
export interface BookRentalSeed {
  user: DemoUsername;
  isbn: string;
  dueIn: number;
  renew?: number;
  returned?: boolean;
}

export const demoBookRentals: BookRentalSeed[] = [
  // admin — the default login, so it gets every state at least once
  { user: "admin", isbn: "978-0-141-03963-9", dueIn: 5 },              // 1984, renewable
  { user: "admin", isbn: "978-0-061-12008-4", dueIn: 11, renew: 5 },   // at the renewal limit
  { user: "admin", isbn: "978-0-140-44926-6", dueIn: -9 },             // overdue
  { user: "admin", isbn: "978-0-14-143960-0", dueIn: -40, returned: true },
  { user: "admin", isbn: "978-986-406-374-6", dueIn: -70, returned: true },

  // alice
  { user: "alice", isbn: "978-0-14-143960-0", dueIn: 3 },
  { user: "alice", isbn: "978-0-521-67543-1", dueIn: -20 },            // overdue
  { user: "alice", isbn: "978-0-743-27356-5", dueIn: -15, returned: true },
  { user: "alice", isbn: "978-988-85073-4-8", dueIn: -33, returned: true },
  { user: "alice", isbn: "978-0-452-28423-4", dueIn: -55, returned: true },

  // bob
  { user: "bob", isbn: "978-0-743-27356-5", dueIn: 8 },
  { user: "bob", isbn: "978-0-465-06710-7", dueIn: -5 },               // overdue
  { user: "bob", isbn: "978-0-521-67543-1", dueIn: -22, returned: true },
  { user: "bob", isbn: "978-986-359-782-3", dueIn: -48, returned: true },

  // carol
  { user: "carol", isbn: "978-0-452-28423-4", dueIn: 6 },
  { user: "carol", isbn: "978-0-393-35730-5", dueIn: -12 },            // overdue
  { user: "carol", isbn: "978-0-141-03963-9", dueIn: -30, returned: true },
  { user: "carol", isbn: "978-962-678-740-3", dueIn: -62, returned: true },
  { user: "carol", isbn: "978-957-32654-3-2", dueIn: -25, returned: true },

  // dave
  { user: "dave", isbn: "978-0-307-47769-1", dueIn: 9 },
  { user: "dave", isbn: "978-988-97022-8-1", dueIn: -18 },             // overdue
  { user: "dave", isbn: "978-0-14-143960-0", dueIn: -26, returned: true },
  { user: "dave", isbn: "978-0-465-06710-7", dueIn: -44, returned: true },

  // erin
  { user: "erin", isbn: "978-988-85073-4-8", dueIn: 12 },
  { user: "erin", isbn: "978-962-04382-5-9", dueIn: -7 },              // overdue
  { user: "erin", isbn: "978-0-743-27356-5", dueIn: -38, returned: true },
  { user: "erin", isbn: "978-0-307-47769-1", dueIn: -58, returned: true },
];

// ──────────────────────────────────────────────
//  Ebook rentals — same date convention. Active loans per ebook are checked
//  against its `copies` so the "available" count never goes negative.
// ──────────────────────────────────────────────
export interface EbookRentalSeed {
  user: DemoUsername;
  ebookIsbn: string;
  dueIn: number;
  renew?: number;
  returned?: boolean;
}

export const demoEbookRentals: EbookRentalSeed[] = [
  // admin — enough to open the reader, renew, return and see an overdue one
  { user: "admin", ebookIsbn: "978-0-000-00010-1", dueIn: 7 },              // the demo reader
  { user: "admin", ebookIsbn: "978-0-000-00010-3", dueIn: 4 },              // the long one, for scroll progress
  { user: "admin", ebookIsbn: "978-0-000-00010-4", dueIn: -6 },             // overdue
  { user: "admin", ebookIsbn: "978-0-000-00010-2", dueIn: -45, returned: true },

  { user: "alice", ebookIsbn: "978-0-000-00010-1", dueIn: 3 },
  { user: "alice", ebookIsbn: "978-0-000-00010-3", dueIn: -20, returned: true },

  { user: "bob", ebookIsbn: "978-0-000-00010-3", dueIn: 9 },
  { user: "bob", ebookIsbn: "978-0-000-00010-5", dueIn: -3 },               // overdue
  { user: "bob", ebookIsbn: "978-0-000-00010-1", dueIn: -35, returned: true },

  { user: "carol", ebookIsbn: "978-0-000-00010-2", dueIn: 6 },
  { user: "carol", ebookIsbn: "978-0-000-00010-6", dueIn: -30, returned: true },

  { user: "erin", ebookIsbn: "978-0-000-00010-1", dueIn: 2 },
];

// ──────────────────────────────────────────────
//  Likes — "most but not all": 15 of the 20 books and 4 of the 6 ebooks.
//  One row per (user, item) because of the UNIQUE indexes.
// ──────────────────────────────────────────────
export interface LikeSeed {
  user: DemoUsername;
  isbn?: string;
  ebookIsbn?: string;
}

const likedBookUsers: [string, DemoUsername[]][] = [
  ["978-0-141-03963-9", ["alice", "bob", "carol", "dave"]],
  ["978-0-061-12008-4", ["alice", "bob", "carol", "erin"]],
  ["978-0-743-27356-5", ["alice", "dave"]],
  ["978-0-452-28423-4", ["bob", "carol"]],
  ["978-0-140-44926-6", ["alice", "erin"]],
  ["978-0-521-67543-1", ["bob", "dave", "erin"]],
  ["978-0-465-06710-7", ["carol"]],
  ["978-0-393-35730-5", ["alice", "dave"]],
  ["978-0-14-143960-0", ["alice", "bob", "carol", "dave", "erin"]],
  ["978-0-307-47769-1", ["bob", "erin"]],
  ["978-988-97022-8-1", ["carol", "dave"]],
  ["978-986-406-374-6", ["alice", "bob", "carol"]],
  ["978-986-359-782-3", ["erin"]],
  ["978-957-32654-3-2", ["bob", "carol"]],
  ["978-957-11684-0-5", ["alice"]],
  // left without any likes on purpose, so an empty state is reachable:
  // 978-988-85073-4-8, 978-962-04382-5-9, 978-962-678-740-3,
  // 978-957-08634-5-9, 978-988-23713-4-7
];

const likedEbookUsers: [string, DemoUsername[]][] = [
  ["978-0-000-00010-1", ["alice", "bob", "carol"]],
  ["978-0-000-00010-3", ["alice", "bob", "dave"]],
  ["978-0-000-00010-2", ["carol"]],
  ["978-0-000-00010-5", ["bob", "erin"]],
  // 978-0-000-00010-4 and ...-6 deliberately unliked
];

export const demoLikes: LikeSeed[] = [
  ...likedBookUsers.flatMap(([isbn, users]) => users.map((user) => ({ user, isbn }))),
  ...likedEbookUsers.flatMap(([ebookIsbn, users]) => users.map((user) => ({ user, ebookIsbn }))),
];

// ──────────────────────────────────────────────
//  Comments — most books get a few; Mockingbird gets 7 so the pager on
//  /bookInfo has more than one page at the default 5 rows.
// ──────────────────────────────────────────────
export interface CommentSeed {
  user: DemoUsername;
  isbn?: string;
  ebookIsbn?: string;
  daysAgo: number;
  content: string;
}

const bookComments: [string, DemoUsername, number, string][] = [
  // To Kill a Mockingbird — 7 comments, enough to page
  ["978-0-061-12008-4", "alice", 6, "The trial chapters are the heart of it — Atticus's closing speech is worth the whole book."],
  ["978-0-061-12008-4", "bob", 4, "Read it in one sitting. Scout's narration makes a heavy subject feel close and human."],
  ["978-0-061-12008-4", "carol", 3, "Borrowed this for a class and ended up reading well past the assigned chapters."],
  ["978-0-061-12008-4", "dave", 2, "Still the best thing I have read about a small town and a big injustice."],
  ["978-0-061-12008-4", "erin", 2, "The courtroom scenes are extraordinary, but the neighbourhood ones stayed with me longer."],
  ["978-0-061-12008-4", "alice", 1, "Re-read it this year. It holds up completely."],
  ["978-0-061-12008-4", "carol", 0, "Worth reading slowly, especially the first hundred pages."],

  ["978-0-141-03963-9", "alice", 5, "Bleak, and somehow even more relevant than when I first read it."],
  ["978-0-141-03963-9", "bob", 3, "Understood the horror of the appendix after finishing it. Read the appendix properly."],
  ["978-0-141-03963-9", "dave", 1, "The language is the trick: it makes the nightmare sound reasonable."],

  ["978-0-743-27356-5", "dave", 4, "Short enough to finish in an afternoon, sharp enough to argue about for weeks."],
  ["978-0-743-27356-5", "bob", 2, "That last page is doing a lot of work."],

  ["978-0-452-28423-4", "carol", 5, "The worldbuilding has aged better than I expected."],
  ["978-0-452-28423-4", "bob", 1, "Comfort has a cost, and this book sends the bill."],

  ["978-0-140-44926-6", "carol", 3, "Slow at first, then you suddenly realise you have been holding your breath for three chapters."],
  ["978-0-140-44926-6", "erin", 1, "Read it aloud and it becomes a different book entirely."],

  ["978-0-521-67543-1", "bob", 4, "Explains horizons and black holes without a single equation you cannot skip."],
  ["978-0-521-67543-1", "dave", 2, "The chapter on the arrow of time is the one I keep coming back to."],

  ["978-0-14-143960-0", "alice", 5, "Austen's opening line is still the best joke in English fiction."],
  ["978-0-14-143960-0", "erin", 3, "Every conversation is a negotiation and every negotiation is a performance."],
  ["978-0-14-143960-0", "carol", 1, "Mr Collins remains unbearable in exactly the intended way."],

  ["978-0-465-06710-7", "carol", 2, "Argues its case properly, even where it overreaches."],
  ["978-0-393-35730-5", "alice", 3, "Changed how I think about a single sprayed field and everything downstream of it."],
  ["978-0-307-47769-1", "erin", 2, "Holden is exhausting and that is entirely the point."],
  ["978-988-97022-8-1", "dave", 2, "香港的故事，讀起來像在聽一個很會說故事的人閒聊。"],
  ["978-986-406-374-6", "carol", 4, "開頭就停不下來，物理名詞沒有想像中難。"],
  ["978-986-359-782-3", "erin", 1, "人物太多，但看到一半就會自己記住了。"],
  ["978-957-32654-3-2", "bob", 3, "適合作為哲學入門，每章都可以單獨讀。"],
  ["978-957-11684-0-5", "alice", 1, "教科書式的寫法，但例子選得不錯。"],
  // No comments on purpose for: 978-988-85073-4-8, 978-962-04382-5-9,
  // 978-962-678-740-3, 978-957-08634-5-9, 978-988-23713-4-7
];

const ebookComments: [string, DemoUsername, number, string][] = [
  ["978-0-000-00010-1", "bob", 1, "Handy that several copies are available at once — no waiting to borrow this one."],
  ["978-0-000-00010-1", "carol", 0, "Good place to start if you want to see how the reader works."],
  ["978-0-000-00010-3", "alice", 2, "Long enough to test the reading-progress saving. Close the page and reopen it."],
  ["978-0-000-00010-3", "dave", 1, "Scrolled halfway, came back the next day, and it remembered exactly where I was."],
  ["978-0-000-00010-2", "carol", 2, "中文電子書顯示正常。"],
  ["978-0-000-00010-5", "erin", 1, "節錄版本，但足夠看出排版效果。"],
  // 978-0-000-00010-4 and ...-6 left without comments
];

export const demoComments: CommentSeed[] = [
  ...bookComments.map(([isbn, user, daysAgo, content]) => ({ user, isbn, daysAgo, content })),
  ...ebookComments.map(([ebookIsbn, user, daysAgo, content]) => ({ user, ebookIsbn, daysAgo, content })),
];

// ──────────────────────────────────────────────
//  Seeding
// ──────────────────────────────────────────────
const LOAN_DAYS = 14;

/** username -> user_id, for the users that actually exist. */
function lookupUsers(): Map<string, number> {
  const rows = getDb()
    .prepare("SELECT user_id, username FROM users")
    .all() as { user_id: number; username: string }[];
  return new Map(rows.map((r) => [r.username, r.user_id]));
}

/** ebook isbn -> ebook_id, for the ebooks that actually exist. */
function lookupEbooks(): Map<string, { id: number; copies: number }> {
  const rows = getDb()
    .prepare("SELECT ebook_id, isbn, copies FROM ebooks WHERE isbn IS NOT NULL")
    .all() as { ebook_id: number; isbn: string; copies: number }[];
  return new Map(rows.map((r) => [r.isbn, { id: r.ebook_id, copies: r.copies }]));
}

function isEmpty(table: string): boolean {
  const row = getDb().prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number };
  return row.n === 0;
}

/** The 20 sample books. Needs classifications to exist first (FOREIGN KEY). */
export function seedSampleBooks(): number {
  const db = getDb();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO books (isbn, book_number, title, author, publisher, classification)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const b of sampleBooks) {
    insert.run(b.isbn, b.book_number, b.title, b.author, b.publisher, b.classification);
  }
  console.log(`Inserted ${sampleBooks.length} books.`);
  return sampleBooks.length;
}

export function seedAnnouncements(): number {
  if (!isEmpty("announcements")) {
    console.log("⚠ announcements already exist — skipped");
    return 0;
  }
  const db = getDb();
  const insert = db.prepare(
    "INSERT INTO announcements (ann_date, title, content) VALUES (?, ?, ?)"
  );
  for (const a of sampleAnnouncements) {
    insert.run(daysAgo(a.daysAgo), a.title, a.content);
  }
  console.log(`✓ Demo announcements created (${sampleAnnouncements.length})`);
  return sampleAnnouncements.length;
}

export function seedDemoUsers(): Map<string, number> {
  const db = getDb();
  let created = 0;
  for (const username of demoUsernames) {
    if (username === "admin") continue; // created by setup with a known password
    const exists = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
    if (!exists) {
      db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'user')").run(
        username,
        encryptPassword(`${username}123`)
      );
      created++;
    }
  }
  console.log(
    created > 0
      ? `✓ Demo users created (${created}) — alice/bob/carol/dave/erin, password <name>123`
      : "⚠ Demo users already exist — skipped"
  );
  return lookupUsers();
}

/** Writes the ebook files and inserts the rows. Returns isbn -> {id, copies}. */
export function seedDemoEbooks(assetsDir: string): Map<string, { id: number; copies: number }> {
  const db = getDb();
  const dir = assetsDir;
  if (!isEmpty("ebooks")) {
    console.log("⚠ ebooks already exist — skipped");
    return lookupEbooks();
  }
  // Files are (re)written even if the rows somehow exist, because the portable
  // build strips everything that is not demo-*.
  mkdirSync(dir, { recursive: true });
  for (const [filename, text] of Object.entries(demoEbookText)) {
    writeFileSync(path.join(dir, filename), text);
  }

  const insert = db.prepare(
    `INSERT INTO ebooks (isbn, title, author, publisher, classification, copies, filename)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const e of demoEbooks) {
    insert.run(e.isbn, e.title, e.author, e.publisher, e.classification, e.copies, e.filename);
  }
  console.log(`✓ Demo ebooks created (${demoEbooks.length})`);
  return lookupEbooks();
}

export function seedBookRentals(users: Map<string, number>): number {
  if (!isEmpty("rentals")) {
    console.log("⚠ rentals already exist — skipped");
    return 0;
  }
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO rentals (isbn, book_number, user_id, rental_date, due_date, return_date, renew)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  // A copy can only be out on one loan at a time.
  const busy = new Set<string>();
  let created = 0;
  let skipped = 0;

  for (const r of demoBookRentals) {
    const userId = users.get(r.user);
    if (!userId) {
      skipped++;
      continue;
    }
    const due = daysAgo(-r.dueIn);
    const borrowed = shiftDays(due, -LOAN_DAYS);
    const active = !r.returned;
    if (active) {
      if (busy.has(r.isbn)) {
        console.log(`⚠ ${r.isbn} already on loan — skipped ${r.user}'s duplicate active loan`);
        skipped++;
        continue;
      }
      busy.add(r.isbn);
    }
    insert.run(
      r.isbn,
      "1",
      userId,
      borrowed,
      due,
      r.returned ? shiftDays(due, -1) : null,
      r.renew ?? 0
    );
    created++;
  }
  console.log(`✓ Demo book rentals created (${created}${skipped ? `, ${skipped} skipped` : ""})`);
  return created;
}

export function seedEbookRentals(
  users: Map<string, number>,
  ebooks: Map<string, { id: number; copies: number }>
): number {
  if (!isEmpty("ebook_rentals")) {
    console.log("⚠ ebook rentals already exist — skipped");
    return 0;
  }
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO ebook_rentals (ebook_id, user_id, rental_date, due_date, return_date, renew)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  // Never lend more copies than exist, or `available` in ebook_details goes negative.
  const out = new Map<string, number>();
  let created = 0;
  let skipped = 0;

  for (const r of demoEbookRentals) {
    const userId = users.get(r.user);
    const ebook = ebooks.get(r.ebookIsbn);
    if (!userId || !ebook) {
      skipped++;
      continue;
    }
    if (!r.returned) {
      const current = out.get(r.ebookIsbn) ?? 0;
      if (current >= ebook.copies) {
        console.log(`⚠ ${r.ebookIsbn} has only ${ebook.copies} cop(y/ies) — skipped ${r.user}'s loan`);
        skipped++;
        continue;
      }
      out.set(r.ebookIsbn, current + 1);
    }
    const due = daysAgo(-r.dueIn);
    insert.run(
      ebook.id,
      userId,
      shiftDays(due, -LOAN_DAYS),
      due,
      r.returned ? shiftDays(due, -1) : null,
      r.renew ?? 0
    );
    created++;
  }
  console.log(`✓ Demo ebook rentals created (${created}${skipped ? `, ${skipped} skipped` : ""})`);
  return created;
}

export function seedLikes(
  users: Map<string, number>,
  ebooks: Map<string, { id: number; copies: number }>
): number {
  if (!isEmpty("likes")) {
    console.log("⚠ likes already exist — skipped");
    return 0;
  }
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO likes (isbn, ebook_id, is_ebook, user_id, created_at) VALUES (?, ?, ?, ?, ?)`
  );
  // Stagger the timestamps so a "liked at" ordering is meaningful.
  let n = 0;
  for (const like of demoLikes) {
    const userId = users.get(like.user);
    if (!userId) continue;
    const created = daysAgo(2 + (n % 30));
    if (like.ebookIsbn) {
      const ebook = ebooks.get(like.ebookIsbn);
      if (!ebook) continue;
      insert.run(null, ebook.id, 1, userId, created);
    } else if (like.isbn) {
      insert.run(like.isbn, null, 0, userId, created);
    }
    n++;
  }
  console.log(`✓ Demo likes created (${n}) across ${likedBookUsers.length} books and ${likedEbookUsers.length} ebooks`);
  return n;
}

export function seedComments(
  users: Map<string, number>,
  ebooks: Map<string, { id: number; copies: number }>
): number {
  if (!isEmpty("comments")) {
    console.log("⚠ comments already exist — skipped");
    return 0;
  }
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO comments (isbn, ebook_id, is_ebook, user_id, created_at, content)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  let n = 0;
  for (const c of demoComments) {
    const userId = users.get(c.user);
    if (!userId) continue;
    const created = daysAgo(c.daysAgo);
    if (c.ebookIsbn) {
      const ebook = ebooks.get(c.ebookIsbn);
      if (!ebook) continue;
      insert.run(null, ebook.id, 1, userId, created, c.content);
    } else if (c.isbn) {
      insert.run(c.isbn, null, 0, userId, created, c.content);
    }
    n++;
  }
  const booksWith = new Set(demoComments.filter((c) => c.isbn).map((c) => c.isbn)).size;
  const ebooksWith = new Set(demoComments.filter((c) => c.ebookIsbn).map((c) => c.ebookIsbn)).size;
  console.log(`✓ Demo comments created (${n}) across ${booksWith} books and ${ebooksWith} ebooks`);
  return n;
}
