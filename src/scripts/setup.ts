/**
 * One-time initial setup for the Library Project.
 *
 * What it does:
 *  1. Create all database tables + the book_details view
 *  2. Seed classifications (202) + sample books (20)
 *  3. Create a default admin account
 *  4. Create demo user accounts
 *  5. Insert demo rental records (for leaderboard / overdue demo)
 *
 * Run with:
 *   npm run setup
 */
import crypto from "node:crypto";
import { getDb } from "../lib/db";
import { initDB } from "../lib/db-init";
import { seedDatabase } from "../lib/seed-data";

// Must match the hashing in src/lib/auth.ts
const SALT = "salt";
function encryptPassword(password: string): string {
  return crypto.scryptSync(password, SALT, 32).toString("hex");
}

const DAY = 24 * 60 * 60 * 1000;

function addDays(days: number): string {
  return new Date(Date.now() + days * DAY)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");
}

async function main() {
  console.log("=== Library Project Setup ===\n");

  // 1. Tables + view
  await initDB();
  console.log("✓ Database tables + book_details view created");

  // 2. Seed data (classifications + books)
  seedDatabase();
  console.log("✓ Sample data seeded (202 classifications, 20 books)");

  const db = getDb();

  // 3. Default admin
  const admin = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
  if (!admin) {
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')").run(
      "admin",
      encryptPassword("admin")
    );
    console.log("✓ Default admin created:  admin / admin");
  } else {
    console.log("⚠ admin already exists — skipped");
  }

  // 4. Demo users
  const demoUsers = [
    { username: "alice", password: "alice123" },
    { username: "bob", password: "bob123" },
    { username: "carol", password: "carol123" },
  ];
  for (const u of demoUsers) {
    const exists = db.prepare("SELECT * FROM users WHERE username = ?").get(u.username);
    if (!exists) {
      db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'user')").run(
        u.username,
        encryptPassword(u.password)
      );
      console.log(`✓ Demo user created:   ${u.username} / ${u.password}`);
    }
  }

  // 5. Demo rentals (only if there are none)
  const rentalCount = (db.prepare("SELECT COUNT(*) AS c FROM rentals").get() as { c: number }).c;
  if (rentalCount === 0) {
    const users = db.prepare("SELECT user_id FROM users WHERE username IN ('alice','bob','carol')").all() as { user_id: number }[];
    const books = db.prepare("SELECT isbn, book_number FROM books LIMIT 8").all() as { isbn: string; book_number: string }[];

    // Give each demo user some rentals with varying due dates
    const rent = db.prepare(
      "INSERT INTO rentals (isbn, book_number, user_id, rental_date, due_date, return_date, renew) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const b = books[i * 2];
      // active rental
      rent.run(b.isbn, b.book_number, u.user_id, addDays(-10), addDays(4), null, 1);
      // overdue rental (past due)
      const b2 = books[i * 2 + 1];
      rent.run(b2.isbn, b2.book_number, u.user_id, addDays(-30), addDays(-5), null, 0);
      // returned rental
      const b3 = books[i * 2 + 2];
      rent.run(b3.isbn, b3.book_number, u.user_id, addDays(-20), addDays(-6), addDays(-2), 0);
    }
    console.log(`✓ Demo rentals created (active / overdue / returned for each demo user)`);
  } else {
    console.log("⚠ rentals already exist — skipped");
  }

  console.log("\n=== Setup complete ===");
  console.log("Admin login:  admin / admin");
  console.log("Demo users:   alice / alice123, bob / bob123, carol / carol123");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
