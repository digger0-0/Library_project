'use server'

import { revalidatePath } from "next/cache";
import { verifySession } from "./auth";
import { FormSate } from "./types";
import { getDb } from "./db";
import { BookDetails, Classifications, EbookRental, MAX_COMMENT_LENGTH, NewEbook, NewEbookFields, Rental, User } from "./types";
import { logger } from "./logger";
import { getClientIp } from "./request";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { existsSync, unlinkSync } from "node:fs";

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
      return { success: false, message: "Unauthorised access" };
    }

    const isbn = formData.get("isbn")?.toString().trim();
    const title = formData.get("title")?.toString().trim();
    const author = formData.get("author")?.toString().trim();
    const publisher = formData.get("publisher")?.toString().trim();
    const classification = formData.get("classification")?.toString().trim();

    if(!isbn || !title || !author || !publisher || !classification){
      logger.warning("Incomplete input", { fn: "insertBook", user_id: sessionData.userId });
      return { success: false, message: "Incomplete input" };
    }
    if(!Classifications.includes(classification)){
      logger.warning(`Invalid classification: ${classification}`, { fn: "insertBook", user_id: sessionData.userId });
      return { success: false, message: `Invalid classification: ${classification}`};
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

    // verify operator identity
    if(!sessionData || sessionData.role != "admin"){
      logger.warning("unauthorised access", { fn: "rentBook", user_id: sessionData?.userId, ip: await getClientIp() });
      return { success: false, message: "Unauthorised access" };
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
    // verify rent user status
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
      return { success: false, message: "Unauthorised access" };
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

export async function renewBook(rental_id: number): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);

    if(!sessionData){
      logger.warning("unauthorised access", { fn: "renewBook", ip: await getClientIp() });
      return { success: false, message: "Unauthorised access" };
    }

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
      rental_id
    }, err);
    return { success: false, message: `Book renew failed.` };
  }
}

export async function deleteBook(formState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);

    // verify operator identity
    if(!sessionData || sessionData.role != "admin"){
      logger.warning("unauthorised access", { fn: "deleteBook", ip: await getClientIp() });
      return { success: false, message: `Unauthorized access` };
    }

    const isbn = formData.get("isbn")?.toString().trim();
    const book_number = formData.get("book_number")?.toString().trim();

    if(!isbn || !book_number){
      logger.warning("incomplete input", { fn: "deleteBook", user_id: sessionData.userId});
      return { success: false, message: `Incomplete input` };
    }
    
    // verify valid input
    const db = getDb();
    const res = db.prepare(`
      SELECT b.isbn as placeHolder,
      (SELECT COUNT(*) FROM rentals WHERE isbn = b.isbn AND book_number = b.book_number AND return_date IS NULL) as rentCount
      FROM books b
      WHERE b.isbn = ? AND b.book_number = ? AND b.deleted_at IS NULL
    `).get(isbn, book_number) as { placeHolder: number, rentCount: number};

    if(!res.placeHolder){
      logger.warning("invalid input", {fn: "deleteBook", user_id: sessionData.userId});
      return { success: false, message: `Invalid input` };
    }

    if(res.rentCount > 0){
      logger.warning("Book in loan", {fn: "deleteBook", user_id: sessionData.userId, isbn, book_number});
      return { success: false, message: `Book in loan` };
    }

    // Operate
    db.prepare(`
      UPDATE books SET deleted_at = ? WHERE isbn = ? AND book_number = ?
    `).run(sqliteNow(), isbn, book_number);
    logger.info("Book deleted", {fn: "deleteBook", isbn, book_number, user_id: sessionData.userId, deleted_at: sqliteNow()});

    revalidatePath("/admin/booksManagement");
    revalidatePath("/bookSearch");
    revalidatePath("/admin/rentalList");
    return { success: true, message: `Book:(${isbn}|${book_number}) deleted.` };
  }catch(err){
    logger.error("deleteBook failed", {
      fn: "deleteBook",
      isbn: (formData.get("isbn")),
      book_number: (formData.get("book_number"))
    }, err);
    return { success: false, message: `Book delete failed.` };
  }
}

