'use server'

import { verifySession } from "./auth";
import { FormSate } from "./auth";
import { getDb } from "./db";
import { BookDetails, Rental, RentalRecord, User } from "./types";

export async function insertAnnouncement(formState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);

    if(!sessionData || sessionData.role != "admin"){
      return { success: false, message: "Unauthorized" };
    }

    const title = formData.get("title")?.toString().trim();
    const content = formData.get("content")?.toString().trim();

    if(!title || !content){
      return { success: false, message: "Incomplete input" };
    }

    const db = getDb();
    db.prepare("INSERT INTO announcements (title, content) VALUES (?, ?)").run(title, content);
    
    return { success: true, message: "New announcement added" };

  }catch(err){
    console.log("insertAnnouncement: ", err, new Date().toISOString());
    return { success: false, message: `Announcement insertion failed.\nerr: ${err}` };
  }
}

export async function insertBook(formState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);

    if(!sessionData || sessionData.role != "admin"){
      return { success: false, message: "Unauthoried  access" };
    }

    const isbn = formData.get("isbn")?.toString().trim();
    const title = formData.get("title")?.toString().trim();
    const author = formData.get("author")?.toString().trim();
    const publisher = formData.get("publisher")?.toString().trim();
    const classification = formData.get("classification")?.toString().trim();

    if(!isbn || !title || !author || !publisher || !classification){
      return { success: false, message: "Incomplete input" };
    }

    const db = getDb();
    const book_number = String((db.prepare(`
      SELECT COUNT(*) + 1 as book_count FROM books WHERE isbn = ?
    `).get(isbn) as { book_count: number } | undefined)?.book_count || 1);
    db.prepare(`
      INSERT INTO books 
      (isbn, book_number, title, author, publisher, classification) 
      VALUES
      (?, ?, ?, ?, ?, ?)
    `).run(isbn, book_number, title, author, publisher, classification);

    return { success: true, message: "New book added" };

  }catch(err){
    console.log("insertBook: ", err, new Date().toISOString());
    return { success: false, message: `Book insertion failed.\nerr: ${err}` };
  }
}

/** Format date for SQLite: "2026-06-27 12:34:56" */
function sqliteNow(): string {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

/** Add days to now and format for SQLite */
function sqliteDueDate(days: number, date?: Date): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().replace("T", " ").replace("Z", "");
}

export async function rentBook(formState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);

    if(!sessionData || sessionData.role != "admin"){
      return { success: false, message: "Unauthoried  access" };
    }

    const isbn = formData.get("isbn")?.toString().trim();
    const book_number = formData.get("book_number")?.toString().trim();
    const user_id = formData.get("user_id")?.toString().trim();
    const rentalDays = Number(process.env.RENTAL_PERIOD) || 14;
    const rental_date = sqliteNow();
    const due_date = sqliteDueDate(rentalDays);

    if(!isbn || !book_number || !user_id){
      return { success: false, message: "Incomplete input" };
    }

    const db = getDb();
    // verify book status
    const book = db.prepare("SELECT * FROM book_details WHERE isbn = ? AND book_number = ?")
    .get(isbn, book_number) as BookDetails;
    if(book == undefined){
      return { success: false, message: "Invalid ISBN or Book_number" };
    }else if(book.status != "on shelf"){
      return { success: false, message: "Book is rented" };
    }
    // verify user status
    const user = db.prepare("SELECT * FROM users WHERE user_id = ?")
    .get(user_id) as User;
    if(user == undefined){
      return { success: false, message: "Invalid user_id" };
    }
    // insert data
    db.prepare(`
      INSERT INTO rentals
      (isbn, book_number, user_id, rental_date, due_date)
      VALUES
      (?, ?, ?, ?, ?)
    `).run(isbn, book_number, user_id, rental_date, due_date);
    
    return { success: true, message: "Book rented" };
  }catch(err){
    console.log("rentBook: ", err, new Date().toISOString());
    return { success: false, message: `Book rental failed.\nerr: ${err}` };
  }
}

