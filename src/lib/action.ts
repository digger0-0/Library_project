'use server'

import { revalidatePath } from "next/cache";
import { verifySession } from "./auth";
import { FormSate } from "./auth";
import { getDb } from "./db";
import { BookDetails, Rental, User } from "./types";
import { logger } from "./logger";
import { getClientIp } from "./request";

export async function insertAnnouncement(formState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);

    if(!sessionData || sessionData.role != "admin"){
      logger.warning("unauthorised access", { fn: "insertAnnouncement", user_id: sessionData?.userId, ip: await getClientIp() });
      return { success: false, message: "Unauthorized" };
    }

    const title = formData.get("title")?.toString().trim();
    const content = formData.get("content")?.toString().trim();

    if(!title || !content){
      logger.warning("incomplete input", { fn: "insertAnnouncement", user_id: sessionData.userId });
      return { success: false, message: "Incomplete input" };
    }

    const db = getDb();
    db.prepare("INSERT INTO announcements (title, content) VALUES (?, ?)").run(title, content);
    
    logger.info("New announcement added", {fn: "insertAnnouncement", title, content});
    revalidatePath("/announcement");
    return { success: true, message: "New announcement added" };

  }catch(err){
    logger.error("insertAnnouncement failed", {
      fn: "insertAnnouncement",
      title: formData.get("title")?.toString().trim()
    }, err);
    return { success: false, message: `Announcement insertion failed.\nerr: ${err}` };
  }
}

export async function insertBook(formState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);

    if(!sessionData || sessionData.role != "admin"){
      logger.warning("unauthorised access", { fn: "insertBook", user_id: sessionData?.userId, ip: await getClientIp() });
      return { success: false, message: "Unauthoried  access" };
    }

    const isbn = formData.get("isbn")?.toString().trim();
    const title = formData.get("title")?.toString().trim();
    const author = formData.get("author")?.toString().trim();
    const publisher = formData.get("publisher")?.toString().trim();
    const classification = formData.get("classification")?.toString().trim();

    if(!isbn || !title || !author || !publisher || !classification){
      logger.warning("incomplete input", { fn: "insertBook", user_id: sessionData.userId });
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

    logger.info("New book inserted", {fn: "insertBook", isbn, title});
    return { success: true, message: "New book added" };

  }catch(err){
    logger.error("insertBook failed", {
      fn: "insertBook",
      isbn: formData.get("isbn")?.toString().trim(),
      title: formData.get("title")?.toString().trim()
    }, err);
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
      logger.warning("unauthorised access", { fn: "rentBook", user_id: sessionData?.userId, ip: await getClientIp() });
      return { success: false, message: "Unauthoried  access" };
    }

    const isbn = formData.get("isbn")?.toString().trim();
    const book_number = formData.get("book_number")?.toString().trim();
    const user_id = formData.get("user_id")?.toString().trim();
    const rentalDays = Number(process.env.RENTAL_PERIOD) || 14;
    const rental_date = sqliteNow();
    const due_date = sqliteDueDate(rentalDays);

    if(!isbn || !book_number || !user_id){
      logger.warning("incomplete input", { fn: "rentBook", user_id: sessionData.userId });
      return { success: false, message: "Incomplete input" };
    }

    const db = getDb();
    // verify book status
    const book = db.prepare("SELECT * FROM book_details WHERE isbn = ? AND book_number = ?")
    .get(isbn, book_number) as BookDetails;
    if(book == undefined){
      logger.warning("invalid ISBN or book_number", { fn: "rentBook", operator_id: sessionData.userId, isbn, book_number });
      return { success: false, message: "Invalid ISBN or Book_number" };
    }else if(book.status != "on shelf"){
      logger.warning("book already rented", { fn: "rentBook", operator_id: sessionData.userId, isbn, book_number });
      return { success: false, message: "Book is rented" };
    }
    // verify user status
    const user = db.prepare("SELECT * FROM users WHERE user_id = ?")
    .get(user_id) as User;
    if(user == undefined){
      logger.warning("invalid user_id", { fn: "rentBook", operator_id: sessionData.userId, user_id });
      return { success: false, message: "Invalid user_id" };
    }
    // insert data
    db.prepare(`
      INSERT INTO rentals
      (isbn, book_number, user_id, rental_date, due_date)
      VALUES
      (?, ?, ?, ?, ?)
    `).run(isbn, book_number, user_id, rental_date, due_date);
    
    logger.info("Book rented", {fn: "rentBook", isbn, book_number, user_id});
    return { success: true, message: "Book rented" };
  }catch(err){
    logger.error("rentBook failed", {
      fn: "rentBook",
      isbn: formData.get("isbn")?.toString().trim(),
      book_number: formData.get("book_number")?.toString().trim(),
      user_id: formData.get("user_id")?.toString().trim()
    }, err);
    return { success: false, message: `Book rental failed.\nerr: ${err}` };
  }
}

