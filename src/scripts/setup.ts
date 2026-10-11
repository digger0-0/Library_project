/**
 * One-time initial setup for the Library Project.
 *
 * This file is orchestration only. All fixture data lives in the data modules:
 *   src/lib/seed-data.ts   the classification scheme (structural, not sample content)
 *   src/lib/demo-data.ts   the demo library — sample books and ebooks, announcements,
 *                          users, their loans, likes and comments
 *
 * Each seeder guards its own table: the catalogue is inserted with INSERT OR
 * IGNORE so re-running never disturbs edits, while demo state is only created
 * when its table is empty so a reviewer's own loans are never overwritten.
 *
 * Run with:
 *   npm run setup
 */
import crypto from "node:crypto";
import path from "node:path";
import { getDb } from "../lib/db";
import { initDB } from "../lib/db-init";
import { seedClassifications } from "../lib/seed-data";
import {
  seedSampleBooks,
  seedAnnouncements,
  seedDemoUsers,
  seedDemoEbooks,
  seedBookRentals,
  seedEbookRentals,
  seedLikes,
  seedComments,
} from "../lib/demo-data";

// Must match the hashing in src/lib/auth.ts
const SALT = "salt";
function encryptPassword(password: string): string {
  return crypto.scryptSync(password, SALT, 32).toString("hex");
}

async function main() {
  console.log("=== Library Project Setup ===\n");

  // 1. Tables + views
  await initDB();
  console.log("✓ Database tables + book_details view created");

  // 2. The classification scheme. Structural, not sample content: books carry a
  //    FOREIGN KEY to it and the search filters are built from it.
  seedClassifications();

  // 3. Admin account. Not demo data — without it there is no way to sign in.
  const db = getDb();
  const admin = db.prepare("SELECT 1 FROM users WHERE username = ?").get("admin");
  if (!admin) {
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')").run(
      "admin",
      encryptPassword("admin")
    );
    console.log("✓ Default admin created:  admin / admin");
  } else {
    console.log("⚠ admin already exists — skipped");
  }

  // 4. The demo library, in FK order: catalogue first, then the people, then
  //    everything that references either.
  seedSampleBooks();
  const ebooks = seedDemoEbooks(path.join(process.cwd(), "assets", "ebooks"));
  seedAnnouncements();
  const users = seedDemoUsers();
  seedBookRentals(users);
  seedEbookRentals(users, ebooks);
  seedLikes(users, ebooks);
  seedComments(users, ebooks);

  console.log("\n=== Setup complete ===");
  console.log("Admin login:  admin / admin");
  console.log("Demo users:   alice / alice123, bob / bob123, carol / carol123,");
  console.log("              dave / dave123, erin / erin123");
  console.log("");
  console.log("Sign in as admin to demonstrate borrowing: it holds active book and");
  console.log("ebook loans, an overdue one, one already at the renewal limit, and");
  console.log("ebooks that open in the reader.");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