export async function returnBook(formState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);

    if(!sessionData || sessionData.role != "admin"){
      return { success: false, message: "Unauthoried  access" };
    }

    const rental_id = Number(formData.get("rental_id"));
    if(!rental_id){
      return { success: false, message: "Incomplete input" };
    }

    const db = getDb();
    // verify rental
    const rental = db.prepare(`SELECT * FROM rentals WHERE rental_id = ?`)
    .get(rental_id) as Rental;

    if(!rental){
      return { success: false, message: "Invalid rental id" };
    }else if(rental.return_date){
      return { success: false, message: "Rental ends" };
    }

    // update return date
    db.prepare("UPDATE rentals SET return_date = ? WHERE rental_id = ?")
    .run(sqliteNow(), rental_id);

    // check overdue
    if (rental.due_date < sqliteNow()) {
      return { success: true, message: "Rental overdue" };
    }
    
    return { success: true, message: "Book returned" };
  }catch(err){
    console.log("returnBook: ", err, new Date().toISOString());
    return { success: false, message: `Book return failed.\nerr: ${err}` };
  }
}

export async function renewBook(formState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);

    if(!sessionData){
      return { success: false, message: "Unauthoried  access" };
    }

    const rental_id = Number(formData.get("rental_id"));

    if(!rental_id){
      return { success: false, message: "Incomplete input" };
    }

    const db = getDb();
    const rental = db.prepare(`SELECT * FROM rentals WHERE rental_id = ? AND user_id = ?`)
    .get(rental_id, sessionData.userId) as Rental;
    
    // verify rental status
    if(!rental){
      return { success: false, message: "Invalid rental_id" };
    }else if(rental.renew > (Number(process.env.RENEWAL_LIMIT) || 5)){
      return { success: false, message: "Renew limit reached" };
    }else if(rental.due_date < sqliteNow()){
      return { success: false, message: "Rental overdue" };
    }else if(rental.return_date){
      return { success: false, message: "Rental ended" };
    }

    // update rental
    db.prepare(`UPDATE rentals SET due_date = ?, renew = ? WHERE rental_id = ?`)
    .run(
      sqliteDueDate(
        Number(process.env.RENEWAL_PERIOD),
      ),
      rental.renew + 1,
      rental_id
    );

    return { success: true, message: "Book renewed" };
  }catch(err){
    console.log("renewBook: ", err, new Date().toISOString());
    return { success: false, message: `Book renew failed.\nerr: ${err}` };
  }
}

export async function getRentalRecords(
  rowCount: number,
  page: number,
): Promise<{
  success: boolean,
  message: string,
  rentalRecords: RentalRecord[]
}>{
  try{
    const sessionData = await verifySession();

    if(!sessionData){
      return { success: false, message: "Unauthoried  access", rentalRecords: [] };
    }
    
    const db = getDb();
    const rentalRecords = db.prepare(`
      SELECT
        r.isbn,
        r.book_number,
        b.title,
        b.author,
        b.publisher,
        b.classification,
        
        b.classification || ' - ' || c.description AS full_classification,
        c.class_icon,

        r.rental_id,
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
      FROM rentals r
      LEFT JOIN books b ON r.isbn = b.isbn AND r.book_number = b.book_number
      LEFT JOIN classifications c ON b.classification = c.classification
      WHERE r.user_id = ?
      ORDER BY r.due_date DESC
      LIMIT ? OFFSET ?
    `).all(
      sessionData.userId,
      rowCount,
      (page - 1) * rowCount
    ) as RentalRecord[];

    return { success: true, message: "Rental records fetched", rentalRecords: rentalRecords };

  }catch(err){
    console.log("getRentalRecords: ", err, new Date().toISOString());
    return { success: false, message: `Rental records get failed.\nerr: ${err}`, rentalRecords: [] };
  }
}