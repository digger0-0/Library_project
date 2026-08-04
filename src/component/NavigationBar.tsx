import { verifySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { headers } from "next/headers";
import Link from "next/link";

export async function NavigationBar(){
  const sessionData = await verifySession();
  let username = null;
  if (sessionData) {
    username = (getDb().prepare("SELECT username FROM users WHERE user_id = ?")
      .get(sessionData.userId) as { username: string }).username;
  }
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  return (
    <div>
      {
        /* Login corner */
        sessionData ? (
          <div>{username}</div>
        ) : (
          !["/login", "/signup"].includes(pathname) ? (
          <>
            <Link href={"/login"}>Login</Link>
            <Link href={"/signup"}>Signup</Link>
          </>
          ) : (
            null
          )
        )
      }
      {/* Public Pages */}
      <Link href={"/"}>Home</Link>
      <Link href={"/announcement"}>Announcement</Link>
      <Link href={"/bookSearch"}>Book Search</Link>
      <Link href={"/rentalRanking"}>Leaderboard</Link>
      {
        /* logged in */
        sessionData && 
        <Link href={"/user/rentalRecords"}>Rental Records</Link>
      }
      {
        /* Admin */
        sessionData?.role == "admin" && <>
          <Link href={"/admin/booksManagement"}>Book Management</Link>
          <Link href={"/admin/rentalList"}>Rental List</Link>
          <Link href={"/admin/userList"}>User List</Link>
        </>
      }
    </div>
  );
}