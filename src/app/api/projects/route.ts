import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const books = db.prepare("SELECT * FROM books ORDER BY created_at DESC").all();
  return NextResponse.json(books);
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const result = db
    .prepare("INSERT INTO books (title, author, isbn) VALUES (?, ?, ?)")
    .run(body.title, body.author, body.isbn ?? null);
  const book = db
    .prepare("SELECT * FROM books WHERE id = ?")
    .get(result.lastInsertRowid);
  return NextResponse.json(book, { status: 201 });
}
