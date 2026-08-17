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
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
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

  // 6. Demo ebooks (only if there are none)
  const ebookCount = (db.prepare("SELECT COUNT(*) AS c FROM ebooks").get() as { c: number }).c;
  if (ebookCount === 0) {
    const ebookDir = path.join(process.cwd(), "/assets/ebooks");
    mkdirSync(ebookDir, { recursive: true });
    writeFileSync(path.join(ebookDir, "demo-english.txt"),
      "Chapter 1\n\nThis is a demo ebook. Because the copies are identical, up to `available` users can borrow it at the same time.\n\nHappy reading!"
    );
    writeFileSync(path.join(ebookDir, "demo-chinese.txt"),
      "第一章\n\n這是電子書的示範內容。"
    );
    // Long demo ebook: many paragraphs so the scroll-progress / resume feature
    // in EbookViewer (saved per ebook in localStorage) has something to demo.
    writeFileSync(path.join(ebookDir, "demo-long.txt"), `The Little Library on Maple Street

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

The end.`);
    const insertEbook = db.prepare(
      "INSERT INTO ebooks (isbn, title, author, publisher, classification, copies, filename) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    insertEbook.run("978-0-000-00010-1", "The Ebook Demo", "Demo Author", "Demo Pub", "eng-800", 3, "demo-english.txt");
    insertEbook.run("978-0-000-00010-2", "電子書示例", "示例作者", "示例出版社", "chi-810", 1, "demo-chinese.txt");
    insertEbook.run("978-0-000-00010-3", "The Long Journey", "Demo Author", "Demo Pub", "eng-800", 3, "demo-long.txt");
    console.log(`✓ Demo ebooks created (3)`);
  }

  console.log("\n=== Setup complete ===");
  console.log("Admin login:  admin / admin");
  console.log("Demo users:   alice / alice123, bob / bob123, carol / carol123");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