export async function insertEbook(ebook: NewEbook, content: string): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);
    if(!sessionData || sessionData.role != "admin"){
      logger.warning("unauthorized access", {fn: "insertEbook", ip: await getClientIp()});
      return { success: false, message: "unauthorized access" };
    }

    if(NewEbookFields.map((f) => ebook[f] == null).includes(true) || !content){
      logger.warning("incomplete input", {fn: "insertEbook", user_id: sessionData.userId});
      return { success: false, message: "incomplete input" };
    }

    // format filename
    const safeFilename = ebook.filename.replace(/[^a-zA-Z0-9_-]/g, '') || `ebook-${Date.now()}`;
    ebook.filename = safeFilename.endsWith(".txt")? safeFilename: safeFilename + ".txt";

    // update db
    const db = getDb();
    db.prepare(`
      INSERT INTO ebooks (isbn, title, author, publisher, classification, copies, filename)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(NewEbookFields.map((f) => ebook[f]));
    // save to file
    const ebookDir = path.join(process.cwd(), "/assets/ebooks");
    await writeFile(path.join(ebookDir, ebook.filename), content, 'utf-8');

    logger.info("new ebook added", {fn: "insert Ebook", title: ebook.title});
    return { success: true, message: `insert Ebook success` };
  }catch(err){
    logger.error("insertEbook Failed", {fn: "insertEbook", title: ebook.title, ip: await getClientIp()}, err);
    return { success: false, message: `insertEbook failed\n${err}` };
  }
}

export async function rentEbook(ebook_id: number){
  try{
    if(!ebook_id){
      logger.warning("incomplete input", { fn: "rentEbook", ip: await getClientIp() });
      return { success: false, message: "incomplete input" };
    }

    const sessionData = await verifySession(true);
    const user_id = sessionData?.userId;
    const rentalDays = Number(process.env.RENTAL_PERIOD) || 14;
    const rental_date = sqliteNow();
    const due_date = sqliteDueDate(rentalDays);
    
    // authebtication
    if(!sessionData){
      logger.warning("unauthorised access", { fn: "rentEbook", ip: await getClientIp() });
      return { success: false, message: "Unauthorised access" };
    }

    const db = getDb();
    const res = db.prepare(`SELECT available FROM ebook_details WHERE ebook_id = ?`).get(ebook_id) as { available: number } | undefined;
    if(!res){
      // validate ebook_id
      logger.warning("invalid ebook_id", {fn: "rentBook", user_id});
      return { success: false, message: "Invalid input" };
    }else if(res.available == 0){
      // validate if book is available
      logger.warning("no books available", {fn: "rentBook", user_id});
      return { success: false, message: "No books available" };
    }
    const rental = db.prepare(`SELECT * FROM ebook_rentals WHERE ebook_id = ? AND return_date IS NULL AND user_id = ?`).get(ebook_id, user_id) as EbookRental;
    if(rental){
      // user have rented the same book
      logger.warning("Book already rented", {fn: "rentBook", user_id});
      return { success: false, message: "Book already rented"}
    }

    // update db
    db.prepare(`
      INSERT INTO ebook_rentals (ebook_id, user_id, rental_date, due_date)
      VALUES (?, ?, ?, ?)`
    ).run(ebook_id, user_id, rental_date, due_date);

    logger.info("Ebook rented", {fn:"rentBook", user_id, ebook_id});
    revalidatePath("/bookSearch");
    return { success: true, message: "Ebook rented" };
  }catch(err){
    logger.error("rentEbook failed", {fn: "rentEbook", ebook_id}, err);
    return { success: false, message: "Internal error" };
  }
}

export async function returnEbook(ebook_rental_id: number){
  try{
    if(!ebook_rental_id){
      logger.warning("incomplete input", { fn: "returnEbook", ip: await getClientIp() });
      return { success: false, message: "incomplete input" };
    }

    const sessionData = await verifySession(true);
    const user_id = sessionData?.userId;
    const return_date = sqliteNow();
    
    // authentication
    if(!sessionData){
      logger.warning("unauthorised access", { fn: "rentEbook", ip: await getClientIp() });
      return { success: false, message: "Unauthorised access" };
    }

    // check rental status
    const db = getDb();
    const rental = db.prepare(`SELECT * FROM ebook_rentals WHERE ebook_rental_id = ? AND user_id = ?`)
      .get(ebook_rental_id, user_id) as EbookRental;
    if(!rental){
      logger.warning("invalid rental", {fn: "returnEbook", ip: await getClientIp()});
      return { success: false, message: "invalid rental"};
    }else if(rental.user_id != user_id){
      logger.warning("unauthorized rental", {fn: "returnEbook", ip: await getClientIp()});
      return { success: false, message: "unauthorized rental"};
    }else if(rental.return_date != null){
      logger.warning("rental over", {fn: "returnEbook", ip: await getClientIp()});
      return { success: false, message: "rental over"};
    }

    // update return date
    db.prepare(`UPDATE ebook_rentals SET return_date = ? WHERE ebook_rental_id = ?`).run(return_date, ebook_rental_id);
    // handle overdue (will return automatically if done)
    if(rental.due_date < sqliteNow()){
      logger.info("Ebook returned, overdue", {fn: "returnEbook", ebook_rental_id, due_date: rental.due_date});
      revalidatePath("/user/rentalRecords");
      return { success: true, message: "Ebook returned, rental overdue"}
    }

    logger.info("Ebook returned", {fn: "returnEbook", ebook_rental_id});
    revalidatePath("/user/rentalRecords");
    return { success: true, message: "Ebook returned" };
  }catch(err){
    logger.error("renewEbook failed", {fn: "rnewEbook", ebook_rental_id}, err);
    return { success: false, message: "Internal error" };
  }
}

export async function renewEbook(ebook_rental_id: number): Promise<FormSate>{
  try{
    if(!ebook_rental_id){
      logger.warning("incomplete input", { fn: "renewEbook", ip: await getClientIp() });
      return { success: false, message: "incomplete input" };
    }

    const sessionData = await verifySession(true);
    const userId = sessionData?.userId;

    if(!sessionData){
      logger.warning("unauthorised access", { fn: "renewEbook", ip: await getClientIp() });
      return { success: false, message: "Unauthorised access" };
    }

    const db = getDb();
    const rental = db.prepare(`SELECT * FROM ebook_rentals WHERE ebook_rental_id = ? AND user_id = ?`)
      .get(ebook_rental_id, userId) as EbookRental;
    
    // verify rental status
    if(!rental){
      logger.warning("invalid rental_id", { fn: "renewEbook", userId, ebook_rental_id });
      return { success: false, message: "Invalid rental_id" };
    }else if(rental.renew >= (Number(process.env.RENEWAL_LIMIT) || 5)){
      logger.warning("renew limit reached", { fn: "renewEbook", userId, ebook_rental_id });
      return { success: false, message: "Renew limit reached" };
    }else if(rental.due_date < sqliteNow()){
      logger.warning("rental overdue", { fn: "renewEbook", userId, ebook_rental_id });
      return { success: false, message: "Rental overdue" };
    }else if(rental.return_date){
      logger.warning("rental already ended", { fn: "renewEbook", userId, ebook_rental_id });
      return { success: false, message: "Rental ended" };
    }

    // update rental
    db.prepare(`UPDATE ebook_rentals SET due_date = ?, renew = ? WHERE ebook_rental_id = ?`)
    .run(
      sqliteDueDate(
        Number(process.env.RENEWAL_PERIOD),
      ),
      rental.renew + 1,
      ebook_rental_id
    );
    logger.info("Ebook renewed", {fn: "renewEbook", ebook_rental_id, userId});
    revalidatePath("/user/rentalRecords");
    return { success: true, message: "Ebook renewed" };
  }catch(err){
    logger.error("renewEbook failed", {
      fn: "renewEbook",
      ebook_rental_id
    }, err);
    return { success: false, message: `Ebook renew failed.` };
  }
}

export async function deleteEbook(formState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);

    // verify operator identity
    if(!sessionData || sessionData.role != "admin"){
      logger.warning("unauthorised access", { fn: "deleteEbook", ip: await getClientIp() });
      return { success: false, message: `Unauthorized access` };
    }

    const ebook_id = formData.get("ebook_id")?.toString().trim();
    const doRemoveFile = formData.get("doRemoveFile") === "true";

    if(!ebook_id){
      logger.warning("incomplete input", { fn: "deleteEbook", user_id: sessionData.userId});
      return { success: false, message: `Incomplete input` };
    }
    
    // verify valid input
    const db = getDb();
    const res = db.prepare(`
      SELECT
        filename,
        (SELECT COUNT(*) FROM ebook_rentals WHERE ebook_id = ? AND return_date IS NULL) as rentCount
      FROM ebooks WHERE ebook_id = ? AND deleted_at IS NULL
    `).get(ebook_id, ebook_id) as { filename: string, rentCount: number } | undefined;

    if(!res?.filename){
      logger.warning("invalid input", {fn: "deleteEbook", user_id: sessionData.userId});
      return { success: false, message: `Invalid input` };
    }

    // check no one in borrow
    if(res.rentCount > 0){
      logger.warning("Ebook still on loan", {fn: "deleteEbook", user_id: sessionData.userId, ebook_id});
      return { success: false, message: `Ebook still on loan` };
    }

    // Operate
    db.prepare(`
      UPDATE ebooks SET deleted_at = ? WHERE ebook_id = ?
    `).run(sqliteNow(), ebook_id);
    logger.info("Ebook deleted", {fn: "deleteEbook", ebook_id, user_id: sessionData.userId, deleted_at: sqliteNow()});

    // remove file (best-effort: a missing file must not make the delete look failed)
    if(doRemoveFile && res.filename){
      const filename = res.filename;
      const ebookDir = path.join(process.cwd(), "assets", "ebooks");
      const filePath = path.join(ebookDir, filename);
      // defence in depth: never escape the ebooks directory
      if(path.dirname(filePath) !== ebookDir){
        logger.warning("refused unsafe filename", {fn: "deleteEbook", ebook_id, filename});
      }else if(existsSync(filePath)){
        unlinkSync(filePath);
        logger.info("Ebook file removed", {fn: "deleteEbook", ebook_id, filename});
      }else{
        logger.warning("Ebook file not found", {fn: "deleteEbook", ebook_id, filename});
      }
    }

    logger.info("Ebook deleted", {fn: "deleteEbook", ebook_id, doRemoveFile});
    revalidatePath("/admin/booksManagement");
    revalidatePath("/bookSearch");
    revalidatePath("/user/rentalRecords");
    return { success: true, message: `Ebook:(${ebook_id}) deleted. Remove file: ${doRemoveFile}` };
  }catch(err){
    logger.error("deleteEbook failed", {
      fn: "deleteEbook",
      ebook_id: (formData.get("ebook_id")),
    }, err);
    return { success: false, message: `Ebook delete failed.` };
  }
}

export async function updateLike(is_ebook: boolean, isbn?: string, ebook_id?: number): Promise<FormSate>{
  try{
    const _isbn = (is_ebook? null: isbn) ?? null;
    const _ebook_id = (!is_ebook || ebook_id == null || !isFinite(ebook_id))? null: ebook_id;
    // verify identity
    const sessionData = await verifySession(true);
    if(!sessionData){
      logger.warning("unauthorised access", { fn: "updateLike", ip: await getClientIp() });
      return { success: false, message: `Unauthorized access` };
    }
    // verify input
    if(is_ebook? _ebook_id == null: !_isbn){
      logger.warning("Incomplete input", {fn: "updateLike", is_ebook, isbn, ebook_id});
      return { success: false, message: "Incomplete input" };
    }
    // verify isbn / ebook_id
    const db = getDb();
    const res = db.prepare(is_ebook?
      `SELECT 1 FROM ebooks WHERE ebook_id = ?`:
      `SELECT 1 FROM books WHERE isbn = ?;`
    ).get(is_ebook? _ebook_id: _isbn);
    if(!res){
      logger.warning("Invalid input", {fn: "updateLike", is_ebook, isbn, ebook_id, user_id: sessionData.userId});
      return { success: false, message: "Invalid input" };
    }
    const is_liked = db.prepare(`
      SELECT like_id FROM likes WHERE user_id = ? AND is_ebook = ? AND ${is_ebook ? "ebook_id = ?" : "isbn = ?"};
    `).get(sessionData.userId, Number(is_ebook), (is_ebook? _ebook_id: _isbn)) as { like_id: number } | undefined;

    if(is_liked){
      db.prepare(`DELETE FROM likes WHERE like_id = ?`).run(is_liked.like_id);
      logger.info("Book unliked", {fn: "updateLike", is_ebook, isbn, ebook_id, user_id: sessionData.userId});
      return { success: true, message: "Book unliked" };
    }else{
      db.prepare(`INSERT INTO likes (isbn, ebook_id, is_ebook, user_id, created_at) VALUES (?, ?, ?, ?, ?)`)
        .run(_isbn, _ebook_id, Number(is_ebook), sessionData.userId, sqliteNow());
      logger.info("Book liked", {fn: "updateLike", is_ebook, isbn, ebook_id, user_id: sessionData.userId});
      return { success: true, message: "Book liked" };
    }
  }catch(err){
    // The UNIQUE indexes on likes (ux_likes_book / ux_likes_ebook) make a second
    // like from the same user impossible. Two requests racing past the SELECT
    // above will land here — the like exists, so report it as already done
    // rather than as a failure.
    if((err as { code?: string })?.code === "SQLITE_CONSTRAINT_UNIQUE"){
      logger.info("Book already liked", {fn: "updateLike", is_ebook, isbn, ebook_id});
      return { success: true, message: "Book already liked" };
    }
    logger.error("updateLike failed", {
      fn: "updateLike",
      is_ebook, isbn, ebook_id,
    }, err);
    return { success: false, message: `Update like failed.` };
  }
}

export async function insertBookComment(formState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);
    if(!sessionData){
      logger.warning("unauthorised access", { fn: "insertBookComment", ip: await getClientIp() });
      return { success: false, message: `Unauthorized access` };
    }

    const content = (formData.get("content") as string).trim();
    const is_ebook = (formData.get("is_ebook") as string) == "true";
    const isbn = formData.get("isbn") as string;
    const ebook_id = Number(formData.get("ebook_id") as string);
    if(!content || (!is_ebook && !isbn) || (is_ebook && !isFinite(ebook_id))){
      logger.warning("Incomplete input", {fn: "insertBookComment", });
      return { success: false, message: "Incomplete input" };
    }
    // Also enforced by ck_comments_content. Checked here so the user gets a
    // usable message instead of the generic insert failure below.
    if(content.length > MAX_COMMENT_LENGTH){
      logger.warning("Comment too long", {fn: "insertBookComment", length: content.length, user_id: sessionData.userId});
      return { success: false, message: `Comment must be at most ${MAX_COMMENT_LENGTH} characters` };
    }

    const db = getDb();
    // verify isbn / ebook_id
    const res = db.prepare(is_ebook?
      `SELECT 1 FROM ebooks WHERE ebook_id = ?`:
      `SELECT 1 FROM books WHERE isbn = ?;`
    ).get(is_ebook? ebook_id: isbn);
    if(!res){
      logger.warning("Invalid input", {fn: "insertBookComment", isbn, user_id: sessionData.userId});
      return { success: false, message: "Invalid input" };
    }
    // insert
    db.prepare(`INSERT INTO comments (isbn, ebook_id, is_ebook, user_id, created_at, content) VALUES (?, ?, ?, ?, ?, ?)`)
      .run((is_ebook? null: isbn), (is_ebook? ebook_id: null), Number(is_ebook), sessionData.userId, sqliteNow(), content);
    logger.info("New book commet inserted", {fn: "insertBookComment", isbn, user_id: sessionData.userId});
    return { success: true, message: "Book comment inserted" };
  }catch(err){
    logger.error("insert book comment failed", {
      fn: "insertBookComment",
      is_ebook: (formData.get("is_ebook") as string) == "true",
      isbn: formData.get("isbn"),
      ebook_id: formData.get("ebook_id")
    }, err);
    return { success: false, message: `insert book comment failed.` };
  }
}