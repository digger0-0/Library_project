import { getDb } from "./db";

/** Call this once when the app starts to set up the database tables */
export async function initDB() {
  const db = getDb();

  db.exec(`PRAGMA foreign_keys = ON;`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id     INTEGER PRIMARY KEY AUTOINCREMENT,
      username    VARCHAR(20) NOT NULL UNIQUE,
      password    VARCHAR(60) NOT NULL,
      role        TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      session VARCHAR(200)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS classifications (
      classification CHAR(10) PRIMARY KEY,
      description    VARCHAR(50) NOT NULL,
      class_icon     VARCHAR(10) NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      isbn            CHAR(17),
      book_number     CHAR(2),
      title           VARCHAR(30) NOT NULL,
      author          VARCHAR(20) NOT NULL,
      publisher       VARCHAR(20) NOT NULL,
      classification  CHAR(10) NOT NULL,
      deleted_at      DATETIME DEFAULT NULL,   -- soft delete: NULL = active
      PRIMARY KEY (isbn, book_number),
      FOREIGN KEY (classification) REFERENCES classifications(classification)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS isbnprefix (
      code    CHAR(9) PRIMARY KEY,
      country VARCHAR(20)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS rentals (
      rental_id   INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn        CHAR(17),
      book_number CHAR(2),
      user_id         INTEGER,
      rental_date DATETIME NOT NULL,
      due_date    DATETIME NOT NULL,
      return_date DATETIME,
      renew       INTEGER DEFAULT 0,
      FOREIGN KEY (isbn, book_number) REFERENCES books(isbn, book_number),
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      ann_id    INTEGER PRIMARY KEY AUTOINCREMENT,
      ann_date  DATETIME DEFAULT (datetime('now')),
      title     VARCHAR(100) NOT NULL,
      content   TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ebooks (
      ebook_id        INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn            CHAR(17) UNIQUE,           -- optional (NULL if no ISBN)
      title           VARCHAR(30) NOT NULL,
      author          VARCHAR(20) NOT NULL,
      publisher       VARCHAR(20) NOT NULL,
      classification  CHAR(10) NOT NULL,
      copies       INTEGER NOT NULL DEFAULT 1, -- number of identical digital copies
      filename        VARCHAR(255) NOT NULL,      -- .txt file name in the ebooks/ folder
      deleted_at      DATETIME DEFAULT NULL,      -- soft delete: NULL = active
      FOREIGN KEY (classification) REFERENCES classifications(classification)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ebook_rentals (
      ebook_rental_id INTEGER PRIMARY KEY AUTOINCREMENT,
      ebook_id        INTEGER NOT NULL,
      user_id         INTEGER NOT NULL,
      rental_date     DATETIME NOT NULL,
      due_date        DATETIME NOT NULL,
      return_date     DATETIME,
      renew           INTEGER DEFAULT 0,
      FOREIGN KEY (ebook_id) REFERENCES ebooks(ebook_id),
      FOREIGN KEY (user_id)  REFERENCES users(user_id)
    );
  `);

  // --- migration: rebuild likes/comments to add CHECK constraints -----------
  // SQLite cannot ALTER TABLE ... ADD CONSTRAINT, so the shape/content CHECKs
  // below can only be added by recreating the table. Detection is by the named
  // constraint: a table that lacks it predates this schema and gets rebuilt.
  //
  // Rebuilding drops those rows, which is accepted here — likes/comments are
  // low-value social data. It MUST stay conditional: initDB() also runs once per
  // server start (see src/instrumentation.ts), so an unconditional DROP would
  // wipe both tables on every boot. Dropping a table also drops its indexes;
  // they are recreated below.
  const needsRebuild = (table: string, marker: string) => {
    const row = db.prepare(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?"
    ).get(table) as { sql: string } | undefined;
    return row !== undefined && !row.sql.includes(marker);
  };
  if(needsRebuild("likes", "ck_likes_shape"))       db.exec(`DROP TABLE likes;`);
  if(needsRebuild("comments", "ck_comments_shape")) db.exec(`DROP TABLE comments;`);

  // is_ebook selects the row shape and the CHECK enforces it: a book like carries
  // an isbn and no ebook_id, an ebook like the reverse. This also pins is_ebook to
  // {0,1} and closes the NULL hole in ux_likes_ebook, where an ebook row with
  // ebook_id IS NULL was invisible to the UNIQUE index and so could duplicate.
  // The ebook_id FOREIGN KEY is safe for both shapes: book rows have ebook_id
  // NULL, and SQLite does not enforce an FK for NULL values.
  db.exec(`
    CREATE TABLE IF NOT EXISTS likes (
      like_id    INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn       CHAR(17),
      ebook_id   INTEGER,
      is_ebook   INTEGER NOT NULL,
      user_id    INTEGER NOT NULL,
      created_at DATETIME NOT NULL,
      FOREIGN KEY (user_id)  REFERENCES users(user_id),
      FOREIGN KEY (ebook_id) REFERENCES ebooks(ebook_id),
      CONSTRAINT ck_likes_shape CHECK (
        (is_ebook = 0 AND isbn IS NOT NULL AND ebook_id IS NULL) OR
        (is_ebook = 1 AND isbn IS NULL     AND ebook_id IS NOT NULL)
      )
    );
  `);

  // Same shape rule as likes, plus a content guard: NOT NULL alone still allows
  // an empty string. trim() takes only spaces unless given a character set, so
  // the tabs/newlines in char(9,10,13,32) are spelled out — otherwise a comment
  // of "\t" would pass. 1000 chars is the cap insertBookComment enforces.
  // NOTE: a DB rebuilt by an earlier version of this migration won't pick up a
  // change to this CHECK unless the rebuild marker below is bumped too.
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn       CHAR(17),
      ebook_id   INTEGER,
      is_ebook   INTEGER NOT NULL,
      user_id    INTEGER NOT NULL,
      created_at DATETIME NOT NULL,
      content    TEXT NOT NULL,
      FOREIGN KEY (user_id)  REFERENCES users(user_id),
      FOREIGN KEY (ebook_id) REFERENCES ebooks(ebook_id),
      CONSTRAINT ck_comments_shape CHECK (
        (is_ebook = 0 AND isbn IS NOT NULL AND ebook_id IS NULL) OR
        (is_ebook = 1 AND isbn IS NULL     AND ebook_id IS NOT NULL)
      ),
      CONSTRAINT ck_comments_content CHECK (
        length(trim(content, char(9,10,13,32))) BETWEEN 1 AND 1000
      )
    );
  `);

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_likes_book  ON likes(isbn, user_id)             WHERE NOT is_ebook;
    CREATE UNIQUE INDEX IF NOT EXISTS ux_likes_ebook ON likes(ebook_id, user_id)         WHERE is_ebook;
    CREATE INDEX IF NOT EXISTS ix_comments_book      ON comments(isbn, created_at DESC)     WHERE NOT is_ebook;
    CREATE INDEX IF NOT EXISTS ix_comments_ebook     ON comments(ebook_id, created_at DESC) WHERE is_ebook;
  `);

  db.exec(`DROP VIEW IF EXISTS book_details;`);

  db.exec(`
    CREATE VIEW book_details AS
    SELECT
      b.isbn,
      b.book_number,
      b.title,
      b.author,
      b.publisher,
      b.classification,
      b.classification || ' - ' || c.description AS full_classification,
      c.class_icon,

      r.rental_id,
      r.user_id,
      u.username,
      r.rental_date,
      r.due_date,
      r.return_date,

      CASE
        WHEN r.rental_id IS NULL       THEN 'on shelf'
        WHEN r.return_date IS NOT NULL  THEN 'on shelf'
        WHEN r.due_date < datetime('now') THEN 'overdue'
        ELSE 'rent'
      END AS status,

      CASE
        WHEN r.return_date IS NOT NULL THEN NULL
        WHEN r.due_date < datetime('now')
          THEN CAST(julianday('now') - julianday(r.due_date) AS INTEGER)
        ELSE NULL
      END AS days_overdue,

      r.renew
    FROM books b
    LEFT JOIN classifications c ON b.classification = c.classification
    -- one row per book copy: pick the most recent ACTIVE (unreturned) rental
    LEFT JOIN rentals r ON r.rental_id = (
      SELECT r2.rental_id
      FROM rentals r2
      WHERE r2.isbn = b.isbn
        AND r2.book_number = b.book_number
        AND r2.return_date IS NULL
      ORDER BY r2.rental_id DESC
      LIMIT 1
    )
    LEFT JOIN users u ON r.user_id = u.user_id
    WHERE b.deleted_at IS NULL;
  `);

  db.exec(`DROP VIEW IF EXISTS ebook_details;`);

  db.exec(`
    CREATE VIEW ebook_details AS
    SELECT
      e.ebook_id,
      e.isbn,
      e.title,
      e.author,
      e.publisher,
      e.classification,
      e.copies,
      e.classification || ' - ' || c.description AS full_classification,
      c.class_icon,

      r.ebook_rental_id,
      r.user_id,
      u.username,
      r.rental_date,
      r.due_date,
      r.return_date,

      CASE
        WHEN r.ebook_rental_id IS NULL  THEN 'on shelf'
        WHEN r.return_date IS NOT NULL  THEN 'on shelf'
        WHEN r.due_date < datetime('now') THEN 'overdue'
        ELSE 'rent'
      END AS status,

      (e.copies - (SELECT COUNT(*) FROM ebook_rentals r1
        WHERE r1.ebook_id = e.ebook_id AND r1.return_date IS NULL
      )) AS available,

      CASE
        WHEN r.return_date IS NOT NULL THEN NULL
        WHEN r.due_date < datetime('now')
          THEN CAST(julianday('now') - julianday(r.due_date) AS INTEGER)
        ELSE NULL
      END AS days_overdue,

      r.renew
    FROM ebooks e
    LEFT JOIN classifications c ON e.classification = c.classification
    -- join the latest rental (so every ebook has at least one row) plus all
    -- active (unreturned) loans, so multi-copy loans each produce a row
    LEFT JOIN ebook_rentals r ON r.ebook_rental_id IN (
      SELECT ebook_rental_id FROM ebook_rentals
      WHERE ebook_id = e.ebook_id
        AND (return_date IS NULL OR ebook_rental_id = (
          -- the latest rental, so every ebook still shows at least one row
          SELECT ebook_rental_id FROM ebook_rentals
          WHERE ebook_id = e.ebook_id
          ORDER BY ebook_rental_id DESC LIMIT 1
        ))
    )
    LEFT JOIN users u ON r.user_id = u.user_id
    WHERE e.deleted_at IS NULL;
  `);
}