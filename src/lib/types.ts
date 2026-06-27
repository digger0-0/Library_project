// tables

export interface User {
  user_id: number;
  username: string;
  password: string;
  role: "user" | "admin";
  session: string | null;
}

export interface Book {
  isbn: string;
  book_number: string;
  title: string;
  author: string;
  publisher: string;
  classification: string;
}

export interface Classification {
  classification: string;
  description: string;
  class_icon: string;
}

export interface IsbnPrefix {
  code: string;
  country: string;
}

export interface Rental {
  rental_id: number;
  isbn: string;
  book_number: string;
  user_id: number;
  rental_date: string;
  due_date: string;
  return_date: string | null;
  renew: number;
}

export interface Announcement {
  ann_id: number;
  ann_date: string;
  title: string;
  content: string;
}

// view

export interface BookDetails extends Book {
  classification_desc: string | null;
  class_icon: string | null;
  // Rental status (null = on shelf)
  rental_id: number | null;
  uid: string | null;
  username: string | null;
  rent_date: string | null;
  due_date: string | null;
  return_date: string | null;
  status: "on shelf" | "rent" | "overdue";
  days_overdue: number | null;
}

// insert types

export type NewUser = Omit<User, "session" | "user_id">;
export type NewBook = Omit<Book, never>;
export type NewClassification = Omit<Classification, never>;
export type NewRental = Omit<Rental, "rental_id" | "return_date" | "renew">;
export type NewAnnouncement = Omit<Announcement, "ann_id" | "ann_date">;

// sesion

export interface SessionData {
  userId: number;
  role: "user" | "admin";
  createdAt: number;
}
