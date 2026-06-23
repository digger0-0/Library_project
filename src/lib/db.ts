import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "library.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL"); // better performance
    initializeTables();
  }
  return db;
}

function initializeTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}
