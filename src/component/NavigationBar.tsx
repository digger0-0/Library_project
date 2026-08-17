'use client'

import Link from "next/link";
import { ReturnButton } from "./ReturnButton";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SessionData } from "@/lib/types";
import { logout, verifySession } from "@/lib/auth";

export function NavigationBar(){
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isLogout, setIsLogout] = useState<Boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [ scrollY, setScrollY ] = useState<number>(0);
  const pathname = usePathname();

  const handleLogout = () => {
    logout().then((res) => {
      if(res.success){
        setSessionData(null);
        setIsLogout(false);
      }else{
        setMessage(res.message);
      }
    });
  };

  useEffect(() => {
    setLoading(true);
    verifySession().then((res) => {
      setSessionData(res);
      setLoading(false);
    });

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    }
  }, [pathname]);

  return (
    <div className="sticky top-0 z-50 bg-white">
      {/* Login / logout corner */}
      <div className="right-0">
        { sessionData ? (
          <>
            <div>{sessionData.username}</div>
            <div>
              <button
                onClick={() => {setIsLogout(true)}}
              >
                Logout
              </button>
              {
                isLogout && 
                <div>
                  <button onClick={handleLogout}>Confirm</button>
                  <button onClick={() => {setIsLogout(false)}}>Cancel</button>
                </div>
              }
            </div>
          </>
        ) : (
          !["/login", "/signup"].includes(pathname) ? (
          <>
            <Link href={"/login"}>Login</Link>
            <Link href={"/signup"}>Signup</Link>
          </>
          ) : (
            null
          )
        )}
      </div>
      <div>
        {/* Public Pages */}
        <Link href={"/"}>Home</Link>
        <Link href={"/announcement"}>Announcement</Link>
        <Link href={"/bookSearch"}>Book Search</Link>
        <Link href={"/rentalRanking"}>Leaderboard</Link>
        {
          /* logged in */
          sessionData && <>
            <Link href={"/user/rentalRecords"}>Rental Records</Link>
            <Link href={"/user/ebook"}>Ebook</Link>
          </>
        }
        {
          /* Admin */
          sessionData?.role == "admin" && <>
            <Link href={"/admin/booksManagement"}>Book Management</Link>
            <Link href={"/admin/rentalList"}>Rental List</Link>
            <Link href={"/admin/userList"}>User List</Link>
          </>
        }
        {
          message.length > 0 && <div>{message}</div>
        }
      </div>
      <div>
        { scrollY > 200 && (
          <button
            onClick={() => {window.scrollTo(0, 0)}}
          >
            Top
          </button>
        )}
      </div>
    </div>
  );
}