export async function returnBook(formState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);

    if(!sessionData || sessionData.role != "admin"){
      logger.warning("unauthorised access", { fn: "returnBook", user_id: sessionData?.userId, ip: await getClientIp() });
      return { success: false, message: "Unauthoried  access" };
    }

    const rental_id = Number(formData.get("rental_id"));
    if(!rental_id){
      logger.warning("incomplete input", { fn: "returnBook", user_id: sessionData.userId });
      return { success: false, message: "Incomplete input" };
    }

    const db = getDb();
    // verify rental
    const rental = db.prepare(`SELECT * FROM rentals WHERE rental_id = ?`)
    .get(rental_id) as Rental;

    if(!rental){
      logger.warning("invalid rental id", { fn: "returnBook", operator_id: sessionData.userId, rental_id });
      return { success: false, message: "Invalid rental id" };
    }else if(rental.return_date){
      logger.warning("rental already ended", { fn: "returnBook", operator_id: sessionData.userId, rental_id });
      return { success: false, message: "Rental ends" };
    }

    // update return date
    db.prepare("UPDATE rentals SET return_date = ? WHERE rental_id = ?")
    .run(sqliteNow(), rental_id);

    // check overdue
    if (rental.due_date < sqliteNow()) {
      logger.info("Book returned, Rental overdue", {fn: "returnBook", rental_id});
      return { success: true, message: "Book returned, Rental overdue" };
    }
    
    logger.info("Book returned", {fn: "returnBook", rental_id});
    return { success: true, message: "Book returned" };
  }catch(err){
    logger.error("returnBook failed", {
      fn: "returnBook",
      rental_id: Number(formData.get("rental_id"))
    }, err);
    return { success: false, message: `Book return failed.\nerr: ${err}` };
  }
}

export async function renewBook(formState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);

    if(!sessionData){
      logger.warning("unauthorised access", { fn: "renewBook", ip: await getClientIp() });
      return { success: false, message: "Unauthoried  access" };
    }

    const rental_id = Number(formData.get("rental_id"));

    if(!rental_id){
      logger.warning("incomplete input", { fn: "renewBook", user_id: sessionData.userId });
      return { success: false, message: "Incomplete input" };
    }

    const db = getDb();
    const rental = db.prepare(`SELECT * FROM rentals WHERE rental_id = ? AND user_id = ?`)
    .get(rental_id, sessionData.userId) as Rental;
    
    // verify rental status
    if(!rental){
      logger.warning("invalid rental_id", { fn: "renewBook", user_id: sessionData.userId, rental_id });
      return { success: false, message: "Invalid rental_id" };
    }else if(rental.renew >= (Number(process.env.RENEWAL_LIMIT) || 5)){
      logger.warning("renew limit reached", { fn: "renewBook", user_id: sessionData.userId, rental_id });
      return { success: false, message: "Renew limit reached" };
    }else if(rental.due_date < sqliteNow()){
      logger.warning("rental overdue", { fn: "renewBook", user_id: sessionData.userId, rental_id });
      return { success: false, message: "Rental overdue" };
    }else if(rental.return_date){
      logger.warning("rental already ended", { fn: "renewBook", user_id: sessionData.userId, rental_id });
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
    logger.info("Book renewed", {fn: "renewBook", rental_id, user_id: sessionData.userId});
    revalidatePath("/user/rentalRecords");
    return { success: true, message: "Book renewed" };
  }catch(err){
    logger.error("renewBook failed", {
      fn: "renewBook",
      rental_id: Number(formData.get("rental_id"))
    }, err);
    return { success: false, message: `Book renew failed.\nerr: ${err}` };
  }
}