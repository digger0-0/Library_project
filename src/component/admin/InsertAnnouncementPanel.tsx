'use client'

import { insertAnnouncement } from "@/lib/action";
import { useActionState, useEffect } from "react";
import { useToast } from "../Toast";

export function InsertAnnouncementPanel(){
  const [ state, formAction, isPending ] = useActionState(insertAnnouncement, undefined);
  const toast = useToast();

  useEffect(() => {
    if (state) toast(state.message, !state.success);
  }, [state]);

  return (
    <div
      style={{
        border: "1px solid",
        borderRadius: "1.5px",
        margin: "8px 4px",
        padding: "2px 6px",
        width: "30%",
      }}
    >
      <h3>Insert Announcement</h3>
      <form action={formAction}>
        <label>Title</label><br/>
        <input type="text" name="title" required/><br/>
        <label>Content</label><br/>
        <textarea name="content" required/><br/>
        <input type="submit" value={"Insert"}/>
      </form>
    </div>
  );
}