// tables

export interface User {
  user_id: number;
  username: string;
  password: string;
  role: Role;
  session: string | null;
}

export interface Book {
  isbn: string;
  book_number: string;
  title: string;
  author: string;
  publisher: string;
  classification: string;
  deleted_at: string | null;    // soft delete: NULL = active
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

export interface Ebook {
  ebook_id: number;
  isbn: string | null;
  title: string;
  author: string;
  publisher: string;
  classification: string;
  copies: number;      // total number of identical digital copies
  filename: string;    // .txt file name in the ebooks/ folder
  deleted_at: string | null;    // soft delete: NULL = active
}
export const EbookFields: (keyof Ebook)[] = ["ebook_id", "isbn", "title", "author", "publisher", "classification", "copies", "filename"];

export interface EbookRental {
  ebook_rental_id: number;
  ebook_id: number;
  user_id: number;
  rental_date: string;
  due_date: string;
  return_date: string | null;
  renew: number;
}

// view

// `book_details` excludes soft-deleted rows, so the view shape has no `deleted_at`
export interface BookDetails extends Omit<Book, "deleted_at"> {
  full_classification: string | null;
  class_icon: string | null;
  // Rental status (null = on shelf)
  rental_id: number | null;
  user_id: number | null;
  username: string | null;
  rental_date: string | null;
  due_date: string | null;
  return_date: string | null;
  status: "on shelf" | "rent" | "overdue";
  days_overdue: number | null;
  renew: number | null;
}

export interface EbookDetails extends Omit<Ebook, "filename" | "deleted_at"> {
  full_classification: string | null;
  class_icon: string | null;
  available: number;   // available copies (copies - active loans)
  // Current loan status (null = not loaned)
  ebook_rental_id: number | null;
  user_id: number | null;
  username: string | null;
  rental_date: string | null;
  due_date: string | null;
  return_date: string | null;
  status: "on shelf" | "rent" | "overdue";
  days_overdue: number | null;
  renew: number | null;
}

// insert types

export type NewUser = Omit<User, "session" | "user_id">;
export type NewBook = Omit<Book, "book_number" | "deleted_at">;
export type NewEbook = Omit<Ebook, "ebook_id" | "deleted_at">;
export const NewEbookFields: (keyof NewEbook)[] = ["isbn", "title", "author", "publisher", "classification", "copies", "filename"];
export type NewClassification = Omit<Classification, never>;
export type NewRental = Omit<Rental, "rental_id" | "return_date" | "renew">;
export type NewAnnouncement = Omit<Announcement, "ann_id" | "ann_date">;

// sesion

export interface SessionData {
  userId: number;
  username?: string;
  role: Role;
  createdAt: number;
}

// Rental_details (extracted records)

export type RentalRecord = BookDetails;
export const rentalRecordFields: (keyof RentalRecord)[] = ["isbn", "book_number", "title", "author", "publisher", "classification", "full_classification", "class_icon", "user_id", "username", "rental_id", "rental_date", "due_date", "return_date", "status", "days_overdue", "renew"];
export interface RentalRecordUser extends Omit<BookDetails, "isbn" | "book_number" | "author" | "publisher" | "classification" | "full_classification" | "class_icon" | "user_id" | "username" | "status"> {
  status: "returned" | "rent" | "overdue";
}
export const RentalRecordUserFields: (keyof RentalRecordUser)[] = ["rental_id", "title", "status", "rental_date", "due_date", "return_date", "days_overdue", "renew"];

export type EbookRentalRecords = EbookDetails;
export const EbookRentalRecordFields: (keyof EbookRentalRecords)[] = ["ebook_id", "isbn", "title", "publisher", "classification", "full_classification", "class_icon", "user_id", "username", "ebook_rental_id", "rental_date", "due_date","return_date", "status", "days_overdue", "renew"];
export interface EbookRentalRecordsUser extends Omit<EbookRentalRecords, "ebook_id" | "isbn" | "author" | "publisher" | "copies" | "available" | "classification" | "full_classification" | "class_icon" | "user_id" | "username" | "status"> {
  status: "returned" | "rent" | "overdue";
}
export const EbookRentalRecordUserFields: (keyof EbookRentalRecordsUser)[] = ["ebook_rental_id", "title", "status", "rental_date", "due_date", "return_date", "days_overdue", "renew"];

export type BookSearchDetail = Omit<RentalRecord, "rental_id" | "rental_date" | "return_date" | "renew" | "days_overdue" | "classification" | "user_id" | "username" | "due_date"> & {bookType: "Book" | "Ebook", ebook_id: number | null, rented: boolean | null};
export const BookSearchDetailFields: (keyof BookSearchDetail)[] = ["isbn", "book_number", "title", "author", "publisher", "full_classification", "class_icon", "status", "bookType", "ebook_id", "rented"];

export interface UserRecord extends User {
  overdue_count: number;
}
export const userRecordFields: (keyof UserRecord)[] = ["user_id", "username", "role", "overdue_count"];

export type Role = "admin" | "user";
export const Roles: string[] = ["admin", "user"];

export type RentalRanking = {username: string, rentalCount: number};
export interface RentalRankings {
  monthly: RentalRanking[];
  yearly: RentalRanking[];
};
export const RentalRankingFields: (keyof RentalRankings)[] = ["monthly", "yearly"];

export type BookRankingInfo = { title: string; author: string; count: number };
export interface BookRankings {
  history: BookRankingInfo[];
  yearly: BookRankingInfo[];
  monthly: BookRankingInfo[];
};
export const BookRankingsInfoFields: (keyof BookRankingInfo)[] = ["title", "author", "count"];export const BookRankingTypes: (keyof BookRankings)[] = ["history", "monthly", "yearly"];

export const Classifications: string[] = [
  // English (Dewey Decimal)
  "eng-F",
  "eng-000",
  "eng-010",
  "eng-020",
  "eng-030",
  "eng-040",
  "eng-050",
  "eng-060",
  "eng-070",
  "eng-080",
  "eng-090",
  "eng-100",
  "eng-110",
  "eng-120",
  "eng-130",
  "eng-140",
  "eng-150",
  "eng-160",
  "eng-170",
  "eng-180",
  "eng-190",
  "eng-200",
  "eng-210",
  "eng-220",
  "eng-230",
  "eng-240",
  "eng-250",
  "eng-260",
  "eng-270",
  "eng-280",
  "eng-290",
  "eng-300",
  "eng-310",
  "eng-320",
  "eng-330",
  "eng-340",
  "eng-350",
  "eng-360",
  "eng-370",
  "eng-380",
  "eng-390",
  "eng-400",
  "eng-410",
  "eng-420",
  "eng-430",
  "eng-440",
  "eng-450",
  "eng-460",
  "eng-470",
  "eng-480",
  "eng-490",
  "eng-500",
  "eng-510",
  "eng-520",
  "eng-530",
  "eng-540",
  "eng-550",
  "eng-560",
  "eng-570",
  "eng-580",
  "eng-590",
  "eng-600",
  "eng-610",
  "eng-620",
  "eng-630",
  "eng-640",
  "eng-650",
  "eng-660",
  "eng-670",
  "eng-680",
  "eng-690",
  "eng-700",
  "eng-710",
  "eng-720",
  "eng-730",
  "eng-740",
  "eng-750",
  "eng-760",
  "eng-770",
  "eng-780",
  "eng-790",
  "eng-800",
  "eng-810",
  "eng-820",
  "eng-830",
  "eng-840",
  "eng-850",
  "eng-860",
  "eng-870",
  "eng-880",
  "eng-890",
  "eng-900",
  "eng-910",
  "eng-920",
  "eng-930",
  "eng-940",
  "eng-950",
  "eng-951",
  "eng-960",
  "eng-970",
  "eng-980",
  "eng-990",

  // Chinese (Liu Guojun System)
  "chi-000",
  "chi-010",
  "chi-020",
  "chi-030",
  "chi-040",
  "chi-050",
  "chi-060",
  "chi-070",
  "chi-080",
  "chi-090",
  "chi-100",
  "chi-110",
  "chi-120",
  "chi-130",
  "chi-140",
  "chi-150",
  "chi-160",
  "chi-170",
  "chi-180",
  "chi-190",
  "chi-200",
  "chi-210",
  "chi-220",
  "chi-230",
  "chi-240",
  "chi-250",
  "chi-270",
  "chi-280",
  "chi-290",
  "chi-300",
  "chi-310",
  "chi-320",
  "chi-330",
  "chi-340",
  "chi-350",
  "chi-360",
  "chi-370",
  "chi-380",
  "chi-390",
  "chi-400",
  "chi-410",
  "chi-420",
  "chi-430",
  "chi-440",
  "chi-460",
  "chi-470",
  "chi-480",
  "chi-490",
  "chi-500",
  "chi-510",
  "chi-520",
  "chi-530",
  "chi-540",
  "chi-550",
  "chi-560",
  "chi-570",
  "chi-580",
  "chi-590",
  "chi-600",
  "chi-610",
  "chi-620",
  "chi-629.38",
  "chi-630",
  "chi-640",
  "chi-650",
  "chi-660",
  "chi-670",
  "chi-673.8",
  "chi-680",
  "chi-690",
  "chi-693.8",
  "chi-700",
  "chi-710",
  "chi-720",
  "chi-730",
  "chi-740",
  "chi-750",
  "chi-760",
  "chi-770",
  "chi-780",
  "chi-790",
  "chi-800",
  "chi-810",
  "chi-820",
  "chi-830",
  "chi-840",
  "chi-850",
  "chi-857",
  "chi-860",
  "chi-870",
  "chi-880",
  "chi-889",
  "chi-890",
  "chi-900",
  "chi-910",
  "chi-920",
  "chi-930",
  "chi-940",
  "chi-950",
  "chi-990",
];

export const LogPriority = new Map<string, number>([
  ["debug", 10],
  ["info", 20],
  ["warning", 30],
  ["error", 40],
  ["fatal", 50],
]);
export const LogLevels: string[] = ["debug", "info", "warning", "error", "fatal"];
export interface Log {
  ts: string;
  level: (typeof LogLevels[number]);
  msg: string;
  meta?: unknown;
  err?: unknown
}

export interface EbookViewerInfo extends Omit<Ebook, "copies" | "filename" | "deleted_at"> {
  rental_date: string;
  due_date: string;
  status: "returned" | "overdue" | "rent";
}
export const EbookViewerInfoFields: (keyof EbookViewerInfo)[] = ["ebook_id","isbn", "title", "author", "classification", "publisher", "status", "rental_date", "due_date"];

export type FormSate = {
  success: boolean;
  message: string;
}