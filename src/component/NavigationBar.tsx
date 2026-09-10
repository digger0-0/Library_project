'use client'

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SessionData } from "@/lib/types";
import { logout, verifySession } from "@/lib/auth";
import { useToast } from "./Toast";

export function NavigationBar(){
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isLogout, setIsLogout] = useState<Boolean>(false);
  const [ scrollY, setScrollY ] = useState<number>(0);
  const toast = useToast();
  const pathname = usePathname();

  const handleLogout = () => {
    logout().then((res) => {
      if(res.success){
        setSessionData(null);
        setIsLogout(false);
      }else{
        toast(res.message, true);
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
    <div style={{padding: "0px 0px 3px 0px", position: "sticky", top: 0}}>
      <div style={{display: "flex", justifyContent: "space-between", background: "white", zIndex: 50, padding: "3px 6px", 
              boxShadow: "0 1px 8px rgba(0,0,0,0.15)"}}>
        <div>
          {/* Public Pages */}
          <Link className="btn" href={"/"}>Home</Link>
          <Link className="btn" href={"/announcement"}>Announcement</Link>
          <Link className="btn" href={"/bookSearch"}>Book Search</Link>
          <Link className="btn" href={"/rentalRanking"}>Leaderboard</Link>
          {
            /* logged in */
            sessionData && <>
              <br/>
              <Link className="btn" href={"/user/rentalRecords"}>Rental Records</Link>
              <Link className="btn" href={"/user/ebook"}>Ebook</Link>
            </>
          }
          {
            /* Admin */
            sessionData?.role == "admin" && <>
              <Link className="btn" href={"/admin/booksManagement"}>Book Management</Link>
              <Link className="btn" href={"/admin/rentalList"}>Rental List</Link>
              <Link className="btn" href={"/admin/userList"}>User List</Link>
            </>
          }
        </div>
        {/* Login / logout corner */}
        <div style={{display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px"}}>
          { sessionData ? (
            <>
              <div>{sessionData.username}</div>
              <div style={{display: "flex", gap: "6px"}}>
                {
                  isLogout ? (
                    <>
                      <button className="btn" onClick={handleLogout}>Confirm</button>
                      <button className="btn" onClick={() => {setIsLogout(false)}}>Cancel</button>
                    </>
                  ): (
                    <button
                      className="btn"
                      onClick={() => {setIsLogout(true)}}
                    >
                      Logout
                    </button>
                  )
                }
              </div>
            </>
          ) : (
            <>
              <Link className="btn" href={"/login"}>Login</Link>
              <Link className="btn" href={"/signup"}>Signup</Link>
            </>
          )}
        </div>
      </div>
      <div style={{pointerEvents: "none", backgroundColor: "transparent", justifyContent: "right", alignItems: "flex-end", display: "flex"}}>
        { scrollY > 200 && (
          <button
            style={{pointerEvents: "auto"}}
            className="btn"
            onClick={() => {window.scrollTo(0, 0)}}
          >
            Top
          </button>
        )}
      </div>
    </div>
  );
}