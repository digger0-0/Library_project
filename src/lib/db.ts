import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "library.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

/** Reset the database (deletes all data) — useful for testing */
export function resetDb() {
  if (db) {
    db.close();
    db = undefined as unknown as Database.Database;
  }
}