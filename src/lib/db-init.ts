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
